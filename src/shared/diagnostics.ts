// Диагностика контент-скрипта: кольцевой журнал последних событий и снимок
// состояния вкладки. Журнал живёт в памяти страницы, наружу не уходит и нужен
// ровно для одного — когда окно не появилось, показать, где цепочка оборвалась:
// скрипт не загрузился, selectionchange не пришёл, парсер отказал, окно не
// влезло или курс не пришёл. Панель читает снимок через tabs.sendMessage.

import { extensionApi } from './webext';

export const DIAGNOSTICS_MESSAGE = 'priceLensDiagnostics';

export type DiagLevel = 'info' | 'warn' | 'error';
export type DiagValue = string | number | boolean | null;
export type DiagEvent = {
	t: number;
	level: DiagLevel;
	event: string;
	data?: Record<string, DiagValue> | undefined;
};
export type DiagState = Record<string, DiagValue>;

export type DiagSnapshot = {
	version: string;
	url: string;
	userAgent: string;
	startedAt: number;
	state: DiagState;
	events: DiagEvent[];
};

const LIMIT = 300;
const events: DiagEvent[] = [];
const state: DiagState = {};
let startedAt = 0;
let installed = false;

/** Снимок копируется целиком: живой массив не должен меняться под панелью. */
function flatten(value: unknown): DiagValue {
	if (value === null || value === undefined) return null;
	if (typeof value === 'number' || typeof value === 'boolean') return value;
	if (typeof value === 'string') return value.length > 240 ? `${value.slice(0, 240)}…` : value;
	if (value instanceof Error) return `${value.name}: ${value.message}`;
	try {
		const json = JSON.stringify(value);
		return json === undefined ? String(value) : json.length > 240 ? `${json.slice(0, 240)}…` : json;
	} catch {
		return String(value);
	}
}

/**
 * Запись события. coalesceMs склеивает подряд идущие события с тем же именем:
 * selectionchange во время протяжки мышью иначе вытеснит из журнала загрузку.
 * В консоль идут только ошибки — предупреждения видны в панели.
 */
export function record(level: DiagLevel, event: string, data?: Record<string, unknown>, coalesceMs = 0): void {
	const t = Date.now();
	const flatData =
		data === undefined ? undefined : Object.fromEntries(Object.entries(data).map(([k, v]) => [k, flatten(v)]));
	const last = events[events.length - 1];
	if (coalesceMs > 0 && last && last.event === event && t - last.t < coalesceMs) {
		events[events.length - 1] = { t, level, event, data: flatData };
		return;
	}
	events.push({ t, level, event, data: flatData });
	if (events.length > LIMIT) events.splice(0, events.length - LIMIT);
	if (level === 'error') console.error(`[Price Lens] ${event}`, data ?? '');
}

export function setState(key: string, value: unknown): void {
	state[key] = flatten(value);
}

function manifestVersion(): string {
	try {
		return extensionApi().runtime.getManifest().version;
	} catch {
		return '?';
	}
}

/**
 * Снимок для панели. Окружение перечитывается здесь, а не один раз при
 * загрузке: SPA меняет адрес, вкладка уходит в фон, страница дочитывается.
 */
export function getSnapshot(): DiagSnapshot {
	state.url = location.href;
	state.readyState = document.readyState;
	state.visibility = document.visibilityState;
	state.pageLang = document.documentElement?.lang || document.body?.lang || '';
	state.frames = window.frames.length;
	state.contentType = document.contentType;
	return {
		version: manifestVersion(),
		url: location.href,
		userAgent: navigator.userAgent,
		startedAt,
		state: { ...state },
		events: events.map(event => ({ ...event, data: event.data === undefined ? undefined : { ...event.data } }))
	};
}

function errorText(error: unknown): string {
	return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/**
 * Ставится до создания окна и подписок: если конструктор Overlay упадёт,
 * слушатель сообщений уже будет отвечать панели и назовёт причину.
 */
export function startDiagnostics(): void {
	if (installed) return;
	installed = true;
	startedAt = Date.now();

	window.addEventListener('error', event => {
		record('error', 'window.error', {
			message: event.message,
			source: event.filename,
			line: event.lineno,
			column: event.colno
		});
	});
	window.addEventListener('unhandledrejection', event => {
		record('error', 'unhandledrejection', { reason: errorText(event.reason) });
	});

	setState('version', manifestVersion());
	setState('topFrame', window.top === window);
	setState('protocol', location.protocol);
	record('info', 'boot', {});

	try {
		extensionApi().runtime.onMessage.addListener((message, _sender, sendResponse) => {
			if (
				typeof message !== 'object' ||
				message === null ||
				(message as { type?: unknown }).type !== DIAGNOSTICS_MESSAGE
			) {
				return false;
			}
			sendResponse({ ok: true, snapshot: getSnapshot() });
			return false;
		});
	} catch (error) {
		record('error', 'diagnostics.listen', { reason: errorText(error) });
	}
}
