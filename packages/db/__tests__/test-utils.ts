import { Database } from 'bun:sqlite';
// biome-ignore lint/style/noExportedImports: used locally and re-exported
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/bun-sqlite';
// biome-ignore lint/performance/noNamespaceImport: required for drizzle schema
import * as schema from '../src/schema.ts';

// biome-ignore lint/nursery/useExplicitReturnType: complex return type with spread
// biome-ignore lint/nursery/useExplicitType: complex return type with spread
const setupTestDatabaseWithData = () => {
	const client = new Database(':memory:', { strict: true });
	const db = drizzle(client, {
		schema,
	});

	client.run(`
		CREATE TABLE IF NOT EXISTS polygons (
			id integer PRIMARY KEY AUTOINCREMENT,
			name text NOT NULL,
			points text NOT NULL,
			color text NOT NULL,
			created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`);

	return {
		client,
		db,
		sql,
		...schema,
	};
};

const cleanupTestDatabase = (client: Database): void => {
	client.close(false);
};

// biome-ignore lint/performance/noBarrelFile: re-export test utils
// biome-ignore lint/performance/noReExportAll: required for re-exporting schema
export * from '../src/schema.ts';
export { cleanupTestDatabase, setupTestDatabaseWithData, sql };
