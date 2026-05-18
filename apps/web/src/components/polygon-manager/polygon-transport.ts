import type { CreatePolygonInput, Polygon } from "@repo/polygons";

interface PolygonActions {
	createPolygonAction: (input: CreatePolygonInput) => Promise<Polygon>;
	deletePolygonAction: (id: number) => Promise<void>;
	listPolygonsAction: () => Promise<Polygon[]>;
}

type PolygonTransport = "api" | "server-action";

interface PolygonClient {
	create(input: CreatePolygonInput): Promise<Polygon>;
	delete(id: number): Promise<void>;
	list(signal?: AbortSignal): Promise<Polygon[]>;
}

const createPolygonClient = (actions: PolygonActions, transport: PolygonTransport): PolygonClient => {
	if (transport === "api") {
		return apiPolygonClient;
	}

	return {
		create: actions.createPolygonAction,
		delete: actions.deletePolygonAction,
		list: () => actions.listPolygonsAction(),
	};
};

const apiPolygonClient: PolygonClient = {
	async create(input) {
		const response = await fetch("/api/polygons", {
			body: JSON.stringify(input),
			headers: { "content-type": "application/json" },
			method: "POST",
		});

		if (!response.ok) {
			const payload = await response.json().catch(() => ({ error: "Could not save polygon." }));
			throw new Error(payload.error ?? "Could not save polygon.");
		}

		return (await response.json()) as Polygon;
	},

	async delete(id) {
		const response = await fetch(`/api/polygons/${id}`, { method: "DELETE" });

		if (!response.ok) {
			throw new Error("Could not delete polygon.");
		}
	},

	async list(signal) {
		const response = await fetch("/api/polygons", { signal });

		if (!response.ok) {
			throw new Error("Could not load polygons.");
		}

		return (await response.json()) as Polygon[];
	},
};

export type { PolygonActions, PolygonClient, PolygonTransport };
export { createPolygonClient };
