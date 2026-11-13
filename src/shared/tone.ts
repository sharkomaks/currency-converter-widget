// Тема окна (план §13, ADR 0014). Ступени: объявление страницы → первый
// непрозрачный фон html/body по яркости WCAG → тема расширения. Краска под
// выделением не читается никогда. Чистые части отделены от DOM и тестируются.

import type { OverlayTheme, Theme } from './storage';

export type ThemeChoice = 'light' | 'dark';

const DARK_TOKENS: Record<string, true> = {
	dark: true,
	'dark-mode': true,
	'theme-dark': true,
	'is-dark': true,
	night: true
};
const LIGHT_TOKENS: Record<string, true> = {
	light: true,
	'light-mode': true,
	'theme-light': true
};
const THEME_ATTRS = ['data-theme', 'data-bs-theme', 'data-color-mode'] as const;

/** `color-scheme` объявляет предпочтение первым знакомым токеном. */
export function themeFromColorScheme(value: string): ThemeChoice | null {
	for (const token of value.toLowerCase().split(/[\s,]+/)) {
		if (token === 'dark') return 'dark';
		if (token === 'light') return 'light';
	}
	return null;
}

/**
 * Целые классы и значения атрибутов, не подстроки: `darkroom` и `lightbox`
 * темой не считаются. Первое найденное объявление побеждает.
 */
export function themeFromTokens(element: Element): ThemeChoice | null {
	for (const token of element.classList) {
		if (token in DARK_TOKENS) return 'dark';
		if (token in LIGHT_TOKENS) return 'light';
	}
	for (const name of THEME_ATTRS) {
		const value = element.getAttribute(name);
		if (value === 'dark' || value === 'light') return value;
	}
	return null;
}

type Rgba = { r: number; g: number; b: number; a: number };

function parseColor(value: string): Rgba | null {
	const text = value.trim().toLowerCase();
	const rgb = /^rgba?\(([^)]+)\)$/.exec(text);
	if (rgb?.[1]) {
		const parts = rgb[1]
			.split(/[\s,/]+/)
			.filter(Boolean)
			.map(Number);
		const [r, g, b, a = 1] = parts;
		if ([r, g, b, a].every(n => Number.isFinite(n))) {
			return { r: r ?? 0, g: g ?? 0, b: b ?? 0, a };
		}
	}
	const hex = /^#([0-9a-f]{3,8})$/i.exec(text);
	if (hex?.[1]) {
		const digits = hex[1];
		const expand = (s: string): number => parseInt(s.length === 1 ? s + s : s, 16);
		if (digits.length === 3 || digits.length === 4) {
			return {
				r: expand(digits[0] ?? '0'),
				g: expand(digits[1] ?? '0'),
				b: expand(digits[2] ?? '0'),
				a: digits.length === 4 ? expand(digits[3] ?? 'f') / 255 : 1
			};
		}
		if (digits.length === 6 || digits.length === 8) {
			return {
				r: expand(digits.slice(0, 2)),
				g: expand(digits.slice(2, 4)),
				b: expand(digits.slice(4, 6)),
				a: digits.length === 8 ? expand(digits.slice(6, 8)) / 255 : 1
			};
		}
	}
	return null;
}

function linear(channel: number): number {
	const c = channel / 255;
	return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Относительная яркость WCAG. */
export function relativeLuminance(color: Rgba): number {
	return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
}

/** Первый непрозрачный фон: темнее 0,5 — тёмная тема, светлее — светлая. */
export function themeFromBackground(value: string): ThemeChoice | null {
	const color = parseColor(value);
	if (!color || color.a === 0) return null;
	return relativeLuminance(color) < 0.5 ? 'dark' : 'light';
}

/** Что страница сказала о себе на уровне страницы. null — молчит. */
export function resolvePageTheme(doc: Document): ThemeChoice | null {
	const html = doc.documentElement;
	const scheme = doc.defaultView?.getComputedStyle(html).colorScheme;
	const declared = scheme ? themeFromColorScheme(scheme) : null;
	if (declared) return declared;

	const onHtml = themeFromTokens(html);
	if (onHtml) return onHtml;

	const body = doc.body;
	if (body) {
		const onBody = themeFromTokens(body);
		if (onBody) return onBody;
	}

	for (const element of [html, body]) {
		if (!element) continue;
		const paint = doc.defaultView?.getComputedStyle(element).backgroundColor;
		const byPaint = paint ? themeFromBackground(paint) : null;
		if (byPaint) return byPaint;
	}
	return null;
}

/** Итоговая тема окна: настройка сильнее страницы, авто — лестница §13. */
export function resolveOverlayTheme(
	setting: OverlayTheme,
	extensionTheme: Theme,
	pageTheme: ThemeChoice | null
): ThemeChoice {
	if (setting === 'light' || setting === 'dark') return setting;
	return pageTheme ?? extensionTheme;
}
