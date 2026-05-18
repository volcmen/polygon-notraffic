import { describe, expect, it } from 'bun:test';
import { faker } from '@faker-js/faker';
import { parseCreatePolygonInput, ValidationError } from '@repo/polygons';
import fc from 'fast-check';
import type { Point } from '../../src/types.ts';

const pointArbitrary = fc.tuple(
	fc.double({ max: 1920, min: 0, noDefaultInfinity: true, noNaN: true }),
	fc.double({ max: 1080, min: 0, noDefaultInfinity: true, noNaN: true }),
) as fc.Arbitrary<Point>;

describe('parseCreatePolygonInput', () => {
	it('accepts valid generated polygons and trims generated names', () => {
		fc.assert(
			fc.property(fc.array(pointArbitrary, { maxLength: 12, minLength: 3 }), (points) => {
				const name = `  ${faker.location.street()} zone  `;

				expect(parseCreatePolygonInput({ name, points })).toEqual({
					name: name.trim(),
					points,
				});
			}),
		);
	});

	it('rejects generated polygons with too few points', () => {
		fc.assert(
			fc.property(fc.array(pointArbitrary, { maxLength: 2 }), (points) => {
				expect(() => parseCreatePolygonInput({ name: faker.company.name(), points })).toThrow(ValidationError);
			}),
		);
	});

	it('rejects non-finite coordinate values', () => {
		fc.assert(
			fc.property(fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY), (coordinate) => {
				expect(() =>
					parseCreatePolygonInput({
						name: faker.company.name(),
						points: [
							[coordinate, 0],
							[1, 1],
							[2, 2],
						],
					}),
				).toThrow('Each point must be a numeric [x, y] pair.');
			}),
		);
	});

	it('rejects polygon names that exceed the domain limit', () => {
		expect(() =>
			parseCreatePolygonInput({
				name: 'a'.repeat(121),
				points: [
					[0, 0],
					[1, 0],
					[1, 1],
				],
			}),
		).toThrow('Polygon name must be at most 120 characters.');
	});

	it('rejects polygon point arrays that exceed the domain limit', () => {
		expect(() =>
			parseCreatePolygonInput({
				name: faker.company.name(),
				points: Array.from({ length: 201 }, (_, index) => [index, 1] as Point),
			}),
		).toThrow('A polygon can have at most 200 points.');
	});

	it('rejects generated coordinates outside the 1920x1080 image bounds', () => {
		fc.assert(
			fc.property(
				fc.constantFrom([-1, 0], [1921, 0], [0, -1], [0, 1081]) as fc.Arbitrary<Point>,
				(outOfBoundsPoint) => {
					expect(() =>
						parseCreatePolygonInput({
							name: faker.company.name(),
							points: [outOfBoundsPoint, [1, 0], [1, 1]],
						}),
					).toThrow('Polygon points must stay within the 1920x1080 image bounds.');
				},
			),
		);
	});
});
