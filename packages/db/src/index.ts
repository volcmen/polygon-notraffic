// biome-ignore lint/performance/noBarrelFile: drizzle re-exports for convenience
export { eq, sql } from 'drizzle-orm';
export { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export {
	checkDatabaseConnection,
	createBunSqliteClient,
	createBunSqliteDatabase,
	getDatabase,
} from './client.ts';
export { resolveDatabasePath } from './path-utils.ts';
export type { NewPolygonRow, PolygonRow } from './schema.ts';
export { polygons } from './schema.ts';
