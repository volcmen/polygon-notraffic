import { afterEach, describe, expect, it } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createBunSqliteClient, createBunSqliteDatabase } from '../../../db/src/client.ts';
import { createPolygonRepository, createPolygonService } from '../../src/index.ts';

let tempDirectories: string[] = [];

interface TempDatabase {
	client: ReturnType<typeof createBunSqliteClient>;
	database: ReturnType<typeof createBunSqliteDatabase>;
	path: string;
}

const createTempDatabase = async (): Promise<TempDatabase> => {
	const directory = await mkdtemp(join(tmpdir(), 'polygon-db-'));
	tempDirectories.push(directory);
	const path = join(directory, 'polygons.sqlite');
	const client = createBunSqliteClient(path);
	const database = createBunSqliteDatabase(client);

	return { client, database, path };
};

afterEach(async () => {
	await Promise.all(tempDirectories.map((directory) => rm(directory, { force: true, recursive: true })));
	tempDirectories = [];
});

describe('file-backed polygon persistence', () => {
	it('persists polygons after reopening the Bun SQLite database', async () => {
		const firstConnection = await createTempDatabase();
		const created = await createPolygonService({
			delayMs: 0,
			repository: createPolygonRepository(firstConnection.database),
		}).createPolygon({
			name: 'Persisted zone',
			points: [
				[10, 10],
				[20, 10],
				[20, 20],
			],
		});
		firstConnection.client.close(false);

		const secondClient = createBunSqliteClient(firstConnection.path);
		const secondDatabase = createBunSqliteDatabase(secondClient);
		const polygons = await createPolygonService({
			delayMs: 0,
			repository: createPolygonRepository(secondDatabase),
		}).listPolygons();
		secondClient.close(false);

		expect(polygons).toEqual([created]);
	});
});
