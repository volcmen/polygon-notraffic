import { afterAll, beforeAll, mock } from 'bun:test';
import { eq, sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { cleanupTestDatabase, polygons, setupTestDatabaseWithData } from './test-utils.ts';

let globalTestDatabase: Awaited<ReturnType<typeof setupTestDatabaseWithData>> | null = null;

mock.module('@repo/db', () => ({
	checkDatabaseConnection: (database = getTestDatabase()) => {
		database.get(sql`select 1`);
		return true;
	},
	cleanupGlobalTestDatabase,
	cleanupTestDatabase,
	get db(): ReturnType<typeof getTestDatabase> {
		return getTestDatabase();
	},
	get eq(): typeof eq {
		return eq;
	},
	getDatabase: (): ReturnType<typeof getTestDatabase> => getTestDatabase(),
	get integer(): typeof integer {
		return integer;
	},
	get polygons(): typeof polygons {
		return polygons;
	},
	setupGlobalTestDatabase,
	setupTestDatabaseWithData,
	get sql(): typeof sql {
		return sql;
	},
	get sqliteTable(): typeof sqliteTable {
		return sqliteTable;
	},
	get text(): typeof text {
		return text;
	},
}));

beforeAll(async () => {
	await setupGlobalTestDatabase();
});

afterAll(async () => {
	await cleanupGlobalTestDatabase();
});

const getTestDatabase = (): NonNullable<typeof globalTestDatabase>['db'] => {
	if (globalTestDatabase?.db) {
		return globalTestDatabase.db;
	}

	throw new Error('Test database not initialized. Call setupGlobalTestDatabase() first.');
};

const setupGlobalTestDatabase = async (): Promise<NonNullable<typeof globalTestDatabase>> => {
	if (globalTestDatabase) {
		await cleanupTestDatabase(globalTestDatabase.client);
	}

	globalTestDatabase = await setupTestDatabaseWithData();
	return globalTestDatabase;
};

const cleanupGlobalTestDatabase = async (): Promise<void> => {
	if (globalTestDatabase?.client) {
		await cleanupTestDatabase(globalTestDatabase.client);
		globalTestDatabase = null;
	}
};

export { cleanupGlobalTestDatabase, getTestDatabase, setupGlobalTestDatabase };
