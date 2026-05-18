import { describe, expect, it } from 'bun:test';
import { getTestDatabase, setupGlobalTestDatabase } from '@repo/db/test-setup';
import { createPolygonRepository, createPolygonService } from '@repo/polygons';
import { createApp } from '../../src/index.ts';

const TEST_DELAY_MS = 100;

const createDelayedTestApp = async () => {
	await setupGlobalTestDatabase();
	return createApp({
		checkDatabase: async () => true,
		polygonService: createPolygonService({
			delayMs: TEST_DELAY_MS,
			repository: createPolygonRepository(getTestDatabase()),
		}),
	});
};

describe('server action delay', () => {
	it('create polygon request takes at least the configured delay', async () => {
		const app = await createDelayedTestApp();

		const start = Date.now();
		const response = await app.handle(
			new Request('http://localhost/api/polygons', {
				body: JSON.stringify({
					name: 'Delayed',
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
		const elapsed = Date.now() - start;

		expect(response.status).toBe(201);
		expect(elapsed).toBeGreaterThanOrEqual(TEST_DELAY_MS - 10);
	});

	it('list polygons request takes at least the configured delay', async () => {
		const app = await createDelayedTestApp();

		const start = Date.now();
		const response = await app.handle(new Request('http://localhost/api/polygons'));
		const elapsed = Date.now() - start;

		expect(response.status).toBe(200);
		expect(elapsed).toBeGreaterThanOrEqual(TEST_DELAY_MS - 10);
	});

	it('delete polygon request takes at least the configured delay', async () => {
		const app = await createDelayedTestApp();

		const start = Date.now();
		const response = await app.handle(new Request('http://localhost/api/polygons/1', { method: 'DELETE' }));
		const elapsed = Date.now() - start;

		expect(response.status).toBe(204);
		expect(elapsed).toBeGreaterThanOrEqual(TEST_DELAY_MS - 10);
	});
});
