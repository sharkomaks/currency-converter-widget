import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';

/**
 * Шов 3 — проверки сборки (спека, Testing Decisions; план §5, М7, М9).
 * Ожидаемые значения взяты из таблицы раздела 5 плана, не из кода:
 * два манифеста равны везде, кроме `background` и `browser_specific_settings`.
 */

const IGNORED_MANIFEST_KEYS = ['background', 'browser_specific_settings'] as const;

type FirefoxSettings = {
	gecko?: { id?: string; data_collection_permissions?: { required?: string[] } };
};

function readJson(path: string): unknown {
	return JSON.parse(readFileSync(path, 'utf8'));
}

function manifest(name: 'chrome' | 'firefox'): Record<string, unknown> {
	return readJson(`manifests/${name}.json`) as Record<string, unknown>;
}

describe('версия единая (в духе М7)', () => {
	test('package.json и оба манифеста держат одну версию', () => {
		const pkg = readJson('package.json') as { version: string };
		expect(pkg.version).toBe('0.1.0');
		expect(manifest('chrome').version).toBe(pkg.version);
		expect(manifest('firefox').version).toBe(pkg.version);
	});
});

describe('равенство манифестов (М7)', () => {
	test('хроме и firefox равны везде, кроме background и browser_specific_settings', () => {
		const chrome = { ...manifest('chrome') };
		const firefox = { ...manifest('firefox') };
		for (const key of IGNORED_MANIFEST_KEYS) {
			delete chrome[key];
			delete firefox[key];
		}
		expect(firefox).toEqual(chrome);
	});

	test('расхождение ровно одно: background, и только у firefox есть gecko id', () => {
		const chrome = manifest('chrome');
		const firefox = manifest('firefox');
		expect(chrome.background).toEqual({ service_worker: 'background.js' });
		expect(firefox.background).toEqual({ scripts: ['background.js'] });
		expect(chrome.browser_specific_settings).toBeUndefined();
		// Форма gecko проверена web-ext lint; тесту нужны два поля.
		const gecko = (firefox.browser_specific_settings as FirefoxSettings | undefined)?.gecko;
		expect(gecko?.id).toBeTruthy();
		expect(gecko?.data_collection_permissions).toEqual({ required: ['none'] });
	});
});

describe('полнота манифеста (М6, таблица §5)', () => {
	test('обязательные поля на месте', () => {
		for (const name of ['chrome', 'firefox'] as const) {
			const m = manifest(name);
			expect(m.manifest_version).toBe(3);
			expect(m.version).toBe('0.1.0');
			expect(m.name).toBe('__MSG_name__');
			expect(m.description).toBe('__MSG_description__');
			expect(m.default_locale).toBe('en');
			expect(m.action).toEqual({
				default_popup: 'popup.html',
				default_title: '__MSG_name__'
			});
			expect(m.icons).toEqual({
				'16': 'icons/icon16.png',
				'48': 'icons/icon48.png',
				'128': 'icons/icon128.png'
			});
		}
	});

	test('шрифт Roboto лежит в проекте и отдаётся страницам', () => {
		for (const name of ['chrome', 'firefox'] as const) {
			expect(manifest(name).web_accessible_resources).toEqual([
				{
					resources: ['fonts/roboto-latin.woff2', 'fonts/roboto-cyrillic.woff2'],
					matches: ['<all_urls>']
				}
			]);
		}
		expect(existsSync('public/fonts/roboto-latin.woff2')).toBe(true);
		expect(existsSync('public/fonts/roboto-cyrillic.woff2')).toBe(true);
	});

	test('права — только storage и Frankfurter (три обещания §5)', () => {
		for (const name of ['chrome', 'firefox'] as const) {
			const m = manifest(name);
			expect(m.permissions).toEqual(['storage']);
			expect(m.host_permissions).toEqual(['https://api.frankfurter.dev/*']);
		}
	});

	test('контент-скрипт: только верхний документ, document_idle (Б7)', () => {
		for (const name of ['chrome', 'firefox'] as const) {
			const scripts = manifest(name).content_scripts as Array<Record<string, unknown>>;
			expect(scripts).toHaveLength(1);
			expect(scripts[0]).toEqual({
				matches: ['<all_urls>'],
				js: ['content.js'],
				run_at: 'document_idle'
			});
		}
	});
});

describe('словари _locales (М9)', () => {
	test('ru и en держат одинаковый набор ключей', () => {
		const en = readJson('_locales/en/messages.json') as Record<string, unknown>;
		const ru = readJson('_locales/ru/messages.json') as Record<string, unknown>;
		expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort());
	});

	test('ключи — только [A-Za-z0-9_] (требование Chrome к messages.json)', () => {
		for (const lang of ['en', 'ru']) {
			const messages = readJson(`_locales/${lang}/messages.json`) as Record<string, unknown>;
			for (const key of Object.keys(messages)) expect(key).toMatch(/^[A-Za-z0-9_]+$/);
		}
	});

	test('name и description есть у обоих (карточка расширения §14)', () => {
		for (const lang of ['en', 'ru']) {
			const messages = readJson(`_locales/${lang}/messages.json`) as Record<string, { message: string }>;
			expect(messages.name?.message).toBeTruthy();
			expect(messages.description?.message).toBeTruthy();
		}
	});
});

describe('файлы, на которые ссылается сборка, существуют', () => {
	test('точки входа', () => {
		for (const path of [
			'src/content/index.ts',
			'src/background/index.ts',
			'src/popup/popup.html',
			'src/popup/popup.ts'
		]) {
			expect(existsSync(path)).toBe(true);
		}
	});

	test('иконки 16/48/128', () => {
		for (const size of [16, 48, 128]) {
			expect(existsSync(`icons/icon${size}.png`)).toBe(true);
		}
	});
});
