import { afterEach, describe, expect, it, mock } from "bun:test";
import type { CreatePolygonInput, Polygon } from "@repo/polygons";
import { createPolygonClient } from "../../../src/components/polygon-manager/polygon-transport";

const actions = {
	createPolygonAction: mock(
		async (input: CreatePolygonInput): Promise<Polygon> => ({ color: "#2563eb", id: 1, ...input }),
	),
	deletePolygonAction: mock(async () => undefined),
	listPolygonsAction: mock(async (): Promise<Polygon[]> => []),
};

describe("polygon transport", () => {
	afterEach(() => {
		mock.restore();
	});

	it("delegates server-action transport to injected actions", async () => {
		const client = createPolygonClient(actions, "server-action");
		const input = createInput();

		await client.create(input);
		await client.delete(1);
		await client.list();

		expect(actions.createPolygonAction).toHaveBeenCalledWith(input);
		expect(actions.deletePolygonAction).toHaveBeenCalledWith(1);
		expect(actions.listPolygonsAction).toHaveBeenCalled();
	});

	it("calls API endpoints with the expected requests", async () => {
		const input = createInput();
		const polygon = { color: "#2563eb", id: 3, ...input };
		const fetchMock = mock((url: string, init?: RequestInit) =>
			Promise.resolve(
				new Response(JSON.stringify(url === "/api/polygons" && init?.method === "POST" ? polygon : [polygon]), {
					status: init?.method === "POST" ? 201 : 200,
				}),
			),
		);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const client = createPolygonClient(actions, "api");

		expect(await client.create(input)).toEqual(polygon);
		expect(await client.list()).toEqual([polygon]);
		await client.delete(3);

		expect(fetchMock).toHaveBeenCalledWith("/api/polygons", {
			body: JSON.stringify(input),
			headers: { "content-type": "application/json" },
			method: "POST",
		});
		expect(fetchMock).toHaveBeenCalledWith("/api/polygons", { signal: undefined });
		expect(fetchMock).toHaveBeenCalledWith("/api/polygons/3", { method: "DELETE" });
	});

	it("passes abort signals to API list requests", async () => {
		const controller = new AbortController();
		const fetchMock = mock(() => Promise.resolve(new Response(JSON.stringify([]), { status: 200 })));
		globalThis.fetch = fetchMock as unknown as typeof fetch;
		const client = createPolygonClient(actions, "api");

		await client.list(controller.signal);

		expect(fetchMock).toHaveBeenCalledWith("/api/polygons", { signal: controller.signal });
	});

	it("surfaces API error messages", async () => {
		globalThis.fetch = mock((url: string) => {
			if (url === "/api/polygons") {
				return Promise.resolve(new Response(JSON.stringify({ error: "Invalid polygon" }), { status: 400 }));
			}

			return Promise.resolve(new Response(null, { status: 500 }));
		}) as unknown as typeof fetch;
		const client = createPolygonClient(actions, "api");

		await expect(client.create(createInput())).rejects.toThrow("Invalid polygon");
		await expect(client.list()).rejects.toThrow("Could not load polygons.");
		await expect(client.delete(1)).rejects.toThrow("Could not delete polygon.");
	});

	it("uses default error message when API returns non-JSON error body", async () => {
		globalThis.fetch = mock(() =>
			Promise.resolve(new Response("not json", { status: 400 })),
		) as unknown as typeof fetch;
		const client = createPolygonClient(actions, "api");

		await expect(client.create(createInput())).rejects.toThrow("Could not save polygon.");
	});

	it("uses default error message when API returns JSON without error field", async () => {
		globalThis.fetch = mock(() =>
			Promise.resolve(new Response(JSON.stringify({ message: "something else" }), { status: 400 })),
		) as unknown as typeof fetch;
		const client = createPolygonClient(actions, "api");

		await expect(client.create(createInput())).rejects.toThrow("Could not save polygon.");
	});

	it("handles 500 server error on list", async () => {
		globalThis.fetch = mock(() =>
			Promise.resolve(new Response("Internal Server Error", { status: 500 })),
		) as unknown as typeof fetch;
		const client = createPolygonClient(actions, "api");

		await expect(client.list()).rejects.toThrow("Could not load polygons.");
	});

	it("handles 500 server error on delete", async () => {
		globalThis.fetch = mock(() =>
			Promise.resolve(new Response("Internal Server Error", { status: 500 })),
		) as unknown as typeof fetch;
		const client = createPolygonClient(actions, "api");

		await expect(client.delete(1)).rejects.toThrow("Could not delete polygon.");
	});

	it("handles network error on create", async () => {
		globalThis.fetch = mock(() => Promise.reject(new Error("Network error"))) as unknown as typeof fetch;
		const client = createPolygonClient(actions, "api");

		await expect(client.create(createInput())).rejects.toThrow("Network error");
	});

	it("handles successful delete with 204 response", async () => {
		globalThis.fetch = mock(() =>
			Promise.resolve(new Response(null, { status: 204 })),
		) as unknown as typeof fetch;
		const client = createPolygonClient(actions, "api");

		await expect(client.delete(42)).resolves.toBeUndefined();
	});
});

const createInput = (): CreatePolygonInput => ({
	name: "Zone",
	points: [
		[1, 1],
		[2, 1],
		[2, 2],
	],
});
