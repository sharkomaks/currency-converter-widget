import { describe, expect, test } from 'bun:test';

/**
 * Шов 1 — чистые модули (спека, Testing Decisions). Миграция и валидация —
 * чистые функции: вход — сырая запись из `sync`, выход — настройки и список
 * того, что пришлось чинить (С8: громко, а не молча). Ожидаемые значения —
 * из плана §10 (схема v1) и С10 (выпавшая валюта → USD с уведомлением).
 */
import { migrateRecord, SCHEMA_VERSION } from '../src/shared/storage';
import type { Settings } from '../src/shared/storage';

const VALID: Settings = {
	onboarded: true,
	schemaVersion: SCHEMA_VERSION,
	lang: 'ru',
	theme: 'light',
	overlayTheme: 'auto',
	targetCurrency: 'KZT',
	gap: 4
};

describe('migrateRecord — валидная запись проходит без изменений (кроме версии)', () => {
	test('все поля на месте и валидны — запись возвращается как есть', () => {
		const { settings, notices } = migrateRecord({ ...VALID }, SCHEMA_VERSION);
		expect(settings).toEqual(VALID);
		expect(notices).toEqual([]);
	});
});

describe('migrateRecord — невалидные значения чинятся громко (С8)', () => {
	test('выпавшая из списка целевая валюта → USD с уведомлением (С10)', () => {
		const { settings, notices } = migrateRecord({ ...VALID, targetCurrency: 'BYR' }, SCHEMA_VERSION);
		expect(settings.targetCurrency).toBe('USD');
		expect(notices).toContainEqual({ key: 'notice.currencyReset', params: { code: 'BYR' } });
	});

	test('gap вне 0–20 → дефолт 7 с уведомлением', () => {
		const high = migrateRecord({ ...VALID, gap: 35 }, SCHEMA_VERSION);
		expect(high.settings.gap).toBe(7);
		expect(high.notices).not.toBe([]);

		const low = migrateRecord({ ...VALID, gap: -1 }, SCHEMA_VERSION);
		expect(low.settings.gap).toBe(7);
	});

	test('v1 с дефолтной четвёркой переезжает на 7, а выбор в v2 сохраняется', () => {
		const fromV1 = migrateRecord({ ...VALID, schemaVersion: 1, gap: 4 }, SCHEMA_VERSION);
		expect(fromV1.settings.gap).toBe(7);
		const fromV2 = migrateRecord({ ...VALID, schemaVersion: 2, gap: 4 }, SCHEMA_VERSION);
		expect(fromV2.settings.gap).toBe(4);
	});

	test('незнакомый lang → en, незнакомая theme → dark, незнакомая overlayTheme → auto', () => {
		const { settings } = migrateRecord(
			{ ...VALID, lang: 'fr', theme: 'blue', overlayTheme: 'pink' },
			SCHEMA_VERSION
		);
		expect(settings.lang).toBe('en');
		expect(settings.theme).toBe('dark');
		expect(settings.overlayTheme).toBe('auto');
	});
});

describe('migrateRecord — версии', () => {
	test('нулевая версия и дыры в записи: отсутствующие поля тихо падают в дефолты (Б4: частичная запись не ломает)', () => {
		const { settings, notices } = migrateRecord({}, 0);
		expect(settings.schemaVersion).toBe(SCHEMA_VERSION);
		expect(settings.targetCurrency).toBe('USD');
		expect(settings.gap).toBe(7);
		expect(settings.onboarded).toBe(false);
		expect(notices).toEqual([]);
	});

	test('но испорченное поле в частичной записи громко: {gap: 99} даёт уведомление', () => {
		const { settings, notices } = migrateRecord({ gap: 99 }, 0);
		expect(settings.gap).toBe(7);
		expect(notices).not.toBe([]);
	});

	test('версия из будущего читается как есть и не перезаписывается (С8)', () => {
		const future = { ...VALID, schemaVersion: SCHEMA_VERSION + 1 };
		const { settings, notices } = migrateRecord(future, SCHEMA_VERSION);
		expect(settings.schemaVersion).toBe(SCHEMA_VERSION + 1);
		expect(notices).toEqual([]);
	});
});

describe('migrateRecord — валюта проверяется по списку сборки, не по строке', () => {
	test('isSupported из модуля валют решает: XCG из списка проходит', () => {
		const { settings, notices } = migrateRecord({ ...VALID, targetCurrency: 'XCG' }, SCHEMA_VERSION);
		expect(settings.targetCurrency).toBe('XCG');
		expect(notices).toEqual([]);
	});
});
