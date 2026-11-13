// Адаптер Frankfurter v2 — единственный поставщик курса (ADR 0003) и
// единственное место с URL и именами полей. Переводит наблюдаемое в классы
// §11: исключение — network, 429 — tooMany, 5xx — server, прочие 4xx — noRate,
// 2xx без числового курса — unparseable. Курс пересекает шов строкой (ADR 0002).

import type { RateSource } from '../rate';

const ENDPOINT = 'https://api.frankfurter.dev/v2/rate';

type FrankfurterBody = {
	date?: unknown;
	rate?: unknown;
};

export function createFrankfurterSource(fetchImpl: typeof fetch = fetch): RateSource {
	return {
		async fetchRate(from, to) {
			let response: Response;
			try {
				response = await fetchImpl(`${ENDPOINT}/${from}/${to}`);
			} catch {
				return { error: { kind: 'network' } };
			}

			if (response.status === 429) return { error: { kind: 'tooMany', status: 429 } };
			if (response.status >= 500) return { error: { kind: 'server', status: response.status } };
			if (response.status >= 400) return { error: { kind: 'noRate', status: response.status } };

			let body: FrankfurterBody;
			try {
				body = (await response.json()) as FrankfurterBody;
			} catch {
				return { error: { kind: 'unparseable', status: response.status } };
			}

			const rate = body.rate;
			const rateDate = body.date;
			if (typeof rate !== 'number' || !Number.isFinite(rate) || typeof rateDate !== 'string') {
				// Код в детали (§11: «В ответе нет поля rate (200)»).
				return { error: { kind: 'unparseable', status: response.status } };
			}

			return { rate: String(rate), rateDate };
		}
	};
}
