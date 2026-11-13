// Пикер валют — один компонент на все поверхности (план §8, §14, реестр 24,
// критерий 11–12). Сверху поиск, ниже строка «знак · код · название»; поиск
// идёт по коду и названию на языке настройки, локаль в Intl передаётся всегда.
// Панель живёт в ShadowRoot: её вид не зависит от CSS страницы, на которой
// пикер открыт (приложение, настройки, онбординг).

import { currencyRows, currencyName, searchCurrencies, type CurrencyRow } from './currency-names';
import { fontFaceCss } from './fonts';
import { currencyMark } from './format';
import { setLang, t, tn } from './i18n';
import type { Lang, Theme } from './storage';

export type PickerOptions = {
	lang: Lang;
	theme: Theme;
	selected: string;
	label: string;
	onChange: (code: string) => void;
};

export type PickerHandle = {
	button: HTMLButtonElement;
	open(): void;
	close(): void;
	setLang(lang: Lang): void;
	setTheme(theme: Theme): void;
	setSelected(code: string): void;
	selected(): string;
};

const STYLE = `
:host {
	--surface: #ffffff;
	--surface-2: #eef1f5;
	--ink: #0f1720;
	--muted: #667085;
	--line: #e4e7ec;
	--accent: #2e5eaa;
	--accent-soft: #e9effa;
	--shadow: 0 24px 60px rgb(16 24 40 / 0.22);
	position: fixed;
	inset: 0;
	z-index: 2147483646;
	display: flex;
	padding: 18px 14px;
	background: rgb(15 23 32 / 0.32);
	color: var(--ink);
	font: 14px/1.45 Roboto, 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif;
}
:host([hidden]) { display: none; }
:host([data-theme='dark']) {
	--surface: #151c24;
	--surface-2: #1b2430;
	--ink: #edf1f6;
	--muted: #95a1b0;
	--line: #24303c;
	--accent: #8db4f7;
	--accent-soft: #1a2a42;
	--shadow: 0 24px 60px rgb(0 0 0 / 0.55);
	background: rgb(0 0 0 / 0.48);
}
* { box-sizing: border-box; }
.dialog {
	margin: auto;
	width: min(420px, 100%);
	/* Фиксированная высота: список результатов не должен двигать диалог. */
	height: min(560px, calc(100vh - 36px));
	display: flex;
	flex-direction: column;
	overflow: hidden;
	background: var(--surface);
	border: 1px solid var(--line);
	border-radius: 18px;
	box-shadow: var(--shadow);
}
.head { display: flex; gap: 8px; padding: 12px 12px 8px; }
.search {
	flex: 1;
	min-width: 0;
	height: 38px;
	padding: 0 12px;
	font: inherit;
	color: var(--ink);
	background: var(--surface-2);
	border: 1px solid transparent;
	border-radius: 12px;
	outline: none;
}
.search::placeholder { color: var(--muted); }
.search::-webkit-search-cancel-button { display: none; }
.search:focus {
	border-color: var(--accent);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}
.close {
	flex: none;
	width: 38px;
	height: 38px;
	font: inherit;
	font-size: 18px;
	color: var(--muted);
	background: var(--surface-2);
	border: 0;
	border-radius: 12px;
	cursor: pointer;
}
.close:hover { color: var(--ink); }
.count { padding: 2px 14px 8px; color: var(--muted); font-size: 11.5px; }
.list {
	flex: 1;
	margin: 0;
	padding: 0 6px 10px;
	list-style: none;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--line) transparent;
}
.list::-webkit-scrollbar { width: 8px; }
.list::-webkit-scrollbar-track { background: transparent; }
.list::-webkit-scrollbar-thumb { background: var(--line); border-radius: 999px; }
.list::-webkit-scrollbar-button { display: none; }
.row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 10px;
	border-radius: 10px;
	cursor: pointer;
}
.row.active { background: var(--surface-2); }
.row[aria-selected='true'] { background: var(--accent-soft); }
.row .mark { flex: none; min-width: 1.7em; text-align: center; }
.row .code {
	flex: none;
	width: 3.4ch;
	font-weight: 500;
	font-variant-numeric: tabular-nums;
	letter-spacing: 0.02em;
}
.row .name {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	color: var(--muted);
	font-size: 13px;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.empty { padding: 14px 10px; color: var(--muted); }
:is(.search, .close):focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.search:focus-visible { outline: none; }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	if (className) node.className = className;
	return node;
}

let pickerCount = 0;

export function createPicker(options: PickerOptions): PickerHandle {
	let lang = options.lang;
	let theme = options.theme;
	let selectedCode = options.selected;
	let rows: CurrencyRow[] = [];
	let active = 0;
	let open = false;
	let previousOverflow = '';
	const instance = ++pickerCount;

	const host = el('div');
	host.dataset.ccwPicker = '';
	host.dataset.theme = theme;
	host.hidden = true;
	const shadow = host.attachShadow({ mode: 'open' });
	const sheet = new CSSStyleSheet();
	let css = STYLE;
	try {
		css += fontFaceCss();
	} catch {
		// Пикер работает и на системном шрифте.
	}
	sheet.replaceSync(css);
	shadow.adoptedStyleSheets = [sheet];

	const dialog = el('div', 'dialog');
	dialog.setAttribute('role', 'dialog');
	dialog.setAttribute('aria-modal', 'true');
	dialog.setAttribute('aria-label', options.label);

	const head = el('div', 'head');
	const search = el('input', 'search');
	search.type = 'search';
	search.placeholder = t('picker.search');
	search.setAttribute('aria-label', t('picker.search'));
	search.setAttribute('role', 'combobox');
	search.setAttribute('aria-expanded', 'true');
	search.setAttribute('aria-controls', `picker-list-${instance}`);
	search.setAttribute('aria-autocomplete', 'list');
	const closeButton = el('button', 'close');
	closeButton.type = 'button';
	closeButton.textContent = t('picker.closeGlyph');
	closeButton.setAttribute('aria-label', t('picker.close'));
	head.append(search, closeButton);

	const count = el('div', 'count');
	const list = el('ul', 'list');
	list.id = `picker-list-${instance}`;
	list.setAttribute('role', 'listbox');
	dialog.append(head, count, list);
	shadow.append(dialog);
	document.body.append(host);

	const button = el('button', 'currency-trigger');
	button.type = 'button';
	button.setAttribute('aria-haspopup', 'dialog');
	const buttonMark = el('span', 'mark');
	const buttonCode = el('span', 'code');
	const buttonName = el('span', 'name');
	button.append(buttonMark, buttonCode, buttonName);

	function renderButton(): void {
		const row = currencyRows(lang).find(r => r.code === selectedCode);
		buttonMark.textContent = row?.mark ?? currencyMark(selectedCode, lang);
		buttonCode.textContent = selectedCode;
		buttonName.textContent = row?.name ?? currencyName(selectedCode, lang);
		button.setAttribute(
			'aria-label',
			`${t('settings.targetCurrency')}: ${selectedCode} — ${buttonName.textContent}`
		);
	}

	function highlight(): void {
		const items = list.querySelectorAll<HTMLElement>('[role="option"]');
		items.forEach((item, index) => item.classList.toggle('active', index === active));
		const current = items[active];
		if (current) {
			search.setAttribute('aria-activedescendant', current.id);
			current.scrollIntoView({ block: 'nearest' });
		} else {
			search.removeAttribute('aria-activedescendant');
		}
	}

	function renderList(query = ''): void {
		rows = searchCurrencies(query, lang);
		active = Math.min(active, Math.max(0, rows.length - 1));
		count.textContent = tn('picker.count', rows.length);
		list.replaceChildren();
		if (rows.length === 0) {
			const empty = el('li', 'empty');
			empty.textContent = t('picker.empty', { query });
			list.append(empty);
			search.removeAttribute('aria-activedescendant');
			return;
		}
		rows.forEach((row, index) => {
			const item = el('li', 'row');
			item.id = `picker-option-${instance}-${index}`;
			item.setAttribute('role', 'option');
			item.setAttribute('aria-selected', row.code === selectedCode ? 'true' : 'false');
			const mark = el('span', 'mark');
			mark.textContent = row.mark;
			const code = el('span', 'code');
			code.textContent = row.code;
			const name = el('span', 'name');
			name.textContent = row.name;
			item.append(mark, code, name);
			item.addEventListener('pointerdown', event => event.preventDefault());
			item.addEventListener('click', () => choose(row.code));
			list.append(item);
		});
		highlight();
	}

	function choose(code: string): void {
		selectedCode = code;
		renderButton();
		options.onChange(code);
		close();
	}

	function close(): void {
		if (!open) return;
		open = false;
		host.hidden = true;
		document.documentElement.style.overflow = previousOverflow;
		button.focus();
	}

	function openPanel(): void {
		if (open) return;
		open = true;
		previousOverflow = document.documentElement.style.overflow;
		document.documentElement.style.overflow = 'hidden';
		host.hidden = false;
		search.value = '';
		active = 0;
		renderList('');
		search.focus();
	}

	search.addEventListener('input', () => {
		active = 0;
		renderList(search.value);
	});
	search.addEventListener('keydown', event => {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			active = Math.min(active + 1, rows.length - 1);
			highlight();
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			active = Math.max(active - 1, 0);
			highlight();
		} else if (event.key === 'Home') {
			event.preventDefault();
			active = 0;
			highlight();
		} else if (event.key === 'End') {
			event.preventDefault();
			active = Math.max(0, rows.length - 1);
			highlight();
		} else if (event.key === 'Enter') {
			event.preventDefault();
			const row = rows[active];
			if (row) choose(row.code);
		}
	});
	shadow.addEventListener('keydown', event => {
		const { key } = event as KeyboardEvent;
		if (key === 'Escape') {
			event.preventDefault();
			close();
		} else if (key === 'Tab') {
			event.preventDefault();
			if (shadow.activeElement === search) closeButton.focus();
			else search.focus();
		}
	});
	host.addEventListener('pointerdown', event => {
		if (event.composedPath()[0] === host) close();
	});
	dialog.addEventListener('pointerdown', event => event.stopPropagation());
	closeButton.addEventListener('click', close);
	button.addEventListener('click', openPanel);

	renderButton();

	return {
		button,
		open: openPanel,
		close,
		setTheme(next: Theme) {
			theme = next;
			host.dataset.theme = next;
		},
		setLang(next: Lang) {
			lang = next;
			setLang(next);
			search.placeholder = t('picker.search');
			search.setAttribute('aria-label', t('picker.search'));
			renderButton();
			if (open) renderList(search.value);
		},
		setSelected(code: string) {
			selectedCode = code;
			renderButton();
			if (open) renderList(search.value);
		},
		selected: () => selectedCode
	};
}
