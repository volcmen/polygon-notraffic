import { env } from '@repo/env';

const resolvePolygonActionDelayMs = (envOverride?: Record<string, string | undefined>): number => {
	if (envOverride && envOverride.POLYGON_ACTION_DELAY_MS !== undefined) {
		const parsedValue = Number(envOverride.POLYGON_ACTION_DELAY_MS);
		return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : 0;
	}
	return env.POLYGON_ACTION_DELAY_MS;
};

export { resolvePolygonActionDelayMs };
