import { describe, expect, test } from 'bun:test';
/** Пара валют приложения живёт в session: переключать её на каждом открытии
 * попапа утомительно, а после перезапуска браузера дефолт возвращается сам. */

import { loadPair, readPair, savePair, type SessionArea } from '../src/shared/session';

function fakeArea(initial: unknown): { area: SessionArea; stored: Map<string, unknown> } {
	const stored = new Map<string, unknown>();
	if (initial !== undefined) stored.set('app:pair', initial);
	return {
		stored,
		area: {
			async get(key) {
				return stored.get(key);
			},
			async set(key, value) {
				stored.set(key, value);
			}
		}
	};
}

describe('readPair — только два известных кода', () => {
	test('валидная пара проходит', () => {
		expect(readPair({ from: 'EUR', to: 'RUB' })).toEqual({ from: 'EUR', to: 'RUB' });
	});

	test('чужая валюта, не объект и дыры — отказ', () => {
		expect(readPair({ from: 'EUR', to: 'ZZZ' })).toBeNull();
		expect(readPair({ from: 'EUR' })).toBeNull();
		expect(readPair('EUR:RUB')).toBeNull();
		expect(readPair(null)).toBeNull();
	});
});

describe('loadPair / savePair', () => {
	test('пустая сессия даёт дефолт, сохранённая — свою пару', async () => {
		const { area } = fakeArea(undefined);
		expect(await loadPair(area, { from: 'USD', to: 'EUR' })).toEqual({ from: 'USD', to: 'EUR' });
		await savePair(area, { from: 'GBP', to: 'JPY' });
		expect(await loadPair(area, { from: 'USD', to: 'EUR' })).toEqual({ from: 'GBP', to: 'JPY' });
	});

	test('испорченная запись не ломает пикер — берётся дефолт', async () => {
		const { area } = fakeArea({ from: 'GBP', to: 'ZZZ' });
		expect(await loadPair(area, { from: 'USD', to: 'EUR' })).toEqual({ from: 'USD', to: 'EUR' });
	});

	test('невалидную пару не пишем', async () => {
		const { area, stored } = fakeArea(undefined);
		await savePair(area, { from: 'GBP', to: 'ZZZ' });
		expect(stored.has('app:pair')).toBe(false);
	});
});
