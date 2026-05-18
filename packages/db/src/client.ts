import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { env } from '@repo/env';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { resolveDatabasePath } from './path-utils.ts';
// biome-ignore lint/performance/noNamespaceImport: needed for drizzle schema type inference
import * as schema from './schema.ts';

let defaultDatabase: ReturnType<typeof createBunSqliteDatabase> | null = null;

const createBunSqliteClient = (dbPath = env.SQLITE_DB_PATH): Database => {
	const resolvedPath = resolveDatabasePath(dbPath);
	if (resolvedPath !== ':memory:') {
		mkdirSync(dirname(resolvedPath), { recursive: true });
	}

	return new Database(resolvedPath, { create: true, strict: true });
};

const createBunSqliteDatabase = (client = createBunSqliteClient()): ReturnType<typeof drizzle<typeof schema>> =>
	drizzle(client, {
		schema,
	});

const getDatabase = (): NonNullable<typeof defaultDatabase> => {
	defaultDatabase ??= createBunSqliteDatabase();
	return defaultDatabase;
};

const checkDatabaseConnection = (database = getDatabase()): boolean => {
	database.get(sql`select 1`);
	return true;
};

export { checkDatabaseConnection, createBunSqliteClient, createBunSqliteDatabase, getDatabase };
