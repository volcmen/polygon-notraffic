import { env } from '@repo/env';
import { defineConfig } from 'drizzle-kit';
import { resolveDatabasePath } from './src/path-utils.ts';

export default defineConfig({
	dbCredentials: {
		url: resolveDatabasePath(env.SQLITE_DB_PATH),
	},
	dialect: 'sqlite',
	out: './drizzle',
	schema: './src/schema.ts',
});
