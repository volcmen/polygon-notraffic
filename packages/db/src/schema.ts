import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const polygons = sqliteTable('polygons', {
	color: text('color').notNull(),
	createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	points: text('points', { mode: 'json' }).$type<[number, number][]>().notNull(),
});

type PolygonRow = typeof polygons.$inferSelect;
type NewPolygonRow = typeof polygons.$inferInsert;

export type { NewPolygonRow, PolygonRow };
export { polygons };
