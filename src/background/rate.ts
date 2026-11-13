// getRate — курс одной пары (план §7). Порядок: кэш сессии со своим окном
// свежести → потолок частоты на пару → схлопывание одновременных запросов →
// источник. Ответ — факт: { rate } или { error: { kind, status? } };
// тексты живут в словаре окна, не здесь.

import type { SessionArea } from '../shared/session';

/** Окно свежести: выводено из суточного темпа публикаций (Р5а, ADR 0017). */
export const FRESHNESS_MS = 6 * 3_600_000;

/** Потолок частоты на пару (§7): не больше 3 запросов за 10 секунд… */
const BURST_WINDOW_MS = 10_000;
const BURST_MAX = 3;
/** …и 20 за 10 минут. Счётчик живёт здесь: вкладок и окон много, окно одно. */
const SUSTAINED_WINDOW_MS = 600_000;
const SUSTAINED_MAX = 20;

export type RateErrorKind = 'network' | 'timeout' | 'tooMany' | 'server' | 'noRate' | 'unparseable' | 'rateLimit';

export type RateError = { kind: RateErrorKind; status?: number };
export type RateResult = { rate: string } | { error: RateError };

export type SourceResult = { rate: string; rateDate: string } | { error: RateError };

/** Единственный шов провайдера (ADR 0003): адаптер Frankfurter его реализует. */
export interface RateSource {
	fetchRate(from: string, to: string): Promise<SourceResult>;
}

export interface RateService {
	/** fresh — «повторить» после ошибки: кэш не читается, идём в сеть (§11). */
	getRate(from: string, to: string, opts?: { fresh?: boolean }): Promise<RateResult>;
}

type CacheRecord = { value: string; rateDate: string; fetchedAt: number };

function rateKey(from: string, to: string): string {
	return `rate:${from}:${to}`;
}

function isFresh(record: unknown, atMs: number): record is CacheRecord {
	if (typeof record !== 'object' || record === null) return false;
	const r = record as Partial<CacheRecord>;
	return typeof r.value === 'string' && typeof r.fetchedAt === 'number' && atMs - r.fetchedAt < FRESHNESS_MS;
}

export function createRateService(deps: { source: RateSource; area: SessionArea; now(): number }): RateService {
	const { source, area, now } = deps;
	const inFlight = new Map<string, Promise<RateResult>>();
	const askTimes = new Map<string, number[]>();

	/** Решает, пускать ли спрос в сеть: чистит окно, проверяет потолок, помечает спрос. */
	function admitAsk(key: string, atMs: number): boolean {
		const stamps = (askTimes.get(key) ?? []).filter(s => atMs - s < SUSTAINED_WINDOW_MS);
		const burst = stamps.filter(s => atMs - s < BURST_WINDOW_MS).length;
		askTimes.set(key, stamps);
		if (burst >= BURST_MAX || stamps.length >= SUSTAINED_MAX) return false;
		stamps.push(atMs); // этот спрос пойдёт в сеть и займёт слот в обоих окнах
		return true;
	}

	async function fetchAndCache(from: string, to: string, key: string, atMs: number): Promise<RateResult> {
		try {
			const result = await source.fetchRate(from, to);
			if ('error' in result) return { error: result.error };
			await area.set(key, {
				value: result.rate,
				rateDate: result.rateDate,
				fetchedAt: atMs
			} satisfies CacheRecord);
			return { rate: result.rate };
		} finally {
			inFlight.delete(key);
		}
	}

	return {
		async getRate(from, to, opts = {}) {
			const key = rateKey(from, to);
			const atMs = now();

			if (!opts.fresh) {
				const cached = await area.get(key);
				if (isFresh(cached, atMs)) return { rate: cached.value };
			}

			// Одновременные запросы схлопываются до потолка: слот тратится
			// только тогда, когда запрос действительно уходит в сеть.
			const running = inFlight.get(key);
			if (running) return running;

			if (!admitAsk(key, atMs)) return { error: { kind: 'rateLimit' } };

			const attempt = fetchAndCache(from, to, key, atMs);
			inFlight.set(key, attempt);
			return attempt;
		}
	};
}
