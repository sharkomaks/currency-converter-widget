// Хранилище настроек — одна роль: sync для настроек, курс живёт отдельно (план §10).
// Чистая часть (migrateRecord) тестируется без браузера; тонкая часть (load/save)
// ходит в chrome.storage.sync и больше ничего не решает (С8, реестр 34).

import { isSupported } from './currencies';
import { extensionApi } from './webext';

export const SCHEMA_VERSION = 2;

export type Lang = 'ru' | 'en';
export type Theme = 'light' | 'dark';
export type OverlayTheme = 'light' | 'dark' | 'auto';

export type Settings = {
	onboarded: boolean;
	schemaVersion: number;
	lang: Lang;
	theme: Theme;
	overlayTheme: OverlayTheme;
	targetCurrency: string;
	gap: number;
};

export type Notice = { key: string; params?: Record<string, string> };

export const DEFAULTS: Settings = {
	onboarded: false,
	schemaVersion: SCHEMA_VERSION,
	lang: 'en',
	theme: 'dark',
	overlayTheme: 'auto',
	targetCurrency: 'USD',
	gap: 7
};

const LANGS: readonly Lang[] = ['ru', 'en'];
const THEMES: readonly Theme[] = ['light', 'dark'];
const OVERLAY_THEMES: readonly OverlayTheme[] = ['light', 'dark', 'auto'];

function pick<T extends string>(raw: unknown, allowed: readonly T[]): T | null {
	return typeof raw === 'string' && (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

function pickGap(raw: unknown): number | null {
	return typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 && raw <= 20 ? raw : null;
}

/**
 * Чистая миграция одной записи из `sync`. Невалидное значение не чинится
 * догадкой — сбрасывается на дефолт и попадает в notices, чтобы страница
 * настроек сказала об этом вслух (С8). Запись из будущего (schemaVersion
 * больше нашей) читается как есть и не трогается: расширение могло быть
 * откачено, затирать данные новой схемы нельзя.
 */
export function migrateRecord(
	raw: Record<string, unknown>,
	atVersion: number = SCHEMA_VERSION
): { settings: Settings; notices: Notice[] } {
	const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;
	if (version > atVersion) {
		return { settings: raw as unknown as Settings, notices: [] };
	}

	const notices: Notice[] = [];
	const settings: Settings = { ...DEFAULTS };

	if ('onboarded' in raw && typeof raw.onboarded === 'boolean') {
		settings.onboarded = raw.onboarded;
	} else if ('onboarded' in raw) {
		notices.push({ key: 'notice.onboardedReset' });
	}

	const lang = pick(raw.lang, LANGS);
	if (lang) {
		settings.lang = lang;
	} else if ('lang' in raw) {
		notices.push({ key: 'notice.langReset', params: { value: String(raw.lang) } });
	}

	const theme = pick(raw.theme, THEMES);
	if (theme) {
		settings.theme = theme;
	} else if ('theme' in raw) {
		notices.push({ key: 'notice.themeReset', params: { value: String(raw.theme) } });
	}

	const overlayTheme = pick(raw.overlayTheme, OVERLAY_THEMES);
	if (overlayTheme) {
		settings.overlayTheme = overlayTheme;
	} else if ('overlayTheme' in raw) {
		notices.push({ key: 'notice.overlayThemeReset', params: { value: String(raw.overlayTheme) } });
	}

	const target = raw.targetCurrency;
	if (typeof target === 'string' && isSupported(target)) {
		settings.targetCurrency = target;
	} else if (typeof target === 'string' && target !== DEFAULTS.targetCurrency) {
		// Решение С10: выпавшая из списка валюта переводится на USD и об этом
		// говорится в настройках, а не молча.
		settings.targetCurrency = DEFAULTS.targetCurrency;
		notices.push({ key: 'notice.currencyReset', params: { code: target } });
	}

	// v1 → v2: 4 был дефолтом; сохранившаяся четвёрка — это он, а не выбор.
	const gap = version < 2 && raw.gap === 4 ? 7 : pickGap(raw.gap);
	if (gap !== null) {
		settings.gap = gap;
	} else if ('gap' in raw) {
		notices.push({ key: 'notice.gapReset', params: { value: String(raw.gap) } });
	}

	return { settings, notices };
}

// --- тонкая часть: единственное место, говорящее с chrome.storage.sync ---

export type SyncArea = {
	get(): Promise<Record<string, unknown>>;
	set(value: Record<string, unknown>): Promise<void>;
};

function chromeArea(): SyncArea {
	return {
		get: async () => await extensionApi().storage.sync.get(null),
		set: async value => {
			await extensionApi().storage.sync.set(value);
		}
	};
}

/**
 * Читает настройки, мигрирует, и если миграция что-то поправила — пишет
 * обратно (кроме записи из будущего). Notices отдаются вызывающему: страница
 * настроек показывает их, контент-скрипт молча берёт settings.
 */
export async function loadSettings(area: SyncArea = chromeArea()): Promise<{ settings: Settings; notices: Notice[] }> {
	const raw = await area.get();
	const { settings, notices } = migrateRecord(raw);
	const future = settings.schemaVersion > SCHEMA_VERSION;
	if ((notices.length > 0 || raw.schemaVersion !== settings.schemaVersion) && !future) {
		await area.set({ ...settings });
	}
	return { settings, notices };
}

/** Пишет патч поверх текущих настроек — по факту изменения, как решено в §10. */
export async function saveSettings(patch: Partial<Settings>, area: SyncArea = chromeArea()): Promise<Settings> {
	const current = await loadSettings(area);
	const next = { ...current.settings, ...patch, schemaVersion: SCHEMA_VERSION };
	await area.set({ ...next });
	return next;
}
