import { describe, expect, test } from 'bun:test';
/**
 * Адаптер Frankfurter — единственное место, где живут URL и имена полей
 * (ADR 0003). Проверяется на фейковом fetch без сети: маппинг наблюдаемого в
 * классы §11 и курс строкой через шов (ADR 0002).
 */

import { createFrankfurterSource } from '../src/background/sources/frankfurter';

type FakeResponse = { ok: boolean; status: number; json(): Promise<unknown> };

function res(status: number, body: unknown): FakeResponse {
	return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function fakeFetch(responses: FakeResponse[]): {
	fetchImpl: typeof fetch;
	urls: string[];
} {
	const urls: string[] = [];
	let i = 0;
	const fetchImpl = (async (input: RequestInfo | URL) => {
		urls.push(String(input));
		return responses[Math.min(i++, responses.length - 1)] as FakeResponse;
	}) as unknown as typeof fetch;
	return { fetchImpl, urls };
}

describe('адаптер Frankfurter v2', () => {
	test('2xx с курсом: значение строкой, дата курса как факт', async () => {
		const { fetchImpl, urls } = fakeFetch([
			res(200, { base: 'EUR', quote: 'USD', date: '2026-11-06', rate: 1.1103 })
		]);
		const src = createFrankfurterSource(fetchImpl);

		const got = await src.fetchRate('EUR', 'USD');

		expect(got).toEqual({ rate: '1.1103', rateDate: '2026-11-06' });
		expect(urls[0]).toBe('https://api.frankfurter.dev/v2/rate/EUR/USD');
	});

	test('fetch бросил исключение — kind network, без статуса', async () => {
		const fetchImpl = (async () => {
			throw new TypeError('failed to fetch');
		}) as unknown as typeof fetch;
		const got = await createFrankfurterSource(fetchImpl).fetchRate('EUR', 'USD');
		expect(got).toEqual({ error: { kind: 'network' } });
	});

	test('429 — tooMany со статусом', async () => {
		const { fetchImpl } = fakeFetch([res(429, {})]);
		const got = await createFrankfurterSource(fetchImpl).fetchRate('EUR', 'USD');
		expect(got).toEqual({ error: { kind: 'tooMany', status: 429 } });
	});

	test('5xx — server со статусом', async () => {
		const { fetchImpl } = fakeFetch([res(503, {})]);
		const got = await createFrankfurterSource(fetchImpl).fetchRate('EUR', 'USD');
		expect(got).toEqual({ error: { kind: 'server', status: 503 } });
	});

	test('4xx кроме 429 — noRate со статусом: повтор не поможет', async () => {
		const { fetchImpl } = fakeFetch([res(404, {})]);
		const got = await createFrankfurterSource(fetchImpl).fetchRate('USD', 'KZT');
		expect(got).toEqual({ error: { kind: 'noRate', status: 404 } });
	});

	test('2xx без поля курса — unparseable: это наша ошибка', async () => {
		const { fetchImpl } = fakeFetch([res(200, { base: 'EUR', quote: 'USD', date: '2026-11-06' })]);
		const got = await createFrankfurterSource(fetchImpl).fetchRate('EUR', 'USD');
		expect(got).toEqual({ error: { kind: 'unparseable', status: 200 } });
	});

	test('2xx с нечисловым курсом — unparseable тоже', async () => {
		const { fetchImpl } = fakeFetch([res(200, { base: 'EUR', quote: 'USD', date: '2026-11-06', rate: 'быстро' })]);
		const got = await createFrankfurterSource(fetchImpl).fetchRate('EUR', 'USD');
		expect(got).toEqual({ error: { kind: 'unparseable', status: 200 } });
	});
});
