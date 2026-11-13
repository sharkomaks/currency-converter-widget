// Одно окно у тулбара (Popup по CONTEXT.md): конвертер, настройки и онбординг
// — три вида одной поверхности. Курс спрашивается у фона на каждый пересчёт:
// фон отвечает из сессии, поэтому сети на каждую клавишу нет. Сцена онбординга
// собрана тем же Overlay, что и окно на чужой странице.

import type { RateError } from '../background/rate';
import { browserDefaults, targetAfterLanguageChange } from '../shared/browser-defaults';
import { DIAGNOSTICS_MESSAGE, type DiagSnapshot } from '../shared/diagnostics';
import { formatDiagnosticsReport } from '../shared/diagnostics-format';
import { describeError } from '../shared/errors';
import { currencyMark, formatAmount, formatMoney } from '../shared/format';
import { setLang, t } from '../shared/i18n';
import { convert } from '../shared/money';
import { readInputAmount } from '../shared/number';
import { Overlay } from '../shared/overlay';
import { createPicker, type PickerHandle } from '../shared/picker';
import { requestRate, RetryGate } from '../shared/rate-client';
import { chromeSessionArea, loadPair, savePair } from '../shared/session';
import { DEFAULTS, loadSettings, saveSettings } from '../shared/storage';
import type { Lang, OverlayTheme, Settings, Theme } from '../shared/storage';
import { resolveOverlayTheme } from '../shared/tone';
import { extensionApi } from '../shared/webext';

type View = 'converter' | 'settings' | 'onboarding' | 'diagnostics';

function $<T extends HTMLElement>(selector: string): T {
	const element = document.querySelector<T>(selector);
	if (!element) throw new Error(t('popup.missingElement', { selector }));
	return element;
}

function $$<T extends HTMLElement>(selector: string): NodeListOf<T> {
	return document.querySelectorAll<T>(selector);
}

const input = $<HTMLInputElement>('#amount');
const result = $('#result');
const note = $('#note');
const errorBlock = $('#error');
const errorTitle = $('#error-title');
const errorDetail = $('#error-detail');
const errorAction = $<HTMLButtonElement>('#error-action');
const diagnosticsStatus = $('#diagnostics-status');
const diagnosticsBody = $('#diagnostics-body');
const diagnosticsCopy = $<HTMLButtonElement>('#diagnostics-copy');
const fromSign = $('#from-sign');
const toSign = $('#to-sign');
const overlay = new Overlay();

let settings: Settings;
let view: View = 'converter';
let returnView: View = 'converter';
let targetTouched = false;
let onboardingStep: 1 | 2 = 1;
let from = 'USD';
let to = 'USD';
let gate = new RetryGate();
let seq = 0;
const INPUT_DEBOUNCE_MS = 250;
let inputTimer: number | null = null;
let ticker: number | null = null;
let sceneFrame = 0;
let targetPicker: PickerHandle | undefined;
let fromPicker: PickerHandle | undefined;
let toPicker: PickerHandle | undefined;

function setIconLabel(selector: string, key: string): void {
	const button = $<HTMLButtonElement>(selector);
	const label = t(key);
	button.setAttribute('aria-label', label);
	button.title = label;
}

function renderStatic(): void {
	for (const element of $$<HTMLElement>('[data-i18n]')) {
		element.textContent = t(element.dataset.i18n as string);
	}
	document.title = t('name');
	input.placeholder = t('popup.amountPlaceholder');
	result.dataset.placeholder = t('popup.amountPlaceholder');
	setIconLabel('#gear', 'popup.settings');
	setIconLabel('#back', 'onboarding.back');
	setIconLabel('#how', 'settings.howToUse');
	setIconLabel('#diagnostics-open', 'settings.diagnostics');
	for (const slider of $$<HTMLInputElement>('input[data-gap]')) {
		slider.setAttribute('aria-label', t('settings.gap'));
	}
}

function setTitle(): void {
	const key =
		view === 'converter'
			? 'popup.title'
			: view === 'settings'
				? 'settings.title'
				: view === 'diagnostics'
					? 'diagnostics.title'
					: 'onboarding.title';
	$('#title').textContent = t(key);
}

function updateSigns(): void {
	fromSign.textContent = currencyMark(from, settings.lang);
	toSign.textContent = currencyMark(to, settings.lang);
}

function syncSegments(kind: 'lang' | 'theme' | 'overlayTheme', value: string): void {
	for (const group of $$<HTMLElement>(`[data-seg="${kind}"]`)) {
		for (const button of group.querySelectorAll<HTMLButtonElement>('button')) {
			button.setAttribute('aria-pressed', String(button.dataset.value === value));
		}
	}
}

function syncGap(gap: number): void {
	for (const slider of $$<HTMLInputElement>('input[data-gap]')) {
		slider.value = String(gap);
	}
	$('#settings-gap-value').textContent = String(gap);
	$('#onboarding-gap-value').textContent = String(gap);
}

function rememberPair(): void {
	void savePair(chromeSessionArea(), { from, to });
}

function pristine(s: Settings): boolean {
	return (
		!s.onboarded &&
		s.lang === DEFAULTS.lang &&
		s.theme === DEFAULTS.theme &&
		s.overlayTheme === DEFAULTS.overlayTheme &&
		s.targetCurrency === DEFAULTS.targetCurrency &&
		s.gap === DEFAULTS.gap
	);
}

function applyChrome(next: Settings): void {
	const targetChanged = next.targetCurrency !== settings?.targetCurrency;
	settings = next;
	if (targetChanged) {
		to = settings.targetCurrency;
		rememberPair();
	}
	document.documentElement.lang = settings.lang;
	document.documentElement.dataset.theme = settings.theme;
	setLang(settings.lang);
	renderStatic();
	setTitle();
	targetPicker?.setTheme(settings.theme);
	fromPicker?.setTheme(settings.theme);
	toPicker?.setTheme(settings.theme);
	targetPicker?.setLang(settings.lang);
	fromPicker?.setLang(settings.lang);
	toPicker?.setLang(settings.lang);
	targetPicker?.setSelected(settings.targetCurrency);
	fromPicker?.setSelected(from);
	toPicker?.setSelected(to);
	syncSegments('lang', settings.lang);
	syncSegments('theme', settings.theme);
	syncSegments('overlayTheme', settings.overlayTheme);
	syncGap(settings.gap);
	updateSigns();
	$('#onboarding-notice').hidden = settings.onboarded;
	if (view === 'converter') recompute();
	if (view === 'onboarding' && onboardingStep === 2) scheduleScene();
}

function placeTargetPicker(next: View): void {
	if (!targetPicker) return;
	if (next === 'settings') $('#settings-target').append(targetPicker.button);
	else if (next === 'onboarding') $('#onboarding-target').append(targetPicker.button);
}

let diagnosticsReturn: View = 'settings';

function canGoBack(): boolean {
	if (view === 'converter') return false;
	if (view === 'settings') return true;
	if (view === 'diagnostics') return true;
	return onboardingStep === 2 || returnView !== 'converter' || settings.onboarded;
}

function showView(next: View): void {
	view = next;
	for (const section of $$<HTMLElement>('.view')) {
		section.hidden = section.id !== `view-${next}`;
	}
	$('#gear').hidden = next !== 'converter';
	$('#how').hidden = next !== 'settings';
	$('#diagnostics-open').hidden = next !== 'settings';
	$('#back').hidden = !canGoBack();
	if (next !== 'onboarding') overlay.hide();
	placeTargetPicker(next);
	setTitle();
	if (next === 'converter') recompute();
	if (next === 'onboarding') setOnboardingStep(onboardingStep);
	if (next === 'diagnostics') void renderDiagnostics();
}

type DiagnosticsReport =
	| { kind: 'running'; snapshot: DiagSnapshot; stale: boolean; selectionSeen: boolean }
	| { kind: 'missing'; detail: string };

let diagnosticsToken = 0;
let diagnosticsText = '';

async function diagnosticsReport(): Promise<DiagnosticsReport> {
	try {
		const tabs = await extensionApi().tabs.query({ active: true, currentWindow: true });
		const tabId = tabs[0]?.id;
		if (tabId === undefined) return { kind: 'missing', detail: t('diagnostics.noTab') };
		const answer: unknown = await extensionApi().tabs.sendMessage(tabId, { type: DIAGNOSTICS_MESSAGE });
		const snapshot = (answer as { snapshot?: DiagSnapshot } | null)?.snapshot;
		if (!snapshot || typeof snapshot !== 'object') return { kind: 'missing', detail: t('diagnostics.noSnapshot') };
		return {
			kind: 'running',
			snapshot,
			stale: snapshot.version !== extensionApi().runtime.getManifest().version,
			selectionSeen: snapshot.events.some(event => event.event === 'selection' && event.data?.result !== 'none')
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		// «Receiving end does not exist» — это ровно случай «скрипт не запущен»,
		// который уже назван статусом; английскую строку браузера не дублируем.
		const detail = /Receiving end does not exist|Could not establish connection/i.test(message)
			? ''
			: t('diagnostics.browserError', { message });
		return { kind: 'missing', detail };
	}
}

async function renderDiagnostics(): Promise<void> {
	const token = ++diagnosticsToken;
	diagnosticsStatus.dataset.kind = '';
	diagnosticsStatus.textContent = t('diagnostics.checking');
	diagnosticsBody.textContent = '';
	const report = await diagnosticsReport();
	if (token !== diagnosticsToken || view !== 'diagnostics') return;

	if (report.kind === 'missing') {
		diagnosticsStatus.dataset.kind = 'bad';
		diagnosticsStatus.textContent = t('diagnostics.notRunning');
		diagnosticsText = `${t('diagnostics.notRunning')}\n${t('diagnostics.reasons')}${report.detail ? `\n\n${report.detail}` : ''}`;
		diagnosticsBody.textContent = diagnosticsText;
		return;
	}

	if (report.stale) {
		diagnosticsStatus.dataset.kind = 'warn';
		diagnosticsStatus.textContent = t('diagnostics.stale');
	} else if (!report.selectionSeen) {
		diagnosticsStatus.dataset.kind = 'warn';
		diagnosticsStatus.textContent = t('diagnostics.noSelection');
	} else {
		diagnosticsStatus.textContent = t('diagnostics.running');
	}
	diagnosticsText = formatDiagnosticsReport(report.snapshot, settings.lang);
	diagnosticsBody.textContent = diagnosticsText;
	diagnosticsBody.scrollTop = diagnosticsBody.scrollHeight;
}

async function copyDiagnostics(): Promise<void> {
	if (!diagnosticsText) return;
	const label = diagnosticsCopy.textContent ?? t('diagnostics.copy');
	try {
		await navigator.clipboard.writeText(diagnosticsText);
		diagnosticsCopy.textContent = t('diagnostics.copied');
	} catch {
		diagnosticsCopy.textContent = t('diagnostics.copyFailed');
	}
	window.setTimeout(() => {
		diagnosticsCopy.textContent = label;
	}, 1500);
}

function setOnboardingStep(next: 1 | 2): void {
	onboardingStep = next;
	$('#onboarding-step-1').hidden = next !== 1;
	$('#onboarding-step-2').hidden = next !== 2;
	$('#onboarding-step-label').textContent = t('onboarding.step', { n: String(next) });
	$('#onboarding-back-1').hidden = returnView === 'converter' && !settings.onboarded;
	$('#back').hidden = !canGoBack();
	if (next === 2) scheduleScene();
	else overlay.hide();
}

function showOnboarding(fromView: View): void {
	returnView = fromView;
	onboardingStep = 1;
	showView('onboarding');
}

function renderScene(): void {
	if (view !== 'onboarding' || onboardingStep !== 2) return;
	overlay.setTheme(resolveOverlayTheme(settings.overlayTheme, settings.theme, settings.theme));
	overlay.update({
		phase: 'result',
		text: formatMoney('16.1', 'USD', settings.lang)
	});
	overlay.place($('#scene-amount').getBoundingClientRect(), settings.gap, 'above');
}

function scheduleScene(): void {
	if (view !== 'onboarding' || onboardingStep !== 2) return;
	cancelAnimationFrame(sceneFrame);
	sceneFrame = requestAnimationFrame(renderScene);
}

async function persist(patch: Partial<Settings>): Promise<void> {
	try {
		applyChrome(await saveSettings(patch));
	} catch {
		// Настройка не сохранилась — форма остаётся на прежних значениях.
	}
}

function clearTicker(): void {
	window.clearInterval(ticker ?? undefined);
	ticker = null;
}

function hideError(): void {
	clearTicker();
	errorBlock.hidden = true;
}

function startTicker(): void {
	clearTicker();
	const tick = (): void => {
		const seconds = gate.secondsLeft(Date.now());
		if (seconds === 0) {
			errorAction.textContent = t('action.retry');
			errorAction.disabled = false;
			clearTicker();
		} else {
			errorAction.textContent = t('action.retryIn', { seconds: String(seconds) });
			errorAction.disabled = true;
		}
	};
	tick();
	ticker = window.setInterval(tick, 250);
}

function setResult(text: string): void {
	result.textContent = text;
	result.dataset.empty = String(text.length === 0);
	result.dataset.busy = 'false';
}

function showNote(key: string, kind: 'quiet' | 'bad'): void {
	note.textContent = t(key);
	note.dataset.kind = kind;
}

function clearNote(): void {
	note.textContent = '';
	note.dataset.kind = '';
}

function showError(error: RateError, pairFrom: string, pairTo: string): void {
	const viewModel = describeError(error, pairFrom, pairTo);
	setResult('');
	errorTitle.textContent = viewModel.title;
	errorDetail.textContent = viewModel.detail;
	errorBlock.hidden = false;
	if (viewModel.action === 'retry') {
		gate.fail(Date.now());
		errorAction.disabled = true;
		startTicker();
	} else {
		clearTicker();
		errorAction.disabled = false;
		errorAction.textContent = t('action.otherCurrency');
	}
}

async function ask(amount: string, fresh: boolean): Promise<void> {
	const id = ++seq;
	const pairFrom = from;
	const pairTo = to;
	const answer = await requestRate(pairFrom, pairTo, { fresh });
	if (id !== seq || pairFrom !== from || pairTo !== to) return;

	if ('error' in answer) {
		showError(answer.error, pairFrom, pairTo);
		return;
	}
	gate.succeed();
	hideError();
	setResult(formatAmount(convert(amount, answer.rate, pairTo), pairTo, settings.lang));
}

function retryNow(): void {
	if (!gate.begin(Date.now())) return;
	hideError();
	const reading = readInputAmount(input.value);
	if (!('amount' in reading) || from === to) {
		recompute();
		return;
	}
	result.dataset.busy = 'true';
	void ask(reading.amount, true);
}

function recompute(): void {
	window.clearTimeout(inputTimer ?? undefined);
	inputTimer = null;
	seq += 1;
	const reading = readInputAmount(input.value);

	if ('reason' in reading) {
		hideError();
		setResult('');
		if (reading.reason === 'empty') showNote('input.empty', 'quiet');
		else showNote(`input.${reading.reason}`, 'bad');
		return;
	}

	clearNote();
	if (from === to) {
		hideError();
		setResult(formatAmount(reading.amount, to, settings.lang));
		return;
	}

	if (gate.secondsLeft(Date.now()) > 0) return;
	result.dataset.busy = 'true';
	void ask(reading.amount, false);
}

function resetPair(): void {
	seq += 1;
	gate = new RetryGate();
	hideError();
	window.clearTimeout(inputTimer ?? undefined);
	inputTimer = null;
	setResult('');
	updateSigns();
	if (view === 'converter') recompute();
}

function bindControls(): void {
	document.addEventListener('click', event => {
		const target = event.target as Element | null;
		const button = target?.closest<HTMLButtonElement>('[data-seg] button');
		if (!button) return;
		const group = button.closest<HTMLElement>('[data-seg]');
		const value = button.dataset.value;
		if (!group || !value) return;
		const kind = group.dataset.seg;
		if (kind === 'lang') {
			const nextLang = value as Lang;
			const targetCurrency = targetAfterLanguageChange({
				currentTarget: settings.targetCurrency,
				previousLang: settings.lang,
				nextLang,
				targetTouched,
				onboarded: settings.onboarded
			});
			void persist(
				targetCurrency === settings.targetCurrency ? { lang: nextLang } : { lang: nextLang, targetCurrency }
			);
		} else if (kind === 'theme') void persist({ theme: value as Theme });
		else if (kind === 'overlayTheme') void persist({ overlayTheme: value as OverlayTheme });
	});

	for (const slider of $$<HTMLInputElement>('input[data-gap]')) {
		slider.addEventListener('input', () => {
			const gap = Number(slider.value);
			settings = { ...settings, gap };
			syncGap(gap);
			scheduleScene();
		});
		slider.addEventListener('change', () => void persist({ gap: Number(slider.value) }));
	}

	input.addEventListener('input', () => {
		window.clearTimeout(inputTimer ?? undefined);
		inputTimer = window.setTimeout(recompute, INPUT_DEBOUNCE_MS);
	});

	$('#gear').addEventListener('click', () => showView('settings'));
	$('#back').addEventListener('click', () => {
		if (view === 'settings') showView('converter');
		else if (view === 'diagnostics') showView(diagnosticsReturn);
		else if (view === 'onboarding') {
			if (onboardingStep === 2) setOnboardingStep(1);
			else showView(returnView);
		}
	});
	$('#how').addEventListener('click', () => showOnboarding(view));
	$('#diagnostics-open').addEventListener('click', () => {
		diagnosticsReturn = view;
		showView('diagnostics');
	});
	$('#diagnostics-refresh').addEventListener('click', () => void renderDiagnostics());
	diagnosticsCopy.addEventListener('click', () => void copyDiagnostics());
	$('#finish-setup').addEventListener('click', () => showOnboarding('converter'));
	$('#onboarding-next').addEventListener('click', () => setOnboardingStep(2));
	$('#onboarding-back-1').addEventListener('click', () => showView(returnView));
	$('#onboarding-back-2').addEventListener('click', () => setOnboardingStep(1));
	$('#onboarding-done').addEventListener('click', () => {
		void saveSettings({ onboarded: true }).then(next => {
			applyChrome(next);
			showView(returnView === 'settings' ? 'settings' : 'converter');
		});
	});
	errorAction.addEventListener('click', () => {
		if (errorAction.textContent === t('action.otherCurrency')) {
			hideError();
			showView('settings');
			return;
		}
		retryNow();
	});

	window.addEventListener('resize', scheduleScene, { passive: true });
	window.addEventListener('scroll', scheduleScene, { passive: true, capture: true });
}

async function main(): Promise<void> {
	const loaded = await loadSettings();
	settings = loaded.settings;
	if (pristine(settings)) settings = await saveSettings(browserDefaults());

	setLang(settings.lang);
	document.documentElement.lang = settings.lang;
	document.documentElement.dataset.theme = settings.theme;
	const fallback = { from: settings.targetCurrency === 'USD' ? 'EUR' : 'USD', to: settings.targetCurrency };
	const pair = await loadPair(chromeSessionArea(), fallback);
	from = pair.from;
	to = pair.to;

	targetPicker = createPicker({
		lang: settings.lang,
		theme: settings.theme,
		selected: settings.targetCurrency,
		label: t('settings.targetCurrency'),
		onChange: code => {
			targetTouched = true;
			void persist({ targetCurrency: code });
		}
	});
	fromPicker = createPicker({
		lang: settings.lang,
		theme: settings.theme,
		selected: from,
		label: t('popup.from'),
		onChange: code => {
			from = code;
			rememberPair();
			resetPair();
		}
	});
	toPicker = createPicker({
		lang: settings.lang,
		theme: settings.theme,
		selected: to,
		label: t('popup.to'),
		onChange: code => {
			to = code;
			rememberPair();
			resetPair();
		}
	});
	$('#converter-from').append(fromPicker.button);
	$('#converter-to').append(toPicker.button);

	bindControls();
	applyChrome(settings);

	const requested = new URLSearchParams(location.search).get('view');
	if (requested === 'settings') showView('settings');
	else if (!settings.onboarded) showOnboarding('converter');
	else showView('converter');

	input.focus();
}

void main();
