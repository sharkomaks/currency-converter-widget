import { describe, expect, test } from 'bun:test';
/**
 * Шов 2 — интерфейс RateSource (спека, Testing Decisions; план §7, §11, ADR
 * 0002/0003/0017). Ожидаемые значения задаются фейку заранее и читаются как
 * факты: окно свежести 6 часов (Р5а), потолок 3/10с и 20/10мин, схлопывание
 * одновременных запросов одной пары, факт вместо текста: { rate } или
 * { error: { kind, status? } }.
 */

import { createRateService, FRESHNESS_MS, type RateSource } from '../src/background/rate';
import type { SessionArea } from '../src/shared/session';

const HOUR = 3_600_000;

type Stored = Map<string, unknown>;

function fakeSession(stored: Stored = new Map()): { area: SessionArea; stored: Stored } {
	return {
		area: {
			async get(key) {
				return stored.get(key) ?? undefined;
			},
			async set(key, value) {
				stored.set(key, value);
			}
		},
		stored
	};
}

function okSource(value: string, rateDate = '2026-11-06'): RateSource & { calls: () => number } {
	let calls = 0;
	return {
		async fetchRate() {
			calls++;
			return { rate: value, rateDate };
		},
		calls: () => calls
	};
}

const NOW_START = Date.UTC(2026, 10, 9, 12, 0, 0);
let now = NOW_START;

describe('getRate — кэш и окно свежести (Р5а)', () => {
	test('первый запрос идёт в источник, второй берётся из кэша без вызова', async () => {
		const src = okSource('1.1103');
		const { area } = fakeSession();
		const svc = createRateService({ source: src, area, now: () => now });

		const first = await svc.getRate('EUR', 'USD');
		const second = await svc.getRate('EUR', 'USD');

		expect(first).toEqual({ rate: '1.1103' });
		expect(second).toEqual({ rate: '1.1103' });
		expect(src.calls()).toBe(1);
	});

	test('запись старше шести часов не отдаётся — снова в сеть', async () => {
		const src = okSource('1.1103');
		const { area } = fakeSession();
		const svc = createRateService({ source: src, area, now: () => now });

		await svc.getRate('EUR', 'USD');
		now += FRESHNESS_MS; // ровно граница: теперь запись старше окна
		await svc.getRate('EUR', 'USD');

		expect(src.calls()).toBe(2);
	});

	test('запись младше окна не перезапрашивается даже другой парой часов спустя', async () => {
		const src = okSource('1.1103');
		const { area } = fakeSession();
		const svc = createRateService({ source: src, area, now: () => now });

		await svc.getRate('EUR', 'USD');
		now += FRESHNESS_MS - HOUR;
		await svc.getRate('EUR', 'USD');
		expect(src.calls()).toBe(1);
	});

	test('кэш переживает пересоздание сервиса: читается из session, как записан (ADR 0017)', async () => {
		const src = okSource('1.1103');
		const { area } = fakeSession();
		await createRateService({ source: src, area, now: () => now }).getRate('EUR', 'USD');

		const revived = createRateService({ source: okSource('9.9999'), area, now: () => now });
		const got = await revived.getRate('EUR', 'USD');

		expect(got).toEqual({ rate: '1.1103' }); // свежая запись, второй источник не звали
	});

	test('у каждой пары своё fetchedAt: обновление по записи, не пачкой', async () => {
		const src = okSource('1.1103');
		const { area } = fakeSession();
		const svc = createRateService({ source: src, area, now: () => now });

		await svc.getRate('EUR', 'USD');
		now += HOUR;
		await svc.getRate('USD', 'KZT');
		expect(src.calls()).toBe(2);

		now += FRESHNESS_MS - 2 * HOUR; // первая пара ещё свежа, вторая тоже
		await svc.getRate('EUR', 'USD');
		expect(src.calls()).toBe(2);
	});
});

describe('getRate — ошибки как факты (§11)', () => {
	test('источник вернул ошибку — ошибка доходит как { error: { kind, status? } } и не кэшируется', async () => {
		let attempt = 0;
		const src: RateSource = {
			async fetchRate() {
				attempt++;
				return attempt === 1
					? { error: { kind: 'server', status: 503 } }
					: { rate: '0.5', rateDate: '2026-11-06' };
			}
		};
		const { area, stored } = fakeSession();
		const svc = createRateService({ source: src, area, now: () => now });

		const first = await svc.getRate('USD', 'KZT');
		const second = await svc.getRate('USD', 'KZT');

		expect(first).toEqual({ error: { kind: 'server', status: 503 } });
		expect(second).toEqual({ rate: '0.5' });
		expect(stored.size).toBeGreaterThan(0);
	});

	test('сетевая ошибка источника — kind network, без статуса', async () => {
		const src: RateSource = {
			async fetchRate() {
				return { error: { kind: 'network' } };
			}
		};
		const svc = createRateService({ source: src, area: fakeSession().area, now: () => now });
		expect(await svc.getRate('USD', 'KZT')).toEqual({ error: { kind: 'network' } });
	});
});

describe('потолок частоты на пару (§7)', () => {
	test('четвёртый запрос одной пары за 10 секунд не идёт в сеть: «подожди»', async () => {
		// три промаха кэша подряд — ошибка не кэшируется, поэтому каждый запрос
		// снова идёт в источник и занимает слот потолка.
		const failing: RateSource = {
			async fetchRate() {
				return { error: { kind: 'network' } };
			}
		};
		const svcFailing = createRateService({ source: failing, area: fakeSession().area, now: () => now });
		await svcFailing.getRate('USD', 'KZT');
		await svcFailing.getRate('USD', 'KZT');
		await svcFailing.getRate('USD', 'KZT');
		const fourth = await svcFailing.getRate('USD', 'KZT');

		expect(fourth).toEqual({ error: { kind: 'rateLimit' } });
	});

	test('потолок не мешает другой паре', async () => {
		const failing: RateSource = {
			async fetchRate() {
				return { error: { kind: 'network' } };
			}
		};
		const svc = createRateService({ source: failing, area: fakeSession().area, now: () => now });
		await svc.getRate('USD', 'KZT');
		await svc.getRate('USD', 'KZT');
		await svc.getRate('USD', 'KZT');
		const other = await svc.getRate('EUR', 'USD');
		expect(other).toEqual({ error: { kind: 'network' } }); // не rateLimit
	});
});

describe('схлопывание одновременных запросов одной пары (§7)', () => {
	test('два параллельных getRate одной пары — один вызов источника, один ответ обоим', async () => {
		let started = 0;
		const src: RateSource = {
			async fetchRate() {
				started++;
				await new Promise(r => setTimeout(r, 5));
				return { rate: '1.1103', rateDate: '2026-11-06' };
			}
		};
		const svc = createRateService({ source: src, area: fakeSession().area, now: () => now });

		const [a, b] = await Promise.all([svc.getRate('EUR', 'USD'), svc.getRate('EUR', 'USD')]);

		expect(started).toBe(1);
		expect(a).toEqual({ rate: '1.1103' });
		expect(b).toEqual({ rate: '1.1103' });
	});
});

describe('запись курса (§10): value строкой, rateDate факт, fetchedAt срок', () => {
	test('в session лежит запись с тремя полями под ключом пары', async () => {
		const { area, stored } = fakeSession();
		const at = now; // модульное now двигали предыдущие тесты — сравниваем с моментом запроса
		await createRateService({ source: okSource('1.1103'), area, now: () => now }).getRate('EUR', 'USD');

		const record = stored.get('rate:EUR:USD') as { value: string; rateDate: string; fetchedAt: number };
		expect(record.value).toBe('1.1103');
		expect(record.rateDate).toBe('2026-11-06');
		expect(record.fetchedAt).toBe(at);
	});
});

describe('«повторить» идёт мимо кэша (§11)', () => {
	test('fresh: свежая запись в session не отдаётся — источник спрошен снова и запись обновлена', async () => {
		const { area, stored } = fakeSession();
		let value = '1.1000';
		let calls = 0;
		const src: RateSource = {
			async fetchRate() {
				calls++;
				return { rate: value, rateDate: '2026-11-06' };
			}
		};
		const svc = createRateService({ source: src, area, now: () => now });
		expect(await svc.getRate('GBP', 'JPY')).toEqual({ rate: '1.1000' });
		value = '1.2000';
		expect(await svc.getRate('GBP', 'JPY')).toEqual({ rate: '1.1000' }); // из кэша
		expect(await svc.getRate('GBP', 'JPY', { fresh: true })).toEqual({ rate: '1.2000' });
		expect(calls).toBe(2);
		expect((stored.get('rate:GBP:JPY') as { value: string }).value).toBe('1.2000');
	});
});
