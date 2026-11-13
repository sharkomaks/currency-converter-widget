// Сторона окна у запроса курса (план §11): таймер 8 с ставит тот, кто ждёт;
// «повторить» идёт мимо кэша; после n-й неудачи кнопка гаснет на
// min(2ⁿ, 30) секунд × jitter из [0.5, 1). Чистые части — без chrome.*.

import type { RateResult } from '../background/rate';
import { extensionApi } from './webext';

export const TIMEOUT_MS = 8_000;

export type GetRateMessage = { type: 'getRate'; from: string; to: string; fresh?: boolean };

export type Send = (message: GetRateMessage) => Promise<unknown>;

const chromeSend: Send = message => extensionApi().runtime.sendMessage(message);

function isRateResult(value: unknown): value is RateResult {
	if (typeof value !== 'object' || value === null) return false;
	return typeof (value as { rate?: unknown }).rate === 'string' || 'error' in value;
}

/** Курс через фон с таймером окна. Умерший канал кончается тем же таймером (С9). */
export function requestRate(
	from: string,
	to: string,
	opts: { fresh?: boolean; send?: Send; timeoutMs?: number } = {}
): Promise<RateResult> {
	const { fresh = false, send = chromeSend, timeoutMs = TIMEOUT_MS } = opts;
	return new Promise(resolve => {
		const timer = setTimeout(() => resolve({ error: { kind: 'timeout' } }), timeoutMs);
		const finish = (result: RateResult): void => {
			clearTimeout(timer);
			resolve(result);
		};
		const message: GetRateMessage = fresh ? { type: 'getRate', from, to, fresh } : { type: 'getRate', from, to };
		send(message).then(
			answer => {
				// Пустой ответ — фон не дослушал (выгружен): ждём таймер, второго не заводим.
				if (isRateResult(answer)) finish(answer);
			},
			() => finish({ error: { kind: 'network' } })
		);
	});
}

/** Выдержка после n-й неудачи: min(2ⁿ, 30) с, умноженное на jitter из [0.5, 1). */
export function cooldownMs(failures: number, random: () => number = Math.random): number {
	if (failures <= 0) return 0;
	return Math.min(2 ** failures, 30) * 1000 * (0.5 + random() * 0.5);
}

/**
 * Состояние кнопки «повторить»: счётчик неудач и момент, до которого она погашена.
 * Живёт вместе с окном — новое выделение получает новый gate (§11).
 */
export class RetryGate {
	failures = 0;
	private until = 0;
	inFlight = false;

	constructor(private readonly random: () => number = Math.random) {}

	fail(now: number): void {
		this.failures += 1;
		this.inFlight = false;
		this.until = now + cooldownMs(this.failures, this.random);
	}

	succeed(): void {
		this.failures = 0;
		this.inFlight = false;
		this.until = 0;
	}

	/** Секунд до конца выдержки, вверх до целого; 0 — можно жать. */
	secondsLeft(now: number): number {
		return Math.max(0, Math.ceil((this.until - now) / 1000));
	}

	canRetry(now: number): boolean {
		return !this.inFlight && this.secondsLeft(now) === 0;
	}

	/** Пускает повтор и сразу гасит кнопку: двойной клик не даёт второго запроса. */
	begin(now: number): boolean {
		if (!this.canRetry(now)) return false;
		this.inFlight = true;
		return true;
	}
}
