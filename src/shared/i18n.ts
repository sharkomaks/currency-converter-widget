// Один источник языка — настройка `lang` (план §14, ADR 0008). Словари
// импортируются на сборке, chrome.i18n.getMessage не используется: он берёт
// язык браузера и настройку не видит. `t` отдаёт язык настройки всегда; локаль
// в Intl-конструкторы передаётся аргументом — умолчания берут язык браузера.

import en from '../../_locales/en/messages.json';
import ru from '../../_locales/ru/messages.json';
import type { Lang } from './storage';

type Messages = Record<string, { message: string }>;

const DICTS: Record<Lang, Messages> = { en, ru };

let current: Lang = 'en';

export function setLang(lang: Lang): void {
	current = lang;
}

export function currentLang(): Lang {
	return current;
}

/**
 * Перевод с подстановкой `{имя}`. Отсутствующий ключ не валит рантайм:
 * выводится своим именем (М9), а паритет ключей ловит проверка на сборке.
 */
export function t(key: string, params?: Record<string, string>): string {
	// Ключи в messages.json — только ASCII [a-z A-Z 0-9 _] (требование Chrome),
	// поэтому точки в коде отображаются в подчёркивания. Наружу ключ выходит
	// в том виде, в каком его написал вызывающий (М9).
	const name = key.replaceAll('.', '_');
	const message = DICTS[current][name]?.message ?? DICTS.en[name]?.message;
	if (message === undefined) return key;
	return message.replace(/\{(\w+)\}/g, (whole, param: string) => params?.[param] ?? whole);
}

const pluralCache = new Map<Lang, Intl.PluralRules>();

/**
 * Формы по числу (С2, §14): ключ на каждую форму (`base.one`, `base.few`,
 * `base.many`, `base.other`), форму выбирает Intl.PluralRules нашего языка —
 * локаль передаётся всегда, умолчание взяло бы язык браузера. Число в
 * подстановке печатает Intl.NumberFormat того же языка.
 */
export function tn(base: string, n: number): string {
	let rules = pluralCache.get(current);
	if (!rules) {
		rules = new Intl.PluralRules(current);
		pluralCache.set(current, rules);
	}
	return t(`${base}.${rules.select(n)}`, { n: new Intl.NumberFormat(current).format(n) });
}
