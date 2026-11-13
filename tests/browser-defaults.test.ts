import { describe, expect, test } from 'bun:test';
/** Дефолты онбординга: язык браузера один раз, регион — таблицей, а цель
 * следует языку, пока человек не выбрал её руками. */

import { defaultCurrencyForLang, targetAfterLanguageChange } from '../src/shared/browser-defaults';

describe('валюта по языку', () => {
	test('ru → RUB, en → USD', () => {
		expect(defaultCurrencyForLang('ru')).toBe('RUB');
		expect(defaultCurrencyForLang('en')).toBe('USD');
	});
});

describe('смена языка в онбординге', () => {
	test('en/USD → ru становится RUB, если цель не трогали', () => {
		expect(
			targetAfterLanguageChange({
				currentTarget: 'USD',
				previousLang: 'en',
				nextLang: 'ru',
				targetTouched: false,
				onboarded: false
			})
		).toBe('RUB');
	});

	test('ru/RUB → en становится USD', () => {
		expect(
			targetAfterLanguageChange({
				currentTarget: 'RUB',
				previousLang: 'ru',
				nextLang: 'en',
				targetTouched: false,
				onboarded: false
			})
		).toBe('USD');
	});

	test('регионная цель не перетирается: KZT остаётся', () => {
		expect(
			targetAfterLanguageChange({
				currentTarget: 'KZT',
				previousLang: 'en',
				nextLang: 'ru',
				targetTouched: false,
				onboarded: false
			})
		).toBe('KZT');
	});

	test('ручной выбор сильнее языка', () => {
		expect(
			targetAfterLanguageChange({
				currentTarget: 'USD',
				previousLang: 'en',
				nextLang: 'ru',
				targetTouched: true,
				onboarded: false
			})
		).toBe('USD');
	});

	test('пройденный онбординг цель не меняет', () => {
		expect(
			targetAfterLanguageChange({
				currentTarget: 'USD',
				previousLang: 'en',
				nextLang: 'ru',
				targetTouched: false,
				onboarded: true
			})
		).toBe('USD');
	});
});
