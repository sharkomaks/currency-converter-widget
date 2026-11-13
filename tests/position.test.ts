import { describe, expect, test } from 'bun:test';
/** Позиция окна (план §6, критерий 4): сторона по свободному месту, равенство —
 * сверху, горизонт прижат с зазором 8 px, не влезает — null. */

import { placeOverlay, type Rect } from '../src/shared/position';

function rect(left: number, top: number, width: number, height: number): Rect {
	return { left, top, right: left + width, bottom: top + height, width, height };
}

const VIEWPORT = { width: 1000, height: 800 };

describe('placeOverlay — сторона', () => {
	test('равное место сверху и снизу → сверху', () => {
		const placed = placeOverlay(rect(480, 390, 40, 20), { width: 200, height: 60 }, VIEWPORT, 4);
		expect(placed?.side).toBe('above');
	});

	test('сверху приоритет, даже если снизу просторнее', () => {
		const placed = placeOverlay(rect(480, 80, 40, 20), { width: 200, height: 60 }, VIEWPORT, 4);
		expect(placed?.side).toBe('above');
		if (placed) expect(placed.top).toBe(16);
	});

	test('сверху не влезает — уходим вниз, даже если там больше', () => {
		const placed = placeOverlay(rect(480, 20, 40, 20), { width: 200, height: 60 }, VIEWPORT, 4);
		expect(placed?.side).toBe('below');
	});

	test('не влезает нигде → null', () => {
		const tiny = { width: 1000, height: 100 };
		expect(placeOverlay(rect(480, 40, 40, 20), { width: 200, height: 60 }, tiny, 4)).toBeNull();
	});

	test('выше окна шире экрана → null', () => {
		expect(
			placeOverlay(rect(100, 300, 40, 20), { width: 320, height: 60 }, { width: 300, height: 800 }, 4)
		).toBeNull();
	});
});

describe('placeOverlay — края и зазор', () => {
	test('окно не накладывается на выделение', () => {
		const anchor = rect(480, 390, 40, 20);
		const placed = placeOverlay(anchor, { width: 200, height: 60 }, VIEWPORT, 4);
		expect(placed).not.toBeNull();
		if (placed?.side === 'above') expect(placed.top + 60).toBe(anchor.top - 4);
		if (placed?.side === 'below') expect(placed.top).toBe(anchor.bottom + 4);
	});

	test('горизонт прижат к краю с зазором 8 px', () => {
		const left = placeOverlay(rect(0, 390, 10, 20), { width: 200, height: 60 }, VIEWPORT, 4);
		expect(left?.left).toBe(8);
		const right = placeOverlay(rect(990, 390, 10, 20), { width: 200, height: 60 }, VIEWPORT, 4);
		expect(right?.left).toBe(792);
	});

	test('сцена: сторона задана — above, иначе null', () => {
		expect(placeOverlay(rect(480, 390, 40, 20), { width: 200, height: 60 }, VIEWPORT, 4, 'above')?.side).toBe(
			'above'
		);
		expect(placeOverlay(rect(480, 10, 40, 20), { width: 200, height: 60 }, VIEWPORT, 4, 'above')).toBeNull();
	});
});
