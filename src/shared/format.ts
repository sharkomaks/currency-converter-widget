// Печать сумм — только Intl.NumberFormat (реестр 16, план §12б): разделители по
// языку интерфейса, число знаков и место символа по валюте. Один кэшированный
// форматтер на пару «язык + валюта». Локаль передаётся всегда — умолчание взяло
// бы язык браузера (§14).

import type { Lang } from './storage';

const cache = new Map<string, Intl.NumberFormat>();
const amountCache = new Map<string, Intl.NumberFormat>();

function formatter(lang: Lang, currency: string): Intl.NumberFormat {
	const key = `${lang}:${currency}`;
	let nf = cache.get(key);
	if (!nf) {
		nf = new Intl.NumberFormat(lang, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' });
		cache.set(key, nf);
	}
	return nf;
}

/** value — десятичная строка из money.ts; строкой она и уходит в Intl, без float. */
export function formatMoney(value: string, currency: string, lang: Lang): string {
	return formatter(lang, currency).format(value as Intl.StringNumericLiteral);
}

/** Узкий знак валюты: RUB → ₽, USD → $, а не код в англоязычной локали. */
export function currencySymbol(currency: string, lang: Lang): string {
	return (
		formatter(lang, currency)
			.formatToParts(0)
			.find(part => part.type === 'currency')?.value ?? currency
	);
}

/** Знак для колонки пикера: если Intl вернул сам код, показываем ¤. */
export function currencyMark(currency: string, lang: Lang): string {
	const symbol = currencySymbol(currency, lang);
	return symbol === currency ? '¤' : symbol;
}

/**
 * Число без знака валюты: знак в поле результата стоит отдельным элементом.
 * Знаки после запятой те же, что у валюты (JPY — 0, KWD — 3), поэтому
 * печатает Intl, а не своя таблица.
 */
export function formatAmount(value: string, currency: string, lang: Lang): string {
	const digits = formatter(lang, currency).resolvedOptions().maximumFractionDigits ?? 2;
	const key = `${lang}:${currency}`;
	let nf = amountCache.get(key);
	if (!nf) {
		nf = new Intl.NumberFormat(lang, { minimumFractionDigits: digits, maximumFractionDigits: digits });
		amountCache.set(key, nf);
	}
	return nf.format(value as Intl.StringNumericLiteral);
}
