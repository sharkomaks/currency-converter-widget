// Фоновый скрипт: держит сервис курса и отвечает на сообщения поверхностей.
// Контракт сообщения: { type: 'getRate', from, to, fresh? } → RateResult
// ({ rate } | { error: { kind, status? } }). Таймаут 8 с считает окно, не фон
// (§11); выгрузка скрипта посреди запроса лечится тем же таймером (С9).
// { type: 'openSettings' } — кнопка «другая валюта» из окна на странице:
// контент-скрипт не может открыть поверхность расширения сам, а отдельной
// страницы настроек больше нет — открываем то же окно приложения в режиме
// настроек, маленьким popup-окном.

import { chromeSessionArea } from '../shared/session';
import { extensionApi } from '../shared/webext';
import { createRateService, type RateResult } from './rate';
import { createFrankfurterSource } from './sources/frankfurter';

const ext = extensionApi();

const service = createRateService({
	source: createFrankfurterSource(),
	area: chromeSessionArea(),
	now: () => Date.now()
});

type GetRateMessage = { type: 'getRate'; from: string; to: string; fresh?: boolean };

function isGetRateMessage(value: unknown): value is GetRateMessage {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Partial<GetRateMessage>;
	return v.type === 'getRate' && typeof v.from === 'string' && typeof v.to === 'string';
}

function isOpenSettingsMessage(value: unknown): boolean {
	return typeof value === 'object' && value !== null && (value as { type?: unknown }).type === 'openSettings';
}

function openSettingsWindow(): void {
	void ext.windows
		.create({
			url: ext.runtime.getURL('popup.html?view=settings'),
			type: 'popup',
			width: 380,
			height: 620
		})
		.catch(() => undefined);
}

ext.runtime.onMessage.addListener((message: unknown, _sender, sendResponse: (result: RateResult) => void) => {
	if (isOpenSettingsMessage(message)) {
		openSettingsWindow();
		return false;
	}
	if (!isGetRateMessage(message)) return false;
	void service
		.getRate(message.from, message.to, { fresh: message.fresh === true })
		.then(result => sendResponse(result))
		.catch(() => sendResponse({ error: { kind: 'network' } }));
	return true; // ответ асинхронный
});
