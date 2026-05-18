const HEALTHCHECK_TIMEOUT_MS = 2000;

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), HEALTHCHECK_TIMEOUT_MS);
const port: string = process.env.SERVER_PORT ?? '3001';

try {
	const response = await fetch(`http://127.0.0.1:${port}/healthz`, {
		signal: controller.signal,
	});

	process.exit(response.ok ? 0 : 1);
} catch {
	process.exit(1);
} finally {
	clearTimeout(timeout);
}
