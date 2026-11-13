// Парсер читает только текст выделения плюс язык страницы (ADR 0010, 0012).
// Порядок один (план §12): шаг 0 — пробелы; диапазон — отказ; NOISE — вычеркнуть
// пунктуацию; индикаторы — совпадение или отказ; множители; остаток — ровно
// одно число по счёту цифр (ADR 0018); EDGE — хвостовые точки и запятые.

import { isSupported } from '../shared/currencies';
import { isRange, normalizeWhitespace, readNumber } from '../shared/number';

export type ParsedAmount = {
	currency: string; // ISO-код источника
	amount: string; // десятичная строка, точка как десятичный разделитель
	multiplier: number; // 1 | 1000 | 1000000; умножает её shared/money (реестр 31)
};

/** NOISE (§12.3): вычеркнуть всё, кроме букв, цифр, точки, запятой и знаков. */
const NOISE = /[^\p{L}\p{N}\s.,$€£¥₽￥]/gu;

/** EDGE (§12.3): хвостовая точка или запятая не может быть частью числа. */
const EDGE = /[.,]+$/;

const SYMBOL_CURRENCIES: Record<string, string> = {
	$: 'USD',
	'€': 'EUR',
	'£': 'GBP',
	'₽': 'RUB'
};

/** Код на границе: `USD` внутри `USDT` — не наш код (реестр 36). */
function findCodeIndicators(text: string): Array<{ code: string; index: number; length: number }> {
	const found: Array<{ code: string; index: number; length: number }> = [];
	const pattern = /(?<![A-Za-z])([A-Za-z]{3})(?![A-Za-z])/g;
	for (const match of text.matchAll(pattern)) {
		const code = match[1]?.toUpperCase() ?? '';
		if (isSupported(code)) {
			found.push({ code, index: match.index ?? 0, length: match[0].length });
		}
	}
	return found;
}

function findSymbolIndicators(text: string): Array<{ code: string; index: number; length: number }> {
	const found: Array<{ code: string; index: number; length: number }> = [];
	for (const match of text.matchAll(/[$€£¥₽￥]/gu)) {
		const symbol = match[0] ?? '';
		const code =
			symbol in SYMBOL_CURRENCIES ? (SYMBOL_CURRENCIES[symbol] ?? '') : matchPageLanguageCurrency(symbol); // ¥ и ￥
		found.push({ code, index: match.index ?? 0, length: symbol.length });
	}
	return found;
}

/** ¥ и ￥ решает язык страницы: zh* → CNY, ja* → JPY, иначе CNY (ADR 0012). */
let pageLang = '';
function matchPageLanguageCurrency(_symbol: string): string {
	return /^ja/i.test(pageLang) ? 'JPY' : 'CNY';
}

const RU_MULTIPLIERS: Record<string, number> = { тыс: 1000, млн: 1_000_000 };
const LATIN_MULTIPLIERS: Record<string, number> = { k: 1000, m: 1_000_000 };

/**
 * Убирает индикаторы и множители, возвращает остаток. Буквы после этого —
 * отказ: §12.3 требует ровно одну сумму (абзац §12.1 про BUSD предполагал
 * терпимость к чужим буквам и помечен в плане как пересмотренный).
 */
function stripIndicatorsAndMultipliers(
	text: string
): { remainder: string; currency: string | null; multiplier: number } | null {
	const symbols = findSymbolIndicators(text);
	const codes = findCodeIndicators(text);
	const indicators = [...symbols, ...codes].sort((a, b) => a.index - b.index);
	if (indicators.length === 0) return null;

	// Все обозначения обязаны указывать на одну валюту (реестр 36, Б12).
	const first = indicators[0]?.code;
	for (const indicator of indicators) {
		if (indicator.code !== first) return null;
	}

	let multiplier = 1;
	let remainder = text;
	for (let i = indicators.length - 1; i >= 0; i--) {
		const indicator = indicators[i];
		if (!indicator) continue;
		remainder = remainder.slice(0, indicator.index) + remainder.slice(indicator.index + indicator.length);
	}

	// Русские слова-множители стоят где угодно относительно суммы (§12.4).
	remainder = remainder.replace(/(?<![\p{L}])тыс\.?|(?<![\p{L}])млн(?![\p{L}])/gu, word => {
		const key = word.startsWith('тыс') ? 'тыс' : 'млн';
		multiplier = RU_MULTIPLIERS[key] ?? multiplier;
		return ' ';
	});

	// Латинские K/M — только вплотную к цифрам: «M 100» слишком двусмысленно.
	remainder = remainder.replace(/(?<=\d)\s?([KkMm])(?![\p{L}\d])/gu, (word, letter: string) => {
		multiplier = LATIN_MULTIPLIERS[letter.toLowerCase()] ?? multiplier;
		return word.replace(/[KkMm]/, ' ');
	});

	return { remainder, currency: first ?? null, multiplier };
}

export function parseSelection(text: string, lang?: string): ParsedAmount | null {
	pageLang = lang ?? '';

	const normalized = normalizeWhitespace(text);
	if (normalized.length === 0) return null;
	if (isRange(normalized)) return null;

	const stripped = normalized.replace(NOISE, '').replace(EDGE, '');
	const parts = stripIndicatorsAndMultipliers(stripped);
	if (!parts?.currency) return null;

	const amount = readNumber(parts.remainder);
	if (amount === null) return null;

	return { currency: parts.currency, amount, multiplier: parts.multiplier };
}
