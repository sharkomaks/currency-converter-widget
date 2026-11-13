// Контент-скрипт — единственная точка входа на чужой странице (план §6, §11).
// Цепочка: selectionchange → Exact selection → скелетон → getRate → число.
// Состояние вкладки живёт здесь: снимок настроек, текущее выделение, фаза окна,
// номер запроса против гонок. Курса в нём нет — курс принадлежит фону.

import type { RateError } from '../background/rate';
import { describeError } from '../shared/errors';
import { formatMoney } from '../shared/format';
import { setLang, t } from '../shared/i18n';
import { convert } from '../shared/money';
import { Overlay } from '../shared/overlay';
import { requestRate, RetryGate } from '../shared/rate-client';
import { loadSettings, type Settings } from '../shared/storage';
import { resolveOverlayTheme, resolvePageTheme } from '../shared/tone';
import { extensionApi } from '../shared/webext';
import { parseSelection } from './parser';

const overlay = new Overlay();
let settings: Settings | null = null;
let settingsPromise: Promise<Settings> | null = null;
let dirty = true;
let current: { from: string; to: string; amount: string; multiplier: number; anchor: DOMRect } | null = null;
let requestId = 0;
let inspectToken = 0;
let gate = new RetryGate();
let countdown: number | null = null;

function clearCountdown(): void {
	window.clearInterval(countdown ?? undefined);
	countdown = null;
}

function snapshot(): Promise<Settings> {
	if (settings && !dirty) return Promise.resolve(settings);
	if (!settingsPromise) {
		settingsPromise = loadSettings()
			.then(({ settings: loaded }) => {
				settings = loaded;
				dirty = false;
				setLang(loaded.lang);
				return loaded;
			})
			.finally(() => {
				settingsPromise = null;
			});
	}
	return settingsPromise;
}

function close(): void {
	requestId += 1;
	inspectToken += 1;
	current = null;
	clearCountdown();
	overlay.hide();
}

function themeFor(s: Settings) {
	return resolveOverlayTheme(s.overlayTheme, s.theme, resolvePageTheme(document));
}

function place(): boolean {
	if (!current || !settings) return false;
	return overlay.place(current.anchor, settings.gap);
}

function openSettings(): void {
	void extensionApi()
		.runtime.sendMessage({ type: 'openSettings' })
		.catch(() => undefined);
	close();
}

function retry(c: NonNullable<typeof current>): void {
	if (!gate.begin(Date.now())) return;
	clearCountdown();
	requestId += 1;
	overlay.update({ phase: 'loading' });
	place();
	void ask(c, requestId, true);
}

function startCountdown(): void {
	clearCountdown();
	const tick = (): void => {
		const seconds = gate.secondsLeft(Date.now());
		if (seconds === 0) {
			overlay.setAction(t('action.retry'), false);
			clearCountdown();
		} else {
			overlay.setAction(t('action.retryIn', { seconds: String(seconds) }), true);
		}
	};
	tick();
	countdown = window.setInterval(tick, 250);
}

function showError(error: RateError): void {
	const c = current;
	if (!c) return;
	clearCountdown();
	const view = describeError(error, c.from, c.to);
	const cta = view.action;
	if (cta === 'retry') {
		gate.fail(Date.now());
		overlay.update({
			phase: 'error',
			title: view.title,
			detail: view.detail,
			action: {
				label: t('action.retryIn', { seconds: String(gate.secondsLeft(Date.now())) }),
				disabled: true,
				onActivate: () => retry(c)
			}
		});
		place();
		startCountdown();
	} else {
		overlay.update({
			phase: 'error',
			title: view.title,
			detail: view.detail,
			action: { label: t('action.otherCurrency'), disabled: false, onActivate: openSettings }
		});
		place();
	}
}

async function ask(c: NonNullable<typeof current>, id: number, fresh: boolean): Promise<void> {
	const result = await requestRate(c.from, c.to, { fresh });
	if (id !== requestId || current !== c) return;
	const s = settings;
	if (!s) return;

	if ('error' in result) {
		showError(result.error);
		return;
	}
	gate.succeed();
	const text = formatMoney(convert(c.amount, result.rate, c.to, c.multiplier), c.to, s.lang);
	overlay.update({ phase: 'result', text });
	place();
}

function showEcho(parsed: { currency: string; amount: string; multiplier: number }, anchor: DOMRect): void {
	const s = settings;
	if (!s) return;
	current = {
		from: parsed.currency,
		to: parsed.currency,
		amount: parsed.amount,
		multiplier: parsed.multiplier,
		anchor
	};
	gate = new RetryGate();
	clearCountdown();
	requestId += 1;
	overlay.setTheme(themeFor(s));
	overlay.update({
		phase: 'result',
		text: formatMoney(convert(parsed.amount, '1', parsed.currency, parsed.multiplier), parsed.currency, s.lang)
	});
	place();
}

function open(parsed: { currency: string; amount: string; multiplier: number }, anchor: DOMRect): void {
	const s = settings;
	if (!s) return;
	current = {
		from: parsed.currency,
		to: s.targetCurrency,
		amount: parsed.amount,
		multiplier: parsed.multiplier,
		anchor
	};
	gate = new RetryGate();
	clearCountdown();
	requestId += 1;
	overlay.setTheme(themeFor(s));
	overlay.update({ phase: 'loading' });
	place();
	void ask(current, requestId, false);
}

function inspect(): void {
	const selection = window.getSelection();
	if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
		close();
		return;
	}
	const parsed = parseSelection(selection.toString(), document.documentElement.lang || document.body?.lang || '');
	if (!parsed) {
		close();
		return;
	}
	const range = selection.getRangeAt(0);
	let rect = range.getBoundingClientRect();
	if (rect.width === 0 && rect.height === 0) {
		const first = range.getClientRects()[0];
		if (!first) {
			close();
			return;
		}
		rect = first;
	}
	const token = ++inspectToken;
	void snapshot().then(s => {
		if (token !== inspectToken) return;
		if (parsed.currency === s.targetCurrency) {
			showEcho(parsed, rect);
			return;
		}
		open(parsed, rect);
	});
}

function applySettingsChange(before: Settings | null, next: Settings): void {
	if (!current) return;
	if (before && before.targetCurrency !== next.targetCurrency) {
		close();
		return;
	}
	overlay.setTheme(themeFor(next));
	place();
}

// Дебаунс — только у поля ввода в приложении; выделение обрабатывается сразу,
// чтобы окно не отставало от жеста.
document.addEventListener('selectionchange', inspect);

window.addEventListener('scroll', close, { capture: true, passive: true });
window.addEventListener('resize', place, { passive: true });

document.addEventListener(
	'pointerdown',
	event => {
		if (!current) return;
		if (event.composedPath().includes(overlay.host)) return;
		close();
	},
	true
);

overlay.host.addEventListener('pointerdown', event => {
	// Иначе страница снимет выделение раньше click, и кнопка ошибки умрёт.
	event.preventDefault();
	event.stopPropagation();
});

document.addEventListener('visibilitychange', () => {
	if (document.visibilityState !== 'visible') return;
	const before = settings;
	dirty = true;
	void snapshot().then(s => applySettingsChange(before, s));
});

extensionApi().storage.onChanged.addListener((_changes, area) => {
	if (area !== 'sync') return;
	const before = settings;
	dirty = true;
	void snapshot().then(next => applySettingsChange(before, next));
});

void snapshot();
