// Единственное место арифметики над суммами (план §7, реестр 30–31, ADR 0001).
// Сумма и курс входят строками, Big.strict не пускает число с плавающей точкой.
// Формула всегда одна — сумма × rate(источник → цель), деления нет; округление
// до знаков валюты, половиной вверх. Число знаков даёт Intl, не своя таблица.

import Big from 'big.js';

Big.strict = true;
Big.RM = Big.roundHalfUp;

const digitsCache = new Map<string, number>();

/** Число знаков после запятой у валюты — из Intl (JPY → 0, KWD → 3). */
export function fractionDigits(currency: string): number {
	let digits = digitsCache.get(currency);
	if (digits === undefined) {
		// Локаль здесь ни на что не влияет: знаки задаёт валюта, а не язык.
		digits =
			new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
		digitsCache.set(currency, digits);
	}
	return digits;
}

/**
 * amount × multiplier × rate, округлённое до знаков целевой валюты. Возвращает
 * десятичную строку с точкой — её печатает format.ts через Intl, не здесь.
 */
export function convert(amount: string, rate: string, to: string, multiplier: number = 1): string {
	const digits = fractionDigits(to);
	return new Big(amount)
		.times(new Big(String(multiplier)))
		.times(new Big(rate))
		.round(digits)
		.toFixed(digits);
}
