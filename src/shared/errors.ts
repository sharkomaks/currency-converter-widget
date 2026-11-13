// Шесть классов ошибки (план §11, ADR 0007): заголовок, деталь с парой и кодом,
// кнопка, которая помогает. Тексты — целые шаблоны в словаре, предложения из
// кусков здесь не собираются. Седьмой kind фона — rateLimit (свой потолок
// частоты, §7) — показывается классом «слишком много запросов» со своей деталью.

import type { RateError } from '../background/rate';
import { t } from './i18n';

export type ErrorAction = 'retry' | 'otherCurrency';

export type ErrorView = { title: string; detail: string; action: ErrorAction };

export function describeError(error: RateError, from: string, to: string): ErrorView {
	const params = { from, to, status: error.status === undefined ? '—' : String(error.status) };
	const titleKind = error.kind === 'rateLimit' ? 'tooMany' : error.kind;
	return {
		title: t(`error.${titleKind}.title`),
		detail: t(`error.${error.kind}.detail`, params),
		// У 4xx повтор вернёт то же самое — вместо него «другая валюта» (§11).
		action: error.kind === 'noRate' ? 'otherCurrency' : 'retry'
	};
}
