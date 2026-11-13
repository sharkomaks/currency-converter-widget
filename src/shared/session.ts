// Сессионное хранилище: курс живёт здесь (ADR 0017), и выбранная в приложении
// пара валют — тоже. Это память браузера, а не диск: после перезапуска
// браузера пара возвращается к дефолту, как и курс. Область видна только
// доверенным контекстам, поэтому пикер приложения её читает, а контент-скрипт
// нет.

import { isSupported } from './currencies';
import { extensionApi } from './webext';

export interface SessionArea {
	get(key: string): Promise<unknown>;
	set(key: string, value: unknown): Promise<void>;
}

export function chromeSessionArea(): SessionArea {
	return {
		async get(key) {
			const bag = await extensionApi().storage.session.get(key);
			return bag[key];
		},
		async set(key, value) {
			await extensionApi().storage.session.set({ [key]: value });
		}
	};
}

export type CurrencyPair = { from: string; to: string };

export const APP_PAIR_KEY = 'app:pair';

/** Чужая/старая запись не должна ломать пикер: только два известных кода. */
export function readPair(raw: unknown): CurrencyPair | null {
	if (typeof raw !== 'object' || raw === null) return null;
	const pair = raw as Partial<CurrencyPair>;
	if (typeof pair.from !== 'string' || typeof pair.to !== 'string') return null;
	if (!isSupported(pair.from) || !isSupported(pair.to)) return null;
	return { from: pair.from, to: pair.to };
}

export async function loadPair(area: SessionArea, fallback: CurrencyPair): Promise<CurrencyPair> {
	try {
		return readPair(await area.get(APP_PAIR_KEY)) ?? fallback;
	} catch {
		return fallback;
	}
}

export async function savePair(area: SessionArea, pair: CurrencyPair): Promise<void> {
	if (!readPair(pair)) return;
	try {
		await area.set(APP_PAIR_KEY, pair);
	} catch {
		// Сессия недоступна — пара просто не запомнится до следующего раза.
	}
}
