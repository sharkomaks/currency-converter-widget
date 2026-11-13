// Окно на странице — один компонент для чужих страниц и сцены онбординга
// (план §6, §9, §11). В ShadowRoot, чтобы стили страницы его не трогали;
// контейнер — на documentElement, чтобы чужие transform не врали координатам.
// Состояния: скелетон, число, ошибка; в окне только результат.

import { fontFaceCss } from './fonts';
import { t } from './i18n';
import { placeOverlay } from './position';
import type { ThemeChoice } from './tone';

type RectLike = { left: number; top: number; right: number; bottom: number; width: number; height: number };

export type OverlayAction = { label: string; disabled: boolean; onActivate: () => void };

export type OverlayState =
	| { phase: 'loading' }
	| { phase: 'result'; text: string }
	| { phase: 'error'; title: string; detail: string; action: OverlayAction | null };

const STYLE = `
:host {
	--paper: #ffffff;
	--ink: #0f1720;
	--line: #cbd5e1;
	--muted: #667085;
	--accent: #2e5eaa;
	--shadow: 0 8px 24px rgb(16 24 40 / 0.2);
	position: fixed;
	z-index: 2147483647;
	display: block;
	pointer-events: auto;
}
:host([hidden]) { display: none; }
:host([data-theme='dark']) {
	--paper: #151c24;
	--ink: #edf1f6;
	--line: #24303c;
	--muted: #95a1b0;
	--accent: #8db4f7;
	--shadow: 0 8px 24px rgb(0 0 0 / 0.45);
}
* { box-sizing: border-box; }
.panel {
	width: max-content;
	max-width: 280px;
	min-height: 34px;
	padding: 7px 10px;
	background: var(--paper);
	color: var(--ink);
	border: 1px solid var(--line);
	border-radius: 10px;
	box-shadow: var(--shadow);
	font: 13px/1.35 Roboto, 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif;
	user-select: none;
}
.panel[data-phase='error'] {
	width: 264px;
	padding: 11px 12px;
	border-radius: 12px;
}
.body { min-height: 20px; display: flex; align-items: center; }
.amount {
	max-width: 252px;
	overflow: hidden;
	font-size: 17px;
	font-weight: 650;
	line-height: 1.2;
	letter-spacing: -0.01em;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-variant-numeric: tabular-nums lining-nums;
}
.skeleton-stack { width: 100%; min-width: 64px; display: flex; flex-direction: column; gap: 4px; }
.skeleton {
	height: 6px;
	border-radius: 999px;
	background: linear-gradient(90deg, var(--line) 0%, var(--muted) 50%, var(--line) 100%);
	background-size: 200% 100%;
	animation: sweep 1.1s linear infinite;
}
.skeleton-wide { width: 52px; }
.skeleton-short { width: 28px; }
@keyframes sweep { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.title { margin: 0; font-size: 12.5px; font-weight: 600; }
.detail { margin: 3px 0 0; color: var(--muted); font-size: 11.5px; line-height: 1.4; }
.action {
	margin-top: 7px;
	padding: 4px 9px;
	font: inherit;
	font-size: 11.5px;
	color: var(--ink);
	background: transparent;
	border: 1px solid var(--line);
	border-radius: 8px;
	cursor: pointer;
}
.action:disabled { color: var(--muted); cursor: default; }
.action:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	margin: -1px;
	padding: 0;
	overflow: hidden;
	clip: rect(0 0 0 0);
	white-space: nowrap;
	border: 0;
}
@media (prefers-reduced-motion: reduce) {
	.skeleton { animation: none; }
}
`;

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] {
	const el = document.createElement(tag);
	if (className) el.className = className;
	return el;
}

export class Overlay {
	readonly host: HTMLDivElement;
	private readonly panel: HTMLDivElement;
	private readonly body: HTMLDivElement;
	private readonly action: HTMLButtonElement;
	private currentAction: (() => void) | null = null;

	constructor() {
		this.host = document.createElement('div');
		this.host.dataset.ccwOverlay = '';
		this.host.hidden = true;
		const shadow = this.host.attachShadow({ mode: 'open' });

		// Конструируемый лист не подчиняется CSP страницы (Chrome 73+, Firefox 101+).
		const sheet = new CSSStyleSheet();
		let css = STYLE;
		try {
			css += fontFaceCss();
		} catch {
			// Шрифт не должен ломать само окно: без @font-face останется системный.
		}
		sheet.replaceSync(css);
		shadow.adoptedStyleSheets = [sheet];

		this.panel = element('div', 'panel');
		this.body = element('div', 'body');
		this.body.setAttribute('role', 'status');
		this.body.setAttribute('aria-live', 'polite');
		this.action = element('button', 'action');
		this.action.type = 'button';
		this.action.hidden = true;
		this.action.addEventListener('click', event => {
			event.preventDefault();
			event.stopPropagation();
			this.currentAction?.();
		});
		this.panel.append(this.body, this.action);
		shadow.append(this.panel);
		document.documentElement.append(this.host);
	}

	update(state: OverlayState): void {
		this.panel.dataset.phase = state.phase;
		this.body.replaceChildren();
		this.action.hidden = true;
		this.currentAction = null;

		if (state.phase === 'loading') {
			const stack = element('div', 'skeleton-stack');
			stack.append(element('div', 'skeleton skeleton-wide'), element('div', 'skeleton skeleton-short'));
			const label = element('span', 'sr-only');
			label.textContent = t('overlay.loading');
			this.body.append(label, stack);
		} else if (state.phase === 'result') {
			const label = element('span', 'sr-only');
			label.textContent = t('overlay.label');
			const amount = element('span', 'amount');
			amount.textContent = state.text;
			this.body.append(label, amount);
		} else {
			const title = element('p', 'title');
			title.textContent = state.title;
			const detail = element('p', 'detail');
			detail.textContent = state.detail;
			this.body.append(title, detail);
			if (state.action) {
				this.action.hidden = false;
				this.action.textContent = state.action.label;
				this.action.disabled = state.action.disabled;
				this.currentAction = state.action.onActivate;
			}
		}
		this.host.hidden = false;
	}

	setTheme(theme: ThemeChoice): void {
		this.host.dataset.theme = theme;
	}

	setAction(label: string, disabled: boolean): void {
		this.action.textContent = label;
		this.action.disabled = disabled;
	}

	/** true — окно поставлено; false — не влезает, показывать нельзя. */
	place(anchor: DOMRect | RectLike, gap: number, preferred: 'auto' | 'above' | 'below' = 'auto'): boolean {
		this.host.hidden = false;
		const rect = this.host.getBoundingClientRect();
		const placed = placeOverlay(
			anchor,
			{ width: rect.width, height: rect.height },
			{ width: window.innerWidth, height: window.innerHeight },
			gap,
			preferred
		);
		if (!placed) {
			this.host.hidden = true;
			return false;
		}
		this.host.style.left = `${placed.left}px`;
		this.host.style.top = `${placed.top}px`;
		return true;
	}

	hide(): void {
		this.host.hidden = true;
	}

	isVisible(): boolean {
		return !this.host.hidden;
	}

	destroy(): void {
		this.host.remove();
	}
}
