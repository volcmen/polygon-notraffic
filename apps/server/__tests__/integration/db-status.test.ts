import { describe, expect, it } from 'bun:test';
import { createApp } from '../../src/index.ts';

describe('Database status', () => {
	it('should select from the configured database through the Elysia route', async () => {
		const response = await createApp().handle(new Request('http://localhost/db/status'));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual({ status: 'ok' });
	});
});
