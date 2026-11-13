import { describe, expect, test } from 'bun:test';
/** Шесть классов ошибки и кнопка, которая помогает (план §11, критерий 5).
 * Тексты — шаблоны словаря, а не склейки в коде; у 4xx повтора нет. */

import type { RateError } from '../src/background/rate';
import { describeError } from '../src/shared/errors';

function view(error: RateError) {
	return describeError(error, 'USD', 'KZT');
}

describe('шесть классов — заголовок, деталь, действие', () => {
	test('нет сети: повтор', () => {
		const v = view({ kind: 'network' });
		expect(v.title).toBe('No connection');
		expect(v.detail).toContain('USD → KZT');
		expect(v.action).toBe('retry');
	});

	test('таймаут: повтор', () => {
		const v = view({ kind: 'timeout' });
		expect(v.title).toBe("The server didn't answer");
		expect(v.action).toBe('retry');
	});

	test('429: повтор со статусом в детали', () => {
		const v = view({ kind: 'tooMany', status: 429 });
		expect(v.title).toBe('Too many requests');
		expect(v.detail).toContain('429');
		expect(v.action).toBe('retry');
	});

	test('5xx: повтор со статусом', () => {
		const v = view({ kind: 'server', status: 503 });
		expect(v.title).toBe('The rate service is down');
		expect(v.detail).toContain('503');
		expect(v.action).toBe('retry');
	});

	test('4xx: «другая валюта», повтора нет', () => {
		const v = view({ kind: 'noRate', status: 404 });
		expect(v.title).toBe('No rate for this pair');
		expect(v.detail).toContain('404');
		expect(v.action).toBe('otherCurrency');
	});

	test('2xx без rate: повтор', () => {
		const v = view({ kind: 'unparseable', status: 200 });
		expect(v.title).toBe("Couldn't read the answer");
		expect(v.detail).toContain('200');
		expect(v.action).toBe('retry');
	});

	test('свой потолок частоты показывается тем же классом 429, но со своей деталью', () => {
		const v = view({ kind: 'rateLimit' });
		expect(v.title).toBe('Too many requests');
		expect(v.detail).toContain('USD → KZT');
		expect(v.action).toBe('retry');
	});
});
