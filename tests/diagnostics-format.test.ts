import { afterAll, describe, expect, test } from 'bun:test';

import type { DiagSnapshot } from '../src/shared/diagnostics';
import { formatDiagnosticsReport } from '../src/shared/diagnostics-format';
import { setLang } from '../src/shared/i18n';

const at = Date.UTC(2026, 10, 13, 15, 12, 2);

const snapshot: DiagSnapshot = {
	version: '0.1.0',
	url: 'https://example.test/',
	userAgent: 'Test UA',
	startedAt: at,
	state: {
		version: '0.1.0',
		topFrame: true,
		'settings.target': 'RUB',
		'settings.theme': 'dark',
		'selection.result': 'rejected',
		'selection.text': '1 000 $',
		'overlay.phase': 'closed',
		visibility: 'visible',
		readyState: 'complete',
		frames: 0
	},
	events: [
		{ t: at, level: 'info', event: 'boot' },
		{
			t: at,
			level: 'info',
			event: 'selection',
			data: { result: 'rejected', text: '1 000 $', lang: 'ru-RU', multiplier: 1 }
		},
		{ t: at, level: 'warn', event: 'rate.result', data: { from: 'USD', to: 'RUB', error: 'server', status: 503 } },
		{ t: at, level: 'warn', event: 'overlay.close', data: { reason: 'pointerdown' } },
		{ t: at, level: 'warn', event: 'custom.event', data: { foo: 'bar' } }
	]
};

afterAll(() => setLang('en'));

describe('отчёт диагностики (словари)', () => {
	test('русский отчёт не оставляет английских подписей', () => {
		setLang('ru');
		const text = formatDiagnosticsReport(snapshot, 'ru');
		expect(text).toContain('Браузер: Test UA');
		expect(text).toContain('Главный фрейм: да');
		expect(text).toContain('Результат выделения: отклонено');
		expect(text).toContain('Состояние документа: загружено');
		expect(text).toContain('Выделение  результат="отклонено" текст="1 000 $" язык="ru-RU" множитель=1');
		expect(text).toContain('Ответ курса  из="USD" в="RUB" ошибка="ошибка сервера" статус=503');
		expect(text).toContain('Окно закрыто  причина="клик вне окна"');
		expect(text).not.toContain('topFrame:');
		expect(text).not.toContain('Selection result:');
	});

	test('неизвестное событие и поле остаются видимыми', () => {
		setLang('ru');
		const text = formatDiagnosticsReport(snapshot, 'ru');
		expect(text).toContain('custom.event  foo="bar"');
	});

	test('английский отчёт использует английские подписи', () => {
		setLang('en');
		const text = formatDiagnosticsReport(snapshot, 'en');
		expect(text).toContain('Browser: Test UA');
		expect(text).toContain('Top frame: yes');
		expect(text).toContain('Selection result: rejected');
		expect(text).toContain('Overlay closed  reason="click outside"');
	});
});
