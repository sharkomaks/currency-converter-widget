// Дефолты онбординга (план §9, реестр 14): язык и тема из браузера один раз,
// валюта — по региону статической таблицей. После онбординга язык браузера не
// читается нигде; эта функция вызывается только для непройденного онбординга.

import { isSupported } from './currencies';
import type { Lang, Theme } from './storage';

const REGION_CURRENCY: Record<string, string> = {
	AE: 'AED',
	AL: 'ALL',
	AM: 'AMD',
	AR: 'ARS',
	AT: 'EUR',
	AU: 'AUD',
	AZ: 'AZN',
	BA: 'BAM',
	BD: 'BDT',
	BE: 'EUR',
	BG: 'EUR',
	BH: 'BHD',
	BR: 'BRL',
	BY: 'BYN',
	CA: 'CAD',
	CH: 'CHF',
	CL: 'CLP',
	CN: 'CNY',
	CO: 'COP',
	CR: 'CRC',
	CZ: 'CZK',
	DE: 'EUR',
	DK: 'DKK',
	DZ: 'DZD',
	EE: 'EUR',
	EG: 'EGP',
	ES: 'EUR',
	FI: 'EUR',
	FR: 'EUR',
	GB: 'GBP',
	GE: 'GEL',
	GH: 'GHS',
	GR: 'EUR',
	HK: 'HKD',
	HR: 'EUR',
	HU: 'HUF',
	ID: 'IDR',
	IE: 'EUR',
	IL: 'ILS',
	IN: 'INR',
	IS: 'ISK',
	IT: 'EUR',
	JP: 'JPY',
	KE: 'KES',
	KG: 'KGS',
	KR: 'KRW',
	KW: 'KWD',
	KZ: 'KZT',
	LK: 'LKR',
	LT: 'EUR',
	LU: 'EUR',
	LV: 'EUR',
	MA: 'MAD',
	MD: 'MDL',
	MK: 'MKD',
	MX: 'MXN',
	MY: 'MYR',
	NG: 'NGN',
	NL: 'EUR',
	NO: 'NOK',
	NP: 'NPR',
	NZ: 'NZD',
	OM: 'OMR',
	PE: 'PEN',
	PH: 'PHP',
	PK: 'PKR',
	PL: 'PLN',
	PT: 'EUR',
	QA: 'QAR',
	RO: 'RON',
	RS: 'RSD',
	RU: 'RUB',
	SA: 'SAR',
	SE: 'SEK',
	SG: 'SGD',
	SI: 'EUR',
	SK: 'EUR',
	TH: 'THB',
	TJ: 'TJS',
	TM: 'TMT',
	TN: 'TND',
	TR: 'TRY',
	TW: 'TWD',
	UA: 'UAH',
	US: 'USD',
	UY: 'UYU',
	UZ: 'UZS',
	VN: 'VND',
	ZA: 'ZAR'
};

export type BrowserDefaults = { lang: Lang; theme: Theme; targetCurrency: string };

/** Валюта по языку, когда регион ничего не дал: ru → RUB, иначе USD. */
export function defaultCurrencyForLang(lang: Lang): string {
	return lang === 'ru' ? 'RUB' : 'USD';
}

/**
 * Валюта после смены языка в онбординге. Пока человек не выбрал цель руками и
 * онбординг ещё не пройден, дефолт следует языку: en/USD → ru/RUB и обратно.
 * Регионная цель (KZT, EUR) и ручной выбор не перетираются.
 */
export function targetAfterLanguageChange(args: {
	currentTarget: string;
	previousLang: Lang;
	nextLang: Lang;
	targetTouched: boolean;
	onboarded: boolean;
}): string {
	if (args.onboarded || args.targetTouched) return args.currentTarget;
	if (args.currentTarget !== defaultCurrencyForLang(args.previousLang)) return args.currentTarget;
	return defaultCurrencyForLang(args.nextLang);
}

/** Один вызов на непройденный онбординг; больше язык браузера не читается. */
export function browserDefaults(): BrowserDefaults {
	const tag = navigator.language;
	const lang: Lang = /^ru\b/i.test(tag) ? 'ru' : 'en';
	const theme: Theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
	let region: string | undefined;
	try {
		region = new Intl.Locale(tag).region;
	} catch {
		region = undefined;
	}
	const candidate = region ? REGION_CURRENCY[region.toUpperCase()] : undefined;
	return {
		lang,
		theme,
		targetCurrency: candidate && isSupported(candidate) ? candidate : defaultCurrencyForLang(lang)
	};
}
