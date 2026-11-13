// Данные пикера (план §8, §14, реестр 24): названия из Intl.DisplayNames, порядок
// по Intl.Collator, поиск по коду и по названию — всё на языке настройки.
// Локаль передаётся всегда: умолчания Intl взяли бы язык браузера (С11).

import { CURRENCY_CODES } from './currencies';
import { currencyMark } from './format';
import type { Lang } from './storage';

export type CurrencyRow = { code: string; mark: string; name: string };

const rowsCache = new Map<Lang, CurrencyRow[]>();

export function currencyName(code: string, lang: Lang): string {
	return new Intl.DisplayNames(lang, { type: 'currency', style: 'long' }).of(code) ?? code;
}

/** Все валюты в порядке названий на lang. Пересобирается при смене языка целиком. */
export function currencyRows(lang: Lang): CurrencyRow[] {
	let rows = rowsCache.get(lang);
	if (!rows) {
		const names = new Intl.DisplayNames(lang, { type: 'currency', style: 'long' });
		const collator = new Intl.Collator(lang, { sensitivity: 'base' });
		rows = CURRENCY_CODES.map(code => ({ code, mark: currencyMark(code, lang), name: names.of(code) ?? code }));
		rows.sort((a, b) => collator.compare(a.name, b.name) || collator.compare(a.code, b.code));
		rowsCache.set(lang, rows);
	}
	return rows;
}

function fold(text: string, lang: Lang): string {
	// ё/е и регистр — без различий; диакритика тоже (сравнение «по основе»).
	return text.toLocaleLowerCase(lang).normalize('NFD').replace(/\p{M}/gu, '').replace(/ё/g, 'е');
}

/**
 * Поиск по коду и по названию: начало кода, начало названия или начало любого
 * слова в нём. Точное совпадение кода — первой строкой, остальное в порядке имён.
 */
export function searchCurrencies(query: string, lang: Lang): CurrencyRow[] {
	const rows = currencyRows(lang);
	const q = fold(query.trim(), lang);
	if (q.length === 0) return rows;
	const exact: CurrencyRow[] = [];
	const rest: CurrencyRow[] = [];
	for (const row of rows) {
		const code = row.code.toLowerCase();
		if (code === q) {
			exact.push(row);
			continue;
		}
		const name = fold(row.name, lang);
		const words = name.split(/[\s\-–—()]+/);
		if (code.startsWith(q) || name.startsWith(q) || words.some(w => w.startsWith(q))) rest.push(row);
	}
	return [...exact, ...rest];
}
