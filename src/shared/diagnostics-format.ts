// Печать отчёта диагностики (план §14: один язык интерфейса). Все подписи —
// ключи словаря; значения данных (адрес, текст выделения, коды валют) остаются
// как есть. Неизвестное событие или поле печатается своим именем, чтобы новый
// журнал не исчезал из отчёта до перевода.

import type { DiagEvent, DiagLevel, DiagSnapshot, DiagValue } from './diagnostics';
import { t } from './i18n';
import type { Lang } from './storage';

const STATE_LABELS: Record<string, string> = {
	version: 'diagnostics.key.version',
	topFrame: 'diagnostics.key.topFrame',
	protocol: 'diagnostics.key.protocol',
	'settings.lang': 'diagnostics.key.settingsLang',
	'settings.target': 'diagnostics.key.settingsTarget',
	'settings.theme': 'diagnostics.key.settingsTheme',
	'settings.overlayTheme': 'diagnostics.key.settingsOverlayTheme',
	'selection.result': 'diagnostics.key.selectionResult',
	'selection.text': 'diagnostics.key.selectionText',
	'selection.anchor': 'diagnostics.key.selectionAnchor',
	'overlay.visible': 'diagnostics.key.overlayVisible',
	'overlay.phase': 'diagnostics.key.overlayPhase',
	'overlay.pair': 'diagnostics.key.overlayPair',
	'overlay.amount': 'diagnostics.key.overlayAmount',
	url: 'diagnostics.key.url',
	readyState: 'diagnostics.key.readyState',
	visibility: 'diagnostics.key.visibility',
	pageLang: 'diagnostics.key.pageLang',
	frames: 'diagnostics.key.frames',
	contentType: 'diagnostics.key.contentType'
};

const STATE_VALUES: Record<string, Record<string, string>> = {
	'selection.result': {
		parsed: 'diagnostics.value.parsed',
		rejected: 'diagnostics.value.rejected',
		none: 'diagnostics.value.none'
	},
	'overlay.phase': {
		loading: 'diagnostics.value.loading',
		result: 'diagnostics.value.result',
		error: 'diagnostics.value.error',
		closed: 'diagnostics.value.closed'
	},
	visibility: {
		visible: 'diagnostics.value.visible',
		hidden: 'diagnostics.value.hidden'
	},
	readyState: {
		loading: 'diagnostics.value.loading',
		interactive: 'diagnostics.value.interactive',
		complete: 'diagnostics.value.complete'
	},
	'settings.theme': { light: 'values.light', dark: 'values.dark' },
	'settings.overlayTheme': { light: 'values.light', dark: 'values.dark', auto: 'values.auto' },
	'settings.lang': { ru: 'values.ru', en: 'values.en' }
};

const EVENT_LABELS: Record<string, string> = {
	boot: 'diagnostics.event.boot',
	selection: 'diagnostics.event.selection',
	'rate.request': 'diagnostics.event.rateRequest',
	'rate.result': 'diagnostics.event.rateResult',
	'rate.ignored': 'diagnostics.event.rateIgnored',
	'overlay.close': 'diagnostics.event.overlayClose',
	'overlay.no-space': 'diagnostics.event.overlayNoSpace',
	'overlay.construct': 'diagnostics.event.overlayConstruct',
	'settings.load': 'diagnostics.event.settingsLoad',
	'anchor.empty': 'diagnostics.event.anchorEmpty',
	'window.error': 'diagnostics.event.windowError',
	unhandledrejection: 'diagnostics.event.unhandledrejection',
	'diagnostics.listen': 'diagnostics.event.diagnosticsListen'
};

const LEVEL_LABELS: Record<DiagLevel, string> = {
	info: 'diagnostics.level.info',
	warn: 'diagnostics.level.warn',
	error: 'diagnostics.level.error'
};

const FIELD_LABELS: Record<string, string> = {
	result: 'diagnostics.field.result',
	text: 'diagnostics.field.text',
	lang: 'diagnostics.field.lang',
	currency: 'diagnostics.field.currency',
	amount: 'diagnostics.field.amount',
	multiplier: 'diagnostics.field.multiplier',
	from: 'diagnostics.field.from',
	to: 'diagnostics.field.to',
	fresh: 'diagnostics.field.fresh',
	error: 'diagnostics.field.error',
	status: 'diagnostics.field.status',
	reason: 'diagnostics.field.reason',
	message: 'diagnostics.field.message',
	source: 'diagnostics.field.source',
	line: 'diagnostics.field.line',
	column: 'diagnostics.field.column',
	collapsed: 'diagnostics.field.collapsed',
	ranges: 'diagnostics.field.ranges',
	anchor: 'diagnostics.field.anchor',
	viewport: 'diagnostics.field.viewport',
	gap: 'diagnostics.field.gap'
};

const SELECTION_RESULTS: Record<string, string> = {
	parsed: 'diagnostics.value.parsed',
	rejected: 'diagnostics.value.rejected',
	none: 'diagnostics.value.none'
};

const ERROR_KINDS: Record<string, string> = {
	network: 'diagnostics.error.network',
	timeout: 'diagnostics.error.timeout',
	tooMany: 'diagnostics.error.tooMany',
	server: 'diagnostics.error.server',
	noRate: 'diagnostics.error.noRate',
	unparseable: 'diagnostics.error.unparseable',
	rateLimit: 'diagnostics.error.rateLimit'
};

const CLOSE_REASONS: Record<string, string> = {
	'open-settings': 'diagnostics.close.openSettings',
	'selection-empty': 'diagnostics.close.selectionEmpty',
	'selection-rejected': 'diagnostics.close.selectionRejected',
	'anchor-empty': 'diagnostics.close.anchorEmpty',
	'target-changed': 'diagnostics.close.targetChanged',
	scroll: 'diagnostics.close.scroll',
	pointerdown: 'diagnostics.close.pointerdown'
};

function messageFor(map: Record<string, string>, key: string): string {
	const messageKey = map[key];
	return messageKey === undefined ? key : t(messageKey);
}

function translated(map: Record<string, string> | undefined, value: string): string | null {
	const messageKey = map?.[value];
	return messageKey === undefined ? null : t(messageKey);
}

function stateValue(key: string, value: DiagValue): string {
	if (value === null) return '—';
	if (typeof value === 'boolean') return value ? t('diagnostics.yes') : t('diagnostics.no');
	if (typeof value === 'number') return String(value);
	return translated(STATE_VALUES[key], value) ?? value;
}

function eventValue(event: DiagEvent, field: string, value: DiagValue): string {
	if (value === null) return '—';
	if (typeof value === 'boolean') return value ? t('diagnostics.yes') : t('diagnostics.no');
	if (typeof value === 'number') return String(value);

	let mapped: string | null = null;
	if (event.event === 'selection' && field === 'result') mapped = translated(SELECTION_RESULTS, value);
	else if (event.event === 'rate.result' && field === 'error') mapped = translated(ERROR_KINDS, value);
	else if (event.event === 'overlay.close' && field === 'reason') mapped = translated(CLOSE_REASONS, value);
	return quoted(mapped ?? value);
}

/** JSON-строки (якорь, вьюпорт) печатаются без повторных кавычек. */
function quoted(value: string): string {
	if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) return value;
	return JSON.stringify(value);
}

function timeOf(ms: number, lang: Lang): string {
	const date = new Date(ms);
	const base = date.toLocaleTimeString(lang, { hour12: false });
	return `${base}.${String(date.getMilliseconds()).padStart(3, '0')}`;
}

function eventLine(event: DiagEvent, lang: Lang): string {
	const fields = event.data
		? Object.entries(event.data)
				.map(([key, value]) => `${messageFor(FIELD_LABELS, key)}=${eventValue(event, key, value)}`)
				.join(' ')
		: '';
	const level = messageFor(LEVEL_LABELS, event.level).padEnd(5);
	return `${timeOf(event.t, lang)} ${level} ${messageFor(EVENT_LABELS, event.event)}${fields ? `  ${fields}` : ''}`;
}

/**
 * Вызывающий уже выставил язык через `setLang`: `t` читает один глобальный
 * язык. `lang` здесь нужен только для дат и времени.
 */
export function formatDiagnosticsReport(snapshot: DiagSnapshot, lang: Lang): string {
	const state = Object.entries(snapshot.state).map(
		([key, value]) => `${messageFor(STATE_LABELS, key)}: ${stateValue(key, value)}`
	);
	const started = new Date(snapshot.startedAt).toLocaleString(lang, {
		dateStyle: 'short',
		timeStyle: 'medium'
	});
	return [
		`${t('diagnostics.userAgent')}: ${snapshot.userAgent}`,
		`${t('diagnostics.startedAt')}: ${started}`,
		'',
		t('diagnostics.state'),
		...state,
		'',
		t('diagnostics.events'),
		...snapshot.events.map(event => eventLine(event, lang))
	].join('\n');
}
