import { z } from "zod";

const envSchema = z.object({
	IMAGE_HEIGHT: z.coerce.number().int().positive().default(1080),
	IMAGE_WIDTH: z.coerce.number().int().positive().default(1920),
	NEXT_PUBLIC_POLYGON_TRANSPORT: z.enum(["api", "server-action"]).default("server-action"),
	POLYGON_ACTION_DELAY_MS: z.coerce.number().min(0).default(0),
	POLYGON_API_ORIGIN: z.string().default("http://localhost:3001"),
	POLYGON_CORS_ORIGINS: z
		.string()
		.default("http://localhost:3000")
		.transform((value) =>
			value
				.split(",")
				.map((origin) => origin.trim())
				.filter(Boolean),
		),
	SERVER_PORT: z.coerce.number().int().positive().default(3001),
	SQLITE_DB_PATH: z.string().default("./data/polygons.sqlite"),
});

export const env = envSchema.parse({
	IMAGE_HEIGHT: process.env.IMAGE_HEIGHT,
	IMAGE_WIDTH: process.env.IMAGE_WIDTH,
	NEXT_PUBLIC_POLYGON_TRANSPORT: process.env.NEXT_PUBLIC_POLYGON_TRANSPORT,
	POLYGON_ACTION_DELAY_MS: process.env.POLYGON_ACTION_DELAY_MS,
	POLYGON_API_ORIGIN: process.env.POLYGON_API_ORIGIN,
	POLYGON_CORS_ORIGINS: process.env.POLYGON_CORS_ORIGINS,
	SERVER_PORT: process.env.SERVER_PORT,
	SQLITE_DB_PATH: process.env.SQLITE_DB_PATH,
});
