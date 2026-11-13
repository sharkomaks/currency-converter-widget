// Контент-скрипт — единственная точка входа на чужой странице (план §6, §11).
// Цепочка: selectionchange → Exact selection → скелетон → getRate → число.
// Состояние вкладки живёт здесь: снимок настроек, текущее выделение, фаза окна,
// номер запроса против гонок. Курса в нём нет — курс принадлежит фону.

import type { RateError } from '../background/rate';
import { record, setState, startDiagnostics } from '../shared/diagnostics';
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

// Журнал ставится раньше окна: если конструктор упадёт, панель диагностики
// всё равно ответит и покажет ошибку.
startDiagnostics();
let overlay: Overlay;
try {
	overlay = new Overlay();
} catch (error) {
	record('error', 'overlay.construct', { reason: error instanceof Error ? error.message : String(error) });
	throw error;
}
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
				setState('settings.lang', loaded.lang);
				setState('settings.target', loaded.targetCurrency);
				setState('settings.theme', loaded.theme);
				setState('settings.overlayTheme', loaded.overlayTheme);
				return loaded;
			})
			.catch((error: unknown) => {
				record('error', 'settings.load', { reason: error instanceof Error ? error.message : String(error) });
				throw error;
			})
			.finally(() => {
				settingsPromise = null;
			});
	}
	return settingsPromise;
}

function close(reason?: string): void {
	if (current && reason) record('info', 'overlay.close', { reason });
	requestId += 1;
	inspectToken += 1;
	current = null;
	clearCountdown();
	overlay.hide();
	setState('overlay.visible', false);
	setState('overlay.phase', 'closed');
}

function themeFor(s: Settings) {
	return resolveOverlayTheme(s.overlayTheme, s.theme, resolvePageTheme(document));
}

function place(): boolean {
	if (!current || !settings) return false;
	const placed = overlay.place(current.anchor, settings.gap);
	setState('overlay.visible', placed);
	if (!placed) {
		record(
			'warn',
			'overlay.no-space',
			{
				anchor: current.anchor.toJSON(),
				viewport: { width: window.innerWidth, height: window.innerHeight },
				gap: settings.gap
			},
			500
		);
	}
	return placed;
}

function openSettings(): void {
	void extensionApi()
		.runtime.sendMessage({ type: 'openSettings' })
		.catch(() => undefined);
	close('open-settings');
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
	setState('overlay.phase', 'error');
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
	record('info', 'rate.request', { from: c.from, to: c.to, fresh });
	const result = await requestRate(c.from, c.to, { fresh });
	if ('error' in result) {
		record('warn', 'rate.result', {
			from: c.from,
			to: c.to,
			error: result.error.kind,
			status: result.error.status ?? null
		});
	} else {
		record('info', 'rate.result', { from: c.from, to: c.to });
	}
	if (id !== requestId || current !== c) {
		record('info', 'rate.ignored', { from: c.from, to: c.to });
		return;
	}
	const s = settings;
	if (!s) return;

	if ('error' in result) {
		showError(result.error);
		return;
	}
	gate.succeed();
	const text = formatMoney(convert(c.amount, result.rate, c.to, c.multiplier), c.to, s.lang);
	setState('overlay.phase', 'result');
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
	setState('overlay.phase', 'result');
	setState('overlay.pair', `${parsed.currency}→${parsed.currency}`);
	setState('overlay.amount', parsed.amount);
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
	setState('overlay.phase', 'loading');
	setState('overlay.pair', `${parsed.currency}→${s.targetCurrency}`);
	setState('overlay.amount', parsed.amount);
	overlay.setTheme(themeFor(s));
	overlay.update({ phase: 'loading' });
	place();
	void ask(current, requestId, false);
}

function logSelection(result: string, text: string, data: Record<string, unknown> = {}): void {
	setState('selection.result', result);
	setState('selection.text', text);
	record('info', 'selection', { result, text, ...data }, 400);
}

function inspect(): void {
	const selection = window.getSelection();
	if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
		logSelection('none', '', { collapsed: selection?.isCollapsed ?? null, ranges: selection?.rangeCount ?? null });
		close('selection-empty');
		return;
	}
	const text = selection.toString();
	const lang = document.documentElement.lang || document.body?.lang || '';
	const parsed = parseSelection(text, lang);
	logSelection(
		parsed ? 'parsed' : 'rejected',
		text,
		parsed ? { lang, currency: parsed.currency, amount: parsed.amount, multiplier: parsed.multiplier } : { lang }
	);
	if (!parsed) {
		close('selection-rejected');
		return;
	}
	const range = selection.getRangeAt(0);
	let rect = range.getBoundingClientRect();
	if (rect.width === 0 && rect.height === 0) {
		const first = range.getClientRects()[0];
		if (!first) {
			record('warn', 'anchor.empty', { text });
			close('anchor-empty');
			return;
		}
		rect = first;
	}
	setState('selection.anchor', rect.toJSON());
	const token = ++inspectToken;
	void snapshot()
		.then(s => {
			if (token !== inspectToken) return;
			if (parsed.currency === s.targetCurrency) {
				showEcho(parsed, rect);
				return;
			}
			open(parsed, rect);
		})
		.catch(() => undefined);
}

function applySettingsChange(before: Settings | null, next: Settings): void {
	if (!current) return;
	if (before && before.targetCurrency !== next.targetCurrency) {
		close('target-changed');
		return;
	}
	setState('settings.target', next.targetCurrency);
	setState('settings.overlayTheme', next.overlayTheme);
	overlay.setTheme(themeFor(next));
	place();
}

// Дебаунс — только у поля ввода в приложении; выделение обрабатывается сразу,
// чтобы окно не отставало от жеста. Слушатель на window в фазе перехвата:
// страница может остановить selectionchange на document своим слушателем.
window.addEventListener('selectionchange', inspect, true);

window.addEventListener('scroll', () => close('scroll'), { capture: true, passive: true });
window.addEventListener('resize', place, { passive: true });

document.addEventListener(
	'pointerdown',
	event => {
		if (!current) return;
		if (event.composedPath().includes(overlay.host)) return;
		close('pointerdown');
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
	void snapshot()
		.then(s => applySettingsChange(before, s))
		.catch(() => undefined);
});

extensionApi().storage.onChanged.addListener((_changes, area) => {
	if (area !== 'sync') return;
	const before = settings;
	dirty = true;
	void snapshot()
		.then(next => applySettingsChange(before, next))
		.catch(() => undefined);
});

void snapshot().catch(() => undefined);
