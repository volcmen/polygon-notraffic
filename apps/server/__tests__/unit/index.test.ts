import { describe, expect, it } from 'bun:test';
import { getTestDatabase, setupGlobalTestDatabase } from '@repo/db/test-setup';
import { createPolygonRepository, createPolygonService } from '@repo/polygons';
import { createApp } from '../../src/index.ts';

const P1_POINTS: [number, number][] = [
	[12.3, 12],
	[16.3, 12],
	[16.3, 8],
];

// biome-ignore lint/nursery/useExplicitReturnType: test helper
// biome-ignore lint/nursery/useExplicitType: test helper
const createTestApp = async () => {
	await setupGlobalTestDatabase();
	return createApp({
		checkDatabase: async () => true,
		polygonService: createPolygonService({
			delayMs: 0,
			repository: createPolygonRepository(getTestDatabase()),
		}),
	});
};

describe('server', () => {
	it('responds to health checks', async () => {
		const response = await createApp({ checkDatabase: async () => true }).handle(
			new Request('http://localhost/healthz'),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(
			expect.objectContaining({
				status: 'ok',
			}),
		);
	});

	it('creates and fetches polygons through the Bun API', async () => {
		const app = await createTestApp();
		const createResponse = await app.handle(
			new Request('http://localhost/api/polygons', {
				body: JSON.stringify({
					name: 'P1',
					points: P1_POINTS,
				}),
				headers: { 'content-type': 'application/json' },
				method: 'POST',
			}),
		);

		expect(createResponse.status).toBe(201);
		expect(await createResponse.json()).toEqual({
			color: expect.stringMatching(/^#[0-9a-f]{6}$/),
			id: 1,
			name: 'P1',
			points: P1_POINTS,
		});

		const listResponse = await app.handle(new Request('http://localhost/api/polygons'));
		expect(await listResponse.json()).toEqual([
			{
				color: expect.stringMatching(/^#[0-9a-f]{6}$/),
				id: 1,
				name: 'P1',
				points: P1_POINTS,
			},
		]);
	});

	it('deletes polygons through the Bun API', async () => {
		const app = await createTestApp();
		await app.handle(
			new Request('http://localhost/api/polygons', {
				body: JSON.stringify({
					name: 'P1',
					points: [
						[1, 1],
						[2, 1],
						[2, 2],
					],
				}),
				headers: { 'content-type': 'application/json' },
				method: 'POST',
			}),
		);

		const deleteResponse = await app.handle(new Request('http://localhost/api/polygons/1', { method: 'DELETE' }));
		expect(deleteResponse.status).toBe(204);

		const listResponse = await app.handle(new Request('http://localhost/api/polygons'));
		expect(await listResponse.json()).toEqual([]);
	});

	it('rejects invalid delete polygon ids', async () => {
		const app = await createTestApp();

		const textIdResponse = await app.handle(new Request('http://localhost/api/polygons/abc', { method: 'DELETE' }));
		const zeroIdResponse = await app.handle(new Request('http://localhost/api/polygons/0', { method: 'DELETE' }));

		expect(textIdResponse.status).toBe(400);
		expect(await textIdResponse.json()).toEqual({ error: 'Polygon id must be a positive integer.' });
		expect(zeroIdResponse.status).toBe(400);
		expect(await zeroIdResponse.json()).toEqual({ error: 'Polygon id must be a positive integer.' });
	});

	it('returns unhealthy database status responses when database checks fail', async () => {
		const app = createApp({ checkDatabase: async () => false });

		const dbStatusResponse = await app.handle(new Request('http://localhost/db/status'));
		const readyResponse = await app.handle(new Request('http://localhost/readyz'));

		expect(dbStatusResponse.status).toBe(503);
		expect(await dbStatusResponse.json()).toEqual({ status: 'error' });
		expect(readyResponse.status).toBe(503);
		expect(await readyResponse.json()).toEqual({
			checks: {
				db: false,
			},
			status: 'not_ready',
		});
	});

	it('does not expose fake readiness dependencies', async () => {
		const response = await createApp({ checkDatabase: async () => true }).handle(
			new Request('http://localhost/readyz'),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			checks: {
				db: true,
			},
			status: 'ok',
		});
	});

	it('limits CORS responses to configured origins', async () => {
		const app = createApp({
			checkDatabase: async () => true,
			corsOrigins: ['http://localhost:3000'],
		});

		const allowedResponse = await app.handle(
			new Request('http://localhost/api/polygons', {
				headers: { origin: 'http://localhost:3000' },
				method: 'OPTIONS',
			}),
		);
		const deniedResponse = await app.handle(
			new Request('http://localhost/api/polygons', {
				headers: { origin: 'https://evil.example' },
				method: 'OPTIONS',
			}),
		);

		expect(allowedResponse.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
		expect(deniedResponse.headers.get('access-control-allow-origin')).toBeNull();
	});

	it('returns validation errors for invalid polygon payloads', async () => {
		const app = await createTestApp();
		const response = await app.handle(
			new Request('http://localhost/api/polygons', {
				body: JSON.stringify({
					name: 'Invalid',
					points: [
						[1, 1],
						[2, 1],
					],
				}),
				headers: { 'content-type': 'application/json' },
				method: 'POST',
			}),
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'A polygon requires at least 3 points.' });
	});

	it('deletes a non-existent polygon id without error', async () => {
		const app = await createTestApp();

		const deleteResponse = await app.handle(new Request('http://localhost/api/polygons/9999', { method: 'DELETE' }));
		expect(deleteResponse.status).toBe(204);
	});

	it('rejects create with missing name', async () => {
		const app = await createTestApp();
		const response = await app.handle(
			new Request('http://localhost/api/polygons', {
				body: JSON.stringify({
					points: [
						[1, 1],
						[2, 1],
						[2, 2],
					],
				}),
				headers: { 'content-type': 'application/json' },
				method: 'POST',
			}),
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'Polygon name is required.' });
	});

	it('rejects create with empty name', async () => {
		const app = await createTestApp();
		const response = await app.handle(
			new Request('http://localhost/api/polygons', {
				body: JSON.stringify({
					name: '',
					points: [
						[1, 1],
						[2, 1],
						[2, 2],
					],
				}),
				headers: { 'content-type': 'application/json' },
				method: 'POST',
			}),
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'Polygon name is required.' });
	});

	it('rejects create with non-array points', async () => {
		const app = await createTestApp();
		const response = await app.handle(
			new Request('http://localhost/api/polygons', {
				body: JSON.stringify({
					name: 'Bad',
					points: 'not-an-array',
				}),
				headers: { 'content-type': 'application/json' },
				method: 'POST',
			}),
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'Polygon points must be an array.' });
	});

	it('rejects create with non-numeric point coordinates', async () => {
		const app = await createTestApp();
		const response = await app.handle(
			new Request('http://localhost/api/polygons', {
				body: JSON.stringify({
					name: 'Bad',
					points: [
						['a', 'b'],
						[2, 1],
						[2, 2],
					],
				}),
				headers: { 'content-type': 'application/json' },
				method: 'POST',
			}),
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'Each point must be a numeric [x, y] pair.' });
	});

	it('rejects create with points outside image bounds', async () => {
		const app = await createTestApp();
		const response = await app.handle(
			new Request('http://localhost/api/polygons', {
				body: JSON.stringify({
					name: 'OutOfBounds',
					points: [
						[-1, 0],
						[1, 0],
						[1, 1],
					],
				}),
				headers: { 'content-type': 'application/json' },
				method: 'POST',
			}),
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'Polygon points must stay within the 1920x1080 image bounds.' });
	});

	it('rejects create with too many points', async () => {
		const app = await createTestApp();
		const tooManyPoints = Array.from({ length: 201 }, (_, i) => [i, 1]);
		const response = await app.handle(
			new Request('http://localhost/api/polygons', {
				body: JSON.stringify({
					name: 'TooMany',
					points: tooManyPoints,
				}),
				headers: { 'content-type': 'application/json' },
				method: 'POST',
			}),
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'A polygon can have at most 200 points.' });
	});

	it('trims whitespace from polygon name on create', async () => {
		const app = await createTestApp();
		const createResponse = await app.handle(
			new Request('http://localhost/api/polygons', {
				body: JSON.stringify({
					name: '  TrimmedName  ',
					points: [
						[10, 10],
						[20, 10],
						[20, 20],
					],
				}),
				headers: { 'content-type': 'application/json' },
				method: 'POST',
			}),
		);

		expect(createResponse.status).toBe(201);
		const created = await createResponse.json();
		expect(created.name).toBe('TrimmedName');
	});

	it('handles create with non-object body', async () => {
		const app = await createTestApp();
		const response = await app.handle(
			new Request('http://localhost/api/polygons', {
				body: JSON.stringify('just-a-string'),
				headers: { 'content-type': 'application/json' },
				method: 'POST',
			}),
		);

		expect(response.status).toBe(400);
	});

	it('creates multiple polygons and lists them in order', async () => {
		const app = await createTestApp();

		await app.handle(
			new Request('http://localhost/api/polygons', {
				body: JSON.stringify({
					name: 'First',
					points: [
						[1, 1],
						[2, 1],
						[2, 2],
					],
				}),
				headers: { 'content-type': 'application/json' },
				method: 'POST',
			}),
		);
		await app.handle(
			new Request('http://localhost/api/polygons', {
				body: JSON.stringify({
					name: 'Second',
					points: [
						[3, 3],
						[4, 3],
						[4, 4],
					],
				}),
				headers: { 'content-type': 'application/json' },
				method: 'POST',
			}),
		);

		const listResponse = await app.handle(new Request('http://localhost/api/polygons'));
		const polygons = await listResponse.json();
		expect(polygons).toHaveLength(2);
		expect(polygons[0].name).toBe('First');
		expect(polygons[1].name).toBe('Second');
	});

	it('returns the root welcome endpoint', async () => {
		const response = await createApp().handle(new Request('http://localhost/'));
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toHaveProperty('message');
		expect(body).toHaveProperty('timestamp');
	});

	it('returns livez endpoint', async () => {
		const response = await createApp().handle(new Request('http://localhost/livez'));
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: 'ok' });
	});
});
