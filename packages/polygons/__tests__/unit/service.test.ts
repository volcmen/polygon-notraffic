import { describe, expect, it } from 'bun:test';
import { getTestDatabase, setupGlobalTestDatabase } from '@repo/db/test-setup';
import { polygons } from '@repo/db/test-utils';
import { createPolygonRepository, createPolygonService, resolvePolygonActionDelayMs } from '@repo/polygons';

const POLYGON_P1_POINTS: [number, number][] = [
	[12.3, 12],
	[16.3, 12],
	[16.3, 8],
];
const POLYGON_FIRST_POINTS: [number, number][] = [
	[1, 1],
	[2, 1],
	[2, 2],
];
const POLYGON_SECOND_POINTS: [number, number][] = [
	[3, 3],
	[4, 3],
	[4, 4],
];
const POLYGON_STORED_POINTS: [number, number][] = [
	[7, 8],
	[9, 8],
	[9, 10],
];

const TEST_DELAY_OVERRIDE_0 = '0';
const TEST_DELAY_OVERRIDE_5000 = '5000';
const EXPECTED_DELAY_5000 = 5000;

describe('polygon service', () => {
	it('creates and fetches polygons in the required API format', async () => {
		await setupGlobalTestDatabase();
		const service = createPolygonService({
			delayMs: 0,
			repository: createPolygonRepository(getTestDatabase()),
		});

		const created = await service.createPolygon({
			name: 'P1',
			points: POLYGON_P1_POINTS,
		});

		expect(created).toEqual({
			color: expect.stringMatching(/^#[0-9a-f]{6}$/),
			id: 1,
			name: 'P1',
			points: POLYGON_P1_POINTS,
		});
		expect(await service.listPolygons()).toEqual([created]);
	});

	it('keeps polygon colors stable after reloads and deletes', async () => {
		await setupGlobalTestDatabase();
		const service = createPolygonService({
			delayMs: 0,
			repository: createPolygonRepository(getTestDatabase()),
		});
		const first = await service.createPolygon({
			name: 'First',
			points: POLYGON_FIRST_POINTS,
		});
		const second = await service.createPolygon({
			name: 'Second',
			points: POLYGON_SECOND_POINTS,
		});

		await service.deletePolygon(first.id);

		expect((await service.listPolygons())[0]).toEqual(second);
	});

	it('deletes only the requested polygon', async () => {
		await setupGlobalTestDatabase();
		const service = createPolygonService({
			delayMs: 0,
			repository: createPolygonRepository(getTestDatabase()),
		});
		const first = await service.createPolygon({
			name: 'First',
			points: POLYGON_FIRST_POINTS,
		});
		const second = await service.createPolygon({
			name: 'Second',
			points: POLYGON_SECOND_POINTS,
		});

		await service.deletePolygon(first.id);

		expect(await service.listPolygons()).toEqual([second]);
	});

	it('rejects invalid create payloads', async () => {
		const service = createPolygonService({ delayMs: 0 });

		await expect(
			service.createPolygon({
				name: 'Too few points',
				points: POLYGON_FIRST_POINTS.slice(0, 2),
			}),
		).rejects.toThrow('A polygon requires at least 3 points.');
	});

	it('runs without artificial delay by default and allows assignment delay overrides', () => {
		expect(resolvePolygonActionDelayMs({})).toBe(0);
		// biome-ignore lint/style/useNamingConvention: deliberate env var name
		expect(resolvePolygonActionDelayMs({ POLYGON_ACTION_DELAY_MS: TEST_DELAY_OVERRIDE_0 })).toBe(0);
		// biome-ignore lint/style/useNamingConvention: deliberate env var name
		expect(resolvePolygonActionDelayMs({ POLYGON_ACTION_DELAY_MS: TEST_DELAY_OVERRIDE_5000 })).toBe(
			EXPECTED_DELAY_5000,
		);
	});

	it('uses drizzle to persist JSON polygon points', async () => {
		await setupGlobalTestDatabase();
		const service = createPolygonService({
			delayMs: 0,
			repository: createPolygonRepository(getTestDatabase()),
		});

		await service.createPolygon({
			name: 'Stored',
			points: POLYGON_STORED_POINTS,
		});

		const rows = await getTestDatabase().select().from(polygons);
		expect(rows[0]?.points).toEqual(POLYGON_STORED_POINTS);
		expect(rows[0]?.color).toBeTruthy();
	});

	it('deletes a non-existent id without throwing', async () => {
		await setupGlobalTestDatabase();
		const service = createPolygonService({
			delayMs: 0,
			repository: createPolygonRepository(getTestDatabase()),
		});

		await expect(service.deletePolygon(9999)).resolves.toBeUndefined();
		expect(await service.listPolygons()).toEqual([]);
	});

	it('returns empty list when no polygons exist', async () => {
		await setupGlobalTestDatabase();
		const service = createPolygonService({
			delayMs: 0,
			repository: createPolygonRepository(getTestDatabase()),
		});

		expect(await service.listPolygons()).toEqual([]);
	});

	it('rejects create with missing name field', async () => {
		const service = createPolygonService({ delayMs: 0 });

		await expect(
			service.createPolygon({
				points: POLYGON_FIRST_POINTS,
			} as unknown),
		).rejects.toThrow('Polygon name is required.');
	});

	it('rejects create with non-object input', async () => {
		const service = createPolygonService({ delayMs: 0 });

		await expect(service.createPolygon(null)).rejects.toThrow('Request body must be an object.');
		await expect(service.createPolygon('string')).rejects.toThrow('Request body must be an object.');
		await expect(service.createPolygon(42)).rejects.toThrow('Request body must be an object.');
	});

	it('rejects create with points outside image bounds', async () => {
		const service = createPolygonService({ delayMs: 0 });

		await expect(
			service.createPolygon({
				name: 'OutOfBounds',
				points: [
					[-1, 0],
					[1, 0],
					[1, 1],
				],
			}),
		).rejects.toThrow('Polygon points must stay within the 1920x1080 image bounds.');
	});

	it('rejects create with too many points', async () => {
		const service = createPolygonService({ delayMs: 0 });
		const tooManyPoints = Array.from({ length: 201 }, (_, i) => [i, 1]);

		await expect(
			service.createPolygon({
				name: 'TooMany',
				points: tooManyPoints,
			}),
		).rejects.toThrow('A polygon can have at most 200 points.');
	});

	it('trims whitespace from polygon name', async () => {
		await setupGlobalTestDatabase();
		const service = createPolygonService({
			delayMs: 0,
			repository: createPolygonRepository(getTestDatabase()),
		});

		const created = await service.createPolygon({
			name: '  Trimmed  ',
			points: POLYGON_FIRST_POINTS,
		});

		expect(created.name).toBe('Trimmed');
	});
});
