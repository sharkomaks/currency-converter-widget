// Roboto — локально, без запросов к Google Fonts: шрифт лежит в сборке и
// подключается теми же @font-face, что и остальной продукт. Латиница и
// кириллица — два файла из @fontsource-variable/roboto; вес переменный.
// На чужой странице файл отдаётся через web_accessible_resources, а если
// CSP страницы запрещает шрифты — остаётся системный запасной.

import { extensionApi } from './webext';

export const FONT_STACK = "Roboto, 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif";

const LATIN =
	'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const CYRILLIC = 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116';

function face(file: string, range: string): string {
	const url = extensionApi().runtime.getURL(`fonts/${file}`);
	return `@font-face{font-family:Roboto;font-style:normal;font-display:swap;font-weight:100 900;src:url("${url}") format("woff2");unicode-range:${range};}`;
}

/** @font-face для ShadowRoot: стили окна и пикера живут отдельно от страницы. */
export function fontFaceCss(): string {
	return face('roboto-latin.woff2', LATIN) + face('roboto-cyrillic.woff2', CYRILLIC);
}
