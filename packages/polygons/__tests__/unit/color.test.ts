import { describe, expect, it } from 'bun:test';
import { faker } from '@faker-js/faker';
import fc from 'fast-check';
import { selectPolygonColor } from '../../src/color.ts';

describe('polygon colors', () => {
	it('selects deterministic hex colors for arbitrary seeds', () => {
		fc.assert(
			fc.property(fc.string(), (seed) => {
				const color = selectPolygonColor(seed);

				expect(color).toMatch(/^#[0-9a-f]{6}$/);
				expect(selectPolygonColor(seed)).toBe(color);
			}),
		);
	});

	it('does not depend on ambient faker randomness', () => {
		faker.seed(123);
		const seed = faker.string.uuid();
		const color = selectPolygonColor(seed);

		faker.seed(987);

		expect(selectPolygonColor(seed)).toBe(color);
	});

	it('produces different colors for different seeds', () => {
		const color1 = selectPolygonColor('seed-a');
		const color2 = selectPolygonColor('seed-b');

		expect(color1).not.toBe(color2);
	});

	it('produces a valid hex color for an empty string seed', () => {
		const color = selectPolygonColor('');

		expect(color).toMatch(/^#[0-9a-f]{6}$/);
	});

	it('produces a valid hex color for a very long seed', () => {
		const longSeed = 'a'.repeat(10_000);
		const color = selectPolygonColor(longSeed);

		expect(color).toMatch(/^#[0-9a-f]{6}$/);
	});

	it('produces colors within readable HSL range', () => {
		fc.assert(
			fc.property(fc.string(), (seed) => {
				const color = selectPolygonColor(seed);
				const hex = color.slice(1);
				const r = Number.parseInt(hex.slice(0, 2), 16);
				const g = Number.parseInt(hex.slice(2, 4), 16);
				const b = Number.parseInt(hex.slice(4, 6), 16);

				const max = Math.max(r, g, b) / 255;
				const min = Math.min(r, g, b) / 255;
				const lightness = (max + min) / 2;

				expect(lightness).toBeGreaterThanOrEqual(0.35);
				expect(lightness).toBeLessThanOrEqual(0.65);
			}),
		);
	});
});
