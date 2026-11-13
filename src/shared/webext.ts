// Один доступ к API расширения для двух браузеров (план §5, критерий 10).
// Firefox отдаёт promise-версию под `browser`; Chrome — `chrome` (MV3 тоже
// возвращает promise). Тесты не вызывают эту функцию, поэтому `chrome`
// остаётся ленивым: импорт модуля без браузера не падает.

export function extensionApi(): typeof chrome {
	// Chrome 148+ has a `browser` alias too. Prefer the `chrome` namespace there:
	// MV3 promises are the same, and it is the one this extension is tested with.
	// Firefox is recognised by its own runtime.getBrowserInfo.
	const candidate = (
		globalThis as unknown as {
			browser?: { runtime?: { getBrowserInfo?: unknown }; storage?: unknown };
		}
	).browser;
	if (candidate?.runtime?.getBrowserInfo && candidate.storage) return candidate as unknown as typeof chrome;
	return chrome;
}
