import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// План §14: весь текст интерфейса живёт в словарях. Проверка ловит опечатку
// в data-i18n и статический t('...'), для которого нет ключа в обоих языках.

type Messages = Record<string, { message: string }>;

function dictionary(lang: 'en' | 'ru'): Messages {
	return JSON.parse(readFileSync(`_locales/${lang}/messages.json`, 'utf8')) as Messages;
}

/** `t` and the dictionaries use one key form: dots become underscores. */
function keyOf(key: string): string {
	return key.replaceAll('.', '_');
}

function sourceFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...sourceFiles(path));
		else if (entry.name.endsWith('.ts')) out.push(path);
	}
	return out;
}

const en = dictionary('en');
const ru = dictionary('ru');

describe('текст интерфейса только в словарях', () => {
	test('каждый data-i18n из popup.html есть в обоих языках', () => {
		const html = readFileSync('src/popup/popup.html', 'utf8');
		const keys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map(match => match[1] as string);
		expect(keys.length).toBeGreaterThan(0);
		for (const key of keys) {
			expect(en[keyOf(key)]).toBeDefined();
			expect(ru[keyOf(key)]).toBeDefined();
		}
	});

	test('каждый статический t(...) из src есть в обоих языках', () => {
		const keys = new Set<string>();
		for (const file of sourceFiles('src')) {
			const source = readFileSync(file, 'utf8');
			for (const match of source.matchAll(/\bt\('([^']+)'/g)) keys.add(keyOf(match[1] as string));
		}
		expect(keys.size).toBeGreaterThan(0);
		for (const key of keys) {
			expect(en[key]).toBeDefined();
			expect(ru[key]).toBeDefined();
		}
	});
});
