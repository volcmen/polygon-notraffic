import { type createBunSqliteDatabase, eq, getDatabase, polygons, sql } from '@repo/db';
import { selectPolygonColor } from './color.ts';
import type { CreatePolygonInput, Polygon } from './types.ts';

type PolygonDatabase = ReturnType<typeof createBunSqliteDatabase>;

interface PolygonRepositoryImpl {
	create: (input: CreatePolygonInput) => Promise<Polygon>;
	delete: (id: number) => Promise<void>;
	list: () => Promise<Polygon[]>;
}

const mapPolygon = (row: typeof polygons.$inferSelect): Polygon => ({
	color: row.color,
	id: row.id,
	name: row.name,
	points: row.points,
});

const createPolygonRepository = (database: PolygonDatabase = getDatabase()): PolygonRepositoryImpl => {
	database.run(sql`
		CREATE TABLE IF NOT EXISTS polygons (
			id integer PRIMARY KEY AUTOINCREMENT,
			name text NOT NULL,
			points text NOT NULL,
			color text NOT NULL,
			created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`);

	return {
		async create(input: CreatePolygonInput): Promise<Polygon> {
			const color = selectPolygonColor(`${input.name}:${JSON.stringify(input.points)}`);
			const [row] = await database
				.insert(polygons)
				.values({ ...input, color })
				.returning();

			if (!row) {
				throw new Error('Polygon was not created.');
			}

			return mapPolygon(row);
		},

		async delete(id: number): Promise<void> {
			await database.delete(polygons).where(eq(polygons.id, id));
		},

		async list(): Promise<Polygon[]> {
			const rows = await database.select().from(polygons);
			return rows.map(mapPolygon);
		},
	};
};

export { createPolygonRepository };
