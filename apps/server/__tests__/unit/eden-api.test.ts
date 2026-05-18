import { describe, expect, it } from 'bun:test';
import { treaty } from '@elysia/eden';
import { getTestDatabase, setupGlobalTestDatabase } from '@repo/db/test-setup';
import { createPolygonRepository, createPolygonService } from '@repo/polygons';
import { createApp } from '../../src/index.ts';

const TEST_POINTS: [number, number][] = [
	[12.3, 12],
	[16.3, 12],
	[16.3, 8],
];

// biome-ignore lint/nursery/useExplicitReturnType: test helper relies on Eden route inference
// biome-ignore lint/nursery/useExplicitType: test helper relies on Eden route inference
const createTestApi = async () => {
	await setupGlobalTestDatabase();

	return treaty(
		createApp({
			checkDatabase: async () => true,
			polygonService: createPolygonService({
				delayMs: 0,
				repository: createPolygonRepository(getTestDatabase()),
			}),
		}),
	);
};

describe('server Eden API', () => {
	it('returns health and readiness responses through Eden', async () => {
		const api = treaty(createApp({ checkDatabase: async () => true }));

		const health = await api.healthz.get();
		const live = await api.livez.get();
		const ready = await api.readyz.get();
		const database = await api.db.status.get();

		expect(health.status).toBe(200);
		expect(health.data).toEqual(
			expect.objectContaining({
				status: 'ok',
			}),
		);
		expect(live.status).toBe(200);
		expect(live.data).toEqual({ status: 'ok' });
		expect(ready.status).toBe(200);
		expect(ready.data).toEqual({
			checks: {
				db: true,
			},
			status: 'ok',
		});
		expect(database.status).toBe(200);
		expect(database.data).toEqual({ status: 'ok' });
	});

	it('creates, lists, and deletes polygons through Eden', async () => {
		const api = await createTestApi();

		const created = await api.api.polygons.post({
			name: 'P1',
			points: TEST_POINTS,
		});

		expect(created.status).toBe(201);
		expect(created.data).toEqual({
			color: expect.stringMatching(/^#[0-9a-f]{6}$/),
			id: 1,
			name: 'P1',
			points: TEST_POINTS,
		});

		const listedBeforeDelete = await api.api.polygons.get();
		expect(listedBeforeDelete.status).toBe(200);
		expect(listedBeforeDelete.data).toEqual([
			{
				color: expect.stringMatching(/^#[0-9a-f]{6}$/),
				id: 1,
				name: 'P1',
				points: TEST_POINTS,
			},
		]);

		const deleted = await api.api.polygons({ id: '1' }).delete();
		expect(deleted.status).toBe(204);
		expect(deleted.data).toBe('');

		const listedAfterDelete = await api.api.polygons.get();
		expect(listedAfterDelete.data).toEqual([]);
	});

	it('returns typed error responses for invalid API calls through Eden', async () => {
		const api = await createTestApi();

		const invalidCreate = await api.api.polygons.post({
			name: 'Invalid',
			points: [
				[1, 1],
				[2, 1],
			],
		});
		const invalidDelete = await api.api.polygons({ id: 'abc' }).delete();
		const notReady = await treaty(createApp({ checkDatabase: async () => false })).readyz.get();

		expect(invalidCreate.status).toBe(400);
		expect(invalidCreate.data).toBeNull();
		expect(invalidCreate.error?.value as unknown).toEqual({ error: 'A polygon requires at least 3 points.' });
		expect(invalidDelete.status).toBe(400);
		expect(invalidDelete.error?.value as unknown).toEqual({ error: 'Polygon id must be a positive integer.' });
		expect(notReady.status).toBe(503);
		expect(notReady.error?.value).toEqual({
			checks: {
				db: false,
			},
			status: 'not_ready',
		});
	});

	it('deletes a non-existent polygon id through Eden without error', async () => {
		const api = await createTestApi();

		const result = await api.api.polygons({ id: '9999' }).delete();

		expect(result.status).toBe(204);
	});

	it('creates multiple polygons and lists them in order through Eden', async () => {
		const api = await createTestApi();

		await api.api.polygons.post({
			name: 'Alpha',
			points: [
				[10, 10],
				[20, 10],
				[20, 20],
			],
		});
		await api.api.polygons.post({
			name: 'Beta',
			points: [
				[30, 30],
				[40, 30],
				[40, 40],
			],
		});

		const listed = await api.api.polygons.get();
		expect(listed.status).toBe(200);
		expect((listed.data as Array<{ name: string }>).map((p) => p.name)).toEqual(['Alpha', 'Beta']);
	});

	it('returns the root welcome endpoint through raw request', async () => {
		const app = createApp();

		const response = await app.handle(new Request('http://localhost/'));

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toHaveProperty('message');
		expect(body).toHaveProperty('timestamp');
	});
});
