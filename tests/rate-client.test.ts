import { describe, expect, test } from 'bun:test';
/** Таймер окна и выдержка «повторить» (план §11): min(2ⁿ, 30) секунд,
 * jitter из [0.5, 1), двойной клик не даёт второго запроса. */

import { cooldownMs, RetryGate } from '../src/shared/rate-client';

describe('cooldownMs — min(2ⁿ, 30) × jitter', () => {
	test('первая неудача — 2 с, рост вдвое, потолок 30 с', () => {
		expect(cooldownMs(1, () => 0.5)).toBe(1500);
		expect(cooldownMs(3, () => 0.5)).toBe(6000);
		expect(cooldownMs(10, () => 0.5)).toBe(22_500);
	});

	test('jitter в [0.5, 1)', () => {
		expect(cooldownMs(1, () => 0)).toBe(1000);
		expect(cooldownMs(1, () => 0.999)).toBeLessThan(2000);
	});
});

describe('RetryGate', () => {
	test('выдержка держит кнопку, потом отпускает', () => {
		const gate = new RetryGate(() => 0.5);
		gate.fail(1000);
		expect(gate.canRetry(1000)).toBe(false);
		expect(gate.canRetry(1000 + 1500)).toBe(true);
	});

	test('begin гасит кнопку сразу: двойной клик не проходит', () => {
		const gate = new RetryGate(() => 0.5);
		expect(gate.begin(0)).toBe(true);
		expect(gate.begin(0)).toBe(false);
	});

	test('успех сбрасывает счётчик и выдержку', () => {
		const gate = new RetryGate(() => 0.5);
		gate.fail(1000);
		gate.succeed();
		expect(gate.failures).toBe(0);
		expect(gate.canRetry(1000)).toBe(true);
	});
});
