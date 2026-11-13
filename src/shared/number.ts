// Правило числа — одно на весь продукт (план §8, §12.2, ADR 0018): текст на
// странице и поле ввода приложения читаются одной функцией. Арбитр
// разделителя — счёт цифр, валюта в разборе разделителей не участвует.

/** Шаг 0 (С3, С4): любые пробельные символы — к обычному пробелу, серии — в один. */
export function normalizeWhitespace(text: string): string {
	return text.replace(/[\s\u00A0\u202F\u2009\u2007\u2028\u2029]+/gu, ' ').trim();
}

/** Диапазон (Б2): цифра-тире-цифра без пробелов — это не одна сумма. */
export function isRange(text: string): boolean {
	return /\d[\u2013\u2014-]\d/.test(text.replace(/\s+/g, ''));
}

/** Счёт цифр (ADR 0018): возвращает каноническую десятичную строку или null. */
export function readNumber(raw: string): string | null {
	// Пробел вплотную к разделителю — обёртка, не группировка (С4: «12\n.50»).
	let value = raw
		.replace(/\s+([.,])/g, '$1')
		.replace(/([.,])\s+/g, '$1')
		.trim();
	if (value.length === 0) return null;

	// Пробел между цифрами — только группировка по три: «5 10» и
	// «12.50 13.00» — не числа (две суммы / не соглашение).
	if (value.includes(' ')) {
		const groups = value.split(' ');
		const ok = groups.every((group, i) => {
			const digitsOnly = group.replace(/[.,]/g, '');
			if (!/^\d+$/.test(digitsOnly)) return false;
			return i === 0 ? digitsOnly.length <= 3 : digitsOnly.length === 3;
		});
		if (!ok) return null;
	}

	value = value.replace(/\s+/g, '');
	if (!/^\d+([.,]\d+)*$/.test(value)) return null;

	const commaCount = (value.match(/,/g) ?? []).length;
	const dotCount = (value.match(/\./g) ?? []).length;

	let thousands = '';
	let decimal = '';
	if (commaCount > 0 && dotCount > 0) {
		// 1. Оба разделителя — десятичный правый.
		const rightmost = Math.max(value.lastIndexOf(','), value.lastIndexOf('.'));
		decimal = value[rightmost] ?? '';
		thousands = decimal === ',' ? '.' : ',';
	} else if (commaCount > 1 || dotCount > 1) {
		// 2. Повтор одного — все тысячные.
		thousands = commaCount > 1 ? ',' : '.';
	} else if (commaCount === 1 || dotCount === 1) {
		// 3. Один — тысячный при ровно трёх цифрах после него…
		const sep = commaCount === 1 ? ',' : '.';
		const [, after = ''] = value.split(sep);
		const intPart = value.split(sep)[0] ?? '';
		if (after.length === 3) {
			// …но не за ведущим нулём: «0.500» — половина, не пятьсот
			// (реестр §12.2, п. 5 — запись границы правила).
			if (!/^0+$/.test(intPart)) thousands = sep;
		}
		if (!thousands) decimal = sep;
	}

	if (thousands) value = value.split(thousands).join('');
	if (decimal) value = value.replace(decimal, '.');
	return value;
}

export type InputReading = { amount: string } | { reason: 'empty' | 'range' | 'unreadable' };

/**
 * Поле суммы в приложении (§8): то же правило разделителей, что на странице.
 * Невалидный ввод называет причину — диапазон или нечитаемое число, — а не
 * «невалидное значение».
 */
export function readInputAmount(text: string): InputReading {
	const normalized = normalizeWhitespace(text);
	if (normalized.length === 0) return { reason: 'empty' };
	if (isRange(normalized)) return { reason: 'range' };
	const amount = readNumber(normalized.replace(/[.,]+$/, ''));
	return amount === null ? { reason: 'unreadable' } : { amount };
}
