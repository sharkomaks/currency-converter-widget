// Генератор иконок: скруглённый синий квадрат и жёлтый знак доллара под
// наклоном. Без библиотек и внешних шрифтов — путь `$` растрируется
// суперсэмплингом, поэтому иконка одинаково читается на 16 и 128 px.
// Запуск: bun scripts/gen-icons.ts — пишет icons/icon{16,48,128}.png.

import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const SIZES = [16, 48, 128] as const;
const BLUE: [number, number, number] = [46, 94, 170]; // #2E5EAA
const GOLD: [number, number, number] = [245, 200, 76]; // #F5C84C
const TILT = (-14 * Math.PI) / 180;
const STROKE = 0.102;

type Point = { x: number; y: number };

const CRC_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		table[n] = c >>> 0;
	}
	return table;
})();

function crc32(bytes: Uint8Array): number {
	let c = 0xffffffff;
	for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
	const out = new Uint8Array(12 + data.length);
	const view = new DataView(out.buffer);
	view.setUint32(0, data.length);
	out.set(
		[...type].map(ch => ch.charCodeAt(0)),
		4
	);
	out.set(data, 8);
	view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
	return out;
}

function rotate(point: Point): Point {
	const dx = (point.x - 0.5) * 0.88;
	const dy = (point.y - 0.5) * 0.88;
	return {
		x: 0.5 + dx * Math.cos(TILT) - dy * Math.sin(TILT),
		y: 0.5 + dx * Math.sin(TILT) + dy * Math.cos(TILT)
	};
}

function cubic(p0: Point, p1: Point, p2: Point, p3: Point, steps = 20): Point[] {
	const out: Point[] = [];
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const u = 1 - t;
		out.push({
			x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
			y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
		});
	}
	return out;
}

/** Путь знака `$`: S-кривая и вертикальная черта, повёрнутые целиком. */
const SEGMENTS: Array<[Point, Point]> = (() => {
	const curve = [
		...cubic({ x: 0.69, y: 0.31 }, { x: 0.61, y: 0.2 }, { x: 0.41, y: 0.19 }, { x: 0.33, y: 0.28 }),
		...cubic({ x: 0.25, y: 0.37 }, { x: 0.31, y: 0.46 }, { x: 0.44, y: 0.49 }, { x: 0.56, y: 0.52 }),
		...cubic({ x: 0.69, y: 0.55 }, { x: 0.75, y: 0.65 }, { x: 0.67, y: 0.75 }, { x: 0.56, y: 0.8 }),
		...cubic({ x: 0.47, y: 0.84 }, { x: 0.37, y: 0.82 }, { x: 0.31, y: 0.73 }, { x: 0.31, y: 0.73 })
	].map(rotate);
	const bar = [rotate({ x: 0.5, y: 0.1 }), rotate({ x: 0.5, y: 0.9 })];
	const segments: Array<[Point, Point]> = [];
	for (let i = 0; i + 1 < curve.length; i++) segments.push([curve[i]!, curve[i + 1]!]);
	segments.push([bar[0]!, bar[1]!]);
	return segments;
})();

function distanceToSegment(px: number, py: number, a: Point, b: Point): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const length = dx * dx + dy * dy;
	const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / length));
	return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

function insideRounded(u: number, v: number, radius: number): boolean {
	if (u < 0 || v < 0 || u > 1 || v > 1) return false;
	const cx = Math.min(Math.max(u, radius), 1 - radius);
	const cy = Math.min(Math.max(v, radius), 1 - radius);
	return Math.hypot(u - cx, v - cy) <= radius;
}

function png(size: number): Uint8Array {
	const samples = size <= 16 ? 6 : size <= 48 ? 4 : 3;
	const radius = 0.22;
	const raw = new Uint8Array(size * (size * 4 + 1));
	for (let y = 0; y < size; y++) {
		const row = y * (size * 4 + 1);
		raw[row] = 0;
		for (let x = 0; x < size; x++) {
			let r = 0;
			let g = 0;
			let b = 0;
			let a = 0;
			for (let sy = 0; sy < samples; sy++) {
				for (let sx = 0; sx < samples; sx++) {
					const u = (x + (sx + 0.5) / samples) / size;
					const v = (y + (sy + 0.5) / samples) / size;
					if (!insideRounded(u, v, radius)) continue;
					let glyph = false;
					for (const [p0, p1] of SEGMENTS) {
						if (distanceToSegment(u, v, p0, p1) <= STROKE / 2) {
							glyph = true;
							break;
						}
					}
					const [cr, cg, cb] = glyph ? GOLD : BLUE;
					r += cr;
					g += cg;
					b += cb;
					a += 255;
				}
			}
			const total = samples * samples;
			const px = row + 1 + x * 4;
			if (a === 0) continue;
			raw[px] = Math.round(r / (a / 255));
			raw[px + 1] = Math.round(g / (a / 255));
			raw[px + 2] = Math.round(b / (a / 255));
			raw[px + 3] = Math.round(a / total);
		}
	}
	const ihdr = new Uint8Array(13);
	const view = new DataView(ihdr.buffer);
	view.setUint32(0, size);
	view.setUint32(4, size);
	ihdr[8] = 8;
	ihdr[9] = 6;
	const signature = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	const parts = [signature, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())];
	const total = parts.reduce((n, p) => n + p.length, 0);
	const out = new Uint8Array(total);
	let offset = 0;
	for (const p of parts) {
		out.set(p, offset);
		offset += p.length;
	}
	return out;
}

mkdirSync('icons', { recursive: true });
for (const size of SIZES) {
	writeFileSync(`icons/icon${size}.png`, png(size));
	console.log(`icons/icon${size}.png`);
}
