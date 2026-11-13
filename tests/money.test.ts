import { describe, expect, test } from 'bun:test';
/** Деньги и правило числа (план §7, §8, §12.2, критерий 14 и 20): формула
 * только «сумма × rate», знаки из Intl, половина вверх, Big.strict. */

import Big from 'big.js';

import { currencyMark, currencySymbol, formatAmount } from '../src/shared/format';
import { convert, fractionDigits } from '../src/shared/money';
import { readInputAmount } from '../src/shared/number';

describe('convert — одна формула, знаки из Intl', () => {
	test('USD: два знака, половина вверх', () => {
		expect(convert('12.50', '1.1103', 'USD')).toBe('13.88');
	});

	test('JPY без знаков, USD → JPY умножением', () => {
		expect(fractionDigits('JPY')).toBe(0);
		expect(convert('10', '150', 'JPY')).toBe('1500');
	});

	test('KWD: три знака', () => {
		expect(fractionDigits('KWD')).toBe(3);
		expect(convert('1.2345', '1', 'KWD')).toBe('1.235');
	});

	test('1.005 округляется половиной вверх до 1.01', () => {
		expect(convert('1.005', '1', 'USD')).toBe('1.01');
	});

	test('множитель — часть той же формулы', () => {
		expect(convert('5', '2', 'USD', 1_000_000)).toBe('10000000.00');
	});
});

describe('поле результата: знак отдельно, число отдельно', () => {
	test('знаки валюты', () => {
		expect(currencySymbol('RUB', 'ru')).toBe('₽');
		expect(currencySymbol('RUB', 'en')).toBe('₽');
		expect(currencySymbol('USD', 'en')).toBe('$');
		expect(currencyMark('CHF', 'en')).toBe('¤');
	});

	test('число без знака сохраняет знаки валюты', () => {
		expect(formatAmount('16.1', 'USD', 'en')).toBe('16.10');
		expect(formatAmount('1035', 'RUB', 'ru')).toBe('1\u00a0035,00');
		expect(formatAmount('1500', 'JPY', 'en')).toBe('1,500');
		expect(formatAmount('1.235', 'KWD', 'en')).toBe('1.235');
	});
});

describe('Big.strict — число с плавающей точкой не проходит', () => {
	test('new Big(0.1) падает в строгом режиме', () => {
		expect(() => new Big(0.1)).toThrow();
	});
});

describe('поле ввода приложения — то же правило разделителей (критерий 20)', () => {
	test.each([
		['12,50', '12.50'],
		['12.50', '12.50'],
		['1.234', '1234'],
		['1,234', '1234'],
		['1 234', '1234'],
		['87 129.32', '87129.32'],
		['1 234,56', '1234.56'],
		['1 234.567', '1234.567'],
		['1,00,000', '100000']
	])('%s → %s', (input, amount) => {
		const reading = readInputAmount(input);
		expect('amount' in reading ? reading.amount : null).toBe(amount);
	});

	test('пусто, диапазон и буквы называют причину', () => {
		expect(readInputAmount('')).toEqual({ reason: 'empty' });
		expect(readInputAmount('12.50-13.00')).toEqual({ reason: 'range' });
		expect(readInputAmount('abc')).toEqual({ reason: 'unreadable' });
	});
});
