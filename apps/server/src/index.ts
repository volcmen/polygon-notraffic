import { cors } from '@elysiajs/cors';
import { checkDatabaseConnection } from '@repo/db';
import { env } from '@repo/env';
import { createPolygonService, ValidationError } from '@repo/polygons';
import { Elysia } from 'elysia';

const HTTP_CREATED = 201;
const HTTP_NO_CONTENT = 204;
const HTTP_BAD_REQUEST = 400;
const HTTP_SERVICE_UNAVAILABLE = 503;

interface ServerOptions {
	checkDatabase?: () => Promise<boolean>;
	corsOrigins?: string[];
	polygonService?: ReturnType<typeof createPolygonService>;
}

const isAllowedCorsOrigin = (origin: string | null, allowedOrigins: string[]): boolean =>
	origin === null || allowedOrigins.includes(origin);

// biome-ignore lint/nursery/useExplicitType: needed for type inference
// biome-ignore lint/nursery/useExplicitReturnType: Elysia return type is too complex to express explicitly
function createApp(options: ServerOptions = {}) {
	const corsOrigins = options.corsOrigins ?? env.POLYGON_CORS_ORIGINS;
	const checkDatabase = options.checkDatabase ?? checkDatabaseConnection;
	const getPolygonService = (): ReturnType<typeof createPolygonService> =>
		options.polygonService ?? createPolygonService();

	return new Elysia()
		.use(cors({ origin: (request: Request) => isAllowedCorsOrigin(request.headers.get('origin'), corsOrigins) }))
		.get('/', () => ({
			message: 'Welcome to polygonCanvasManager API',
			timestamp: new Date().toISOString(),
		}))
		.get('/healthz', () => {
			const status = 'ok';
			const timestamp = new Date().toISOString();
			return { status, timestamp };
		})
		.get('/livez', () => {
			return { status: 'ok' };
		})
		.get('/db/status', async ({ set }) => {
			const isHealthy = await Promise.resolve(checkDatabase()).catch(() => false);

			if (!isHealthy) {
				set.status = HTTP_SERVICE_UNAVAILABLE;
				return { status: 'error' };
			}

			return {
				status: 'ok',
			};
		})
		.get('/readyz', async ({ set }) => {
			const checks: Record<string, boolean> = {
				db: await Promise.resolve(checkDatabase()).catch(() => false),
			};

			const allHealthy = Object.values(checks).every(Boolean);

			if (!allHealthy) {
				set.status = HTTP_SERVICE_UNAVAILABLE;
				return {
					checks,
					status: 'not_ready',
				};
			}

			return {
				checks,
				status: 'ok',
			};
		})
		.get('/api/polygons', async () => {
			return await getPolygonService().listPolygons();
		})
		.post('/api/polygons', async ({ body, set }) => {
			try {
				set.status = HTTP_CREATED;
				return await getPolygonService().createPolygon(body);
			} catch (error) {
				if (error instanceof ValidationError) {
					set.status = HTTP_BAD_REQUEST;
					return { error: (error as Error).message };
				}

				throw error;
			}
		})
		.delete('/api/polygons/:id', async ({ params, set }) => {
			const id = Number(params.id);

			if (!Number.isInteger(id) || id <= 0) {
				set.status = HTTP_BAD_REQUEST;
				return { error: 'Polygon id must be a positive integer.' };
			}

			await getPolygonService().deletePolygon(id);
			set.status = HTTP_NO_CONTENT;
			return undefined;
		});
}

const app = createApp();

const registerShutdownSignals = (): void => {
	let isShuttingDown = false;

	const shutdown = async (signal: string): Promise<void> => {
		if (isShuttingDown) {
			return;
		}

		isShuttingDown = true;
		console.log(`Received ${signal}, shutting down server.`);

		try {
			await app.stop(true);
			process.exit(0);
		} catch (error) {
			console.error('Failed to stop server gracefully.', error);
			process.exit(1);
		}
	};

	process.once('SIGTERM', shutdown);
	process.once('SIGINT', shutdown);
};

if (import.meta.main) {
	registerShutdownSignals();
	app.listen(env.SERVER_PORT);
	console.log(`Server running at http://localhost:${env.SERVER_PORT}`);
}

type App = typeof app;

export type { App };
export { createApp };
