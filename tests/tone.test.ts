import { describe, expect, test } from 'bun:test';
/** Тема окна (план §13, ADR 0014): объявление страницы → её фон по яркости →
 * тема расширения. Проверяются чистые ступени; DOM-обход — в resolvePageTheme. */

import { resolveOverlayTheme, themeFromBackground, themeFromColorScheme, themeFromTokens } from '../src/shared/tone';

function fakeElement(classes: string[], attrs: Record<string, string> = {}): Element {
	return {
		classList: classes,
		getAttribute: (name: string) => attrs[name] ?? null
	} as unknown as Element;
}

describe('объявление страницы', () => {
	test('color-scheme: первый знакомый токен', () => {
		expect(themeFromColorScheme('dark')).toBe('dark');
		expect(themeFromColorScheme('light dark')).toBe('light');
		expect(themeFromColorScheme('only light')).toBe('light');
		expect(themeFromColorScheme('normal')).toBeNull();
	});

	test('классы и data-атрибуты — целыми токенами, не подстрокой', () => {
		expect(themeFromTokens(fakeElement(['darkroom']))).toBeNull();
		expect(themeFromTokens(fakeElement(['lightbox']))).toBeNull();
		expect(themeFromTokens(fakeElement(['night']))).toBe('dark');
		expect(themeFromTokens(fakeElement([], { 'data-theme': 'light' }))).toBe('light');
		expect(themeFromTokens(fakeElement([], { 'data-bs-theme': 'dark' }))).toBe('dark');
	});
});

describe('фон страницы по яркости WCAG', () => {
	test('белый — светлая, чёрный — тёмная', () => {
		expect(themeFromBackground('rgb(255, 255, 255)')).toBe('light');
		expect(themeFromBackground('rgb(0, 0, 0)')).toBe('dark');
		expect(themeFromBackground('#fff')).toBe('light');
		expect(themeFromBackground('#141a22')).toBe('dark');
	});

	test('прозрачный фон не считается', () => {
		expect(themeFromBackground('rgba(0, 0, 0, 0)')).toBeNull();
		expect(themeFromBackground('transparent')).toBeNull();
	});
});

describe('итоговая тема окна', () => {
	test('явная настройка сильнее страницы', () => {
		expect(resolveOverlayTheme('light', 'dark', 'dark')).toBe('light');
		expect(resolveOverlayTheme('dark', 'light', 'light')).toBe('dark');
	});

	test('auto: страница, затем тема расширения', () => {
		expect(resolveOverlayTheme('auto', 'dark', 'light')).toBe('light');
		expect(resolveOverlayTheme('auto', 'light', null)).toBe('light');
	});
});
