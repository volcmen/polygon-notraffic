import { env } from '@repo/env';
import type { CreatePolygonInput, Point } from './types.ts';

// biome-ignore lint/nursery/useExplicitType: type inferred from env
const { IMAGE_HEIGHT, IMAGE_WIDTH } = env;
const MAX_POLYGON_NAME_LENGTH = 120;
const MAX_POLYGON_POINTS = 200;
const MIN_POLYGON_POINTS = 3;

const isPoint = (value: unknown): value is Point =>
	Array.isArray(value) &&
	value.length === 2 &&
	typeof value[0] === 'number' &&
	Number.isFinite(value[0]) &&
	typeof value[1] === 'number' &&
	Number.isFinite(value[1]);

const isPointInImageBounds = ([x, y]: Point): boolean => x >= 0 && x <= IMAGE_WIDTH && y >= 0 && y <= IMAGE_HEIGHT;

const parseCreatePolygonInput = (value: unknown): CreatePolygonInput => {
	if (!value || typeof value !== 'object') {
		throw new ValidationError('Request body must be an object.');
	}

	const candidate = value as Record<string, unknown>;
	const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';

	if (name.length === 0) {
		throw new ValidationError('Polygon name is required.');
	}

	if (name.length > MAX_POLYGON_NAME_LENGTH) {
		throw new ValidationError(`Polygon name must be at most ${MAX_POLYGON_NAME_LENGTH} characters.`);
	}

	if (!Array.isArray(candidate.points)) {
		throw new ValidationError('Polygon points must be an array.');
	}

	if (candidate.points.length < MIN_POLYGON_POINTS) {
		throw new ValidationError('A polygon requires at least 3 points.');
	}

	if (candidate.points.length > MAX_POLYGON_POINTS) {
		throw new ValidationError(`A polygon can have at most ${MAX_POLYGON_POINTS} points.`);
	}

	if (!candidate.points.every(isPoint)) {
		throw new ValidationError('Each point must be a numeric [x, y] pair.');
	}

	if (!candidate.points.every(isPointInImageBounds)) {
		throw new ValidationError(`Polygon points must stay within the ${IMAGE_WIDTH}x${IMAGE_HEIGHT} image bounds.`);
	}

	return {
		name,
		points: candidate.points,
	};
};

class ValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ValidationError';
	}
}

export {
	IMAGE_HEIGHT,
	IMAGE_WIDTH,
	MAX_POLYGON_NAME_LENGTH,
	MAX_POLYGON_POINTS,
	parseCreatePolygonInput,
	ValidationError,
};
