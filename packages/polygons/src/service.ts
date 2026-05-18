import { resolvePolygonActionDelayMs } from './config.ts';
import { createPolygonRepository } from './repository.ts';
import type { Polygon } from './types.ts';
import { parseCreatePolygonInput } from './validation.ts';

type PolygonRepository = ReturnType<typeof createPolygonRepository>;

interface PolygonServiceOptions {
	delayMs?: number;
	repository?: PolygonRepository;
}

interface PolygonService {
	createPolygon: (input: unknown) => Promise<Polygon>;
	deletePolygon: (id: number) => Promise<void>;
	listPolygons: () => Promise<Polygon[]>;
}

const sleep = (delayMs: number): Promise<void> => {
	if (delayMs === 0) {
		return Promise.resolve();
	}

	return new Promise((resolve) => setTimeout(resolve, delayMs));
};

const createPolygonService = (options: PolygonServiceOptions = {}): PolygonService => {
	const repository = options.repository ?? createPolygonRepository();
	const delayMs = options.delayMs ?? resolvePolygonActionDelayMs();

	return {
		async createPolygon(input: unknown): Promise<Polygon> {
			await sleep(delayMs);
			return repository.create(parseCreatePolygonInput(input));
		},

		async deletePolygon(id: number): Promise<void> {
			await sleep(delayMs);
			await repository.delete(id);
		},

		async listPolygons(): Promise<Polygon[]> {
			await sleep(delayMs);
			return repository.list();
		},
	};
};

export type { CreatePolygonInput, Polygon } from './types.ts';
export { createPolygonService };
