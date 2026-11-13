import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, sep } from 'node:path';

import { build } from 'vite';

// Сборка расширения (план §15, ADR 0009): два прохода Vite — контент-скрипт и
// фон в iife с фиксированными именами, остальное в esm плюс html — затем
// сборка двух папок браузеров из одного и того же dist/app.
// Равенство манифестов уже проверено тестами (красный тест = красная сборка).

async function iife(entry: string, fileName: string, emptyOutDir: boolean): Promise<void> {
	await build({
		configFile: false,
		publicDir: false,
		build: {
			outDir: 'dist/app',
			emptyOutDir,
			lib: {
				entry,
				name: fileName.replace(/\.js$/, ''),
				formats: ['iife'],
				fileName: () => fileName
			}
		}
	});
}

await iife('src/content/index.ts', 'content.js', true);
await iife('src/background/index.ts', 'background.js', false);
await build({}); // vite.config.ts: esm + html

// Vite выкладывает html по структуре источника (src/<page>/<page>.html), а
// манифест ждёт страницы в корне расширения. Переносим каждую в корень и чиним
// путь к assets. Замена проверяется: если Vite сменит форму пути, сборка
// падает громко, а не тихо оставляет битую ссылку.
function flattenHtmlFiles(dir: string): string[] {
	const out: string[] = [];
	for (const name of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, name.name);
		if (name.isDirectory()) out.push(...flattenHtmlFiles(full));
		else if (name.name.endsWith('.html')) out.push(full);
	}
	return out;
}

for (const path of flattenHtmlFiles('dist/app/src')) {
	// path вида dist/app/src/<page>/<page>.html: глубина вложения под dist/app
	// определяет число «..» до assets.
	const depth = path.split(sep).length - 3;
	const prefix = `${'../'.repeat(depth)}assets/`;
	const html = readFileSync(path, 'utf8');
	const fixed = html
		.replaceAll(`src="${prefix}`, 'src="./assets/')
		.replaceAll(`href="${prefix}`, 'href="./assets/')
		// Vite считает url() в inline-стиле относительно исходного src/popup,
		// а html переносится в корень: ../../fonts/ → ./fonts/.
		.replaceAll('url(../../fonts/', 'url(./fonts/')
		.replaceAll('url("../../fonts/', 'url("./fonts/');
	if (fixed.includes(prefix) || fixed.includes('../../fonts/')) {
		throw new Error(`путь к assets в ${path} не исправлен — Vite сменил форму вывода`);
	}
	if (!fixed.includes('"./assets/')) {
		throw new Error(`в ${path} нет ссылки на assets — проверь вход vite-прохода`);
	}
	const name = path.split(sep).pop() as string;
	writeFileSync(join('dist/app', name), fixed);
	console.log(`${name}: ${prefix} -> ./assets/`);
}
rmSync('dist/app/src', { recursive: true, force: true });

for (const browser of ['chrome', 'firefox'] as const) {
	const target = `dist/${browser}`;
	rmSync(target, { recursive: true, force: true });
	mkdirSync(target, { recursive: true });
	cpSync('dist/app', target, { recursive: true });
	cpSync('_locales', `${target}/_locales`, { recursive: true });
	cpSync('icons', `${target}/icons`, { recursive: true });
	cpSync(`manifests/${browser}.json`, `${target}/manifest.json`);
}
rmSync('dist/app', { recursive: true, force: true });
console.log('dist/chrome, dist/firefox — готовы');
