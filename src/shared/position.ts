// Позиция окна — чистая функция (план §6, критерий 4). Сторона выбирается по
// свободному месту, при равенстве — сверху; окно не накладывается на выделение,
// по горизонтали прижимается к краю с зазором 8 px. Не влезает — null, и окно
// не показывается вовсе: обрезанное окно читается как баг.

export type Rect = { left: number; top: number; right: number; bottom: number; width: number; height: number };

export type Size = { width: number; height: number };

export type Viewport = { width: number; height: number };

export type Placement = { left: number; top: number; side: 'above' | 'below' };

export const EDGE = 8;

/**
 * preferred — 'above' для сцены онбординга, где сторона задана макетом;
 * 'auto' на чужих страницах.
 */
export function placeOverlay(
	anchor: Rect,
	size: Size,
	viewport: Viewport,
	gap: number,
	preferred: 'auto' | 'above' | 'below' = 'auto'
): Placement | null {
	if (viewport.width - EDGE * 2 < size.width) return null;
	if (viewport.height - EDGE * 2 < size.height) return null;

	const roomAbove = anchor.top - EDGE;
	const roomBelow = viewport.height - anchor.bottom - EDGE;
	const needs = size.height + gap;

	let side: 'above' | 'below';
	if (preferred !== 'auto') {
		side = preferred;
		if ((side === 'above' ? roomAbove : roomBelow) < needs) return null;
	} else if (roomAbove >= needs) {
		side = 'above'; // сверху приоритет, даже если снизу просторнее
	} else if (roomBelow >= needs) {
		side = 'below';
	} else {
		return null;
	}

	const center = anchor.left + anchor.width / 2;
	const left = Math.min(Math.max(Math.round(center - size.width / 2), EDGE), viewport.width - EDGE - size.width);
	const top = side === 'above' ? Math.round(anchor.top - gap - size.height) : Math.round(anchor.bottom + gap);

	if (top < EDGE || top + size.height > viewport.height - EDGE) return null;
	return { left, top, side };
}
