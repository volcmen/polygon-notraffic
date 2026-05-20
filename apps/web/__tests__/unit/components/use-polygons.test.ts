import { describe, expect, it, mock } from "bun:test";
import { faker } from "@faker-js/faker";
import type { Polygon } from "@repo/polygons";
import { act, renderHook, waitFor } from "@testing-library/react";
import fc from "fast-check";
import { POLYGON_COLOR } from "../../../src/components/polygon-manager/constants";
import { usePolygons } from "../../../src/components/polygon-manager/hooks/use-polygons";
import type { PolygonClient } from "../../../src/components/polygon-manager/polygon-transport";

const generatePolygon = (id: number): Polygon => ({
	id,
	name: faker.location.street(),
	color: faker.color.rgb(),
	points: Array.from({ length: faker.number.int({ min: 3, max: 10 }) }, () => [
		faker.number.int({ min: 0, max: 1920 }),
		faker.number.int({ min: 0, max: 1080 }),
	]),
});

const polygonArbitrary = fc.record({
	id: fc.integer({ min: 1, max: 10000 }),
	name: fc.string({ minLength: 1, maxLength: 100 }),
	color: fc.string({ minLength: 6, maxLength: 6 }).map((c) => `#${c}`),
	points: fc.array(fc.tuple(fc.integer({ min: 0, max: 1920 }), fc.integer({ min: 0, max: 1080 })), {
		minLength: 3,
		maxLength: 20,
	}),
});

describe("usePolygons", () => {
	const createMockClient = (overrides?: Partial<PolygonClient>): PolygonClient => ({
		create: mock(async () => generatePolygon(1)),
		delete: mock(async () => undefined),
		list: mock(async () => []),
		...overrides,
	});

	it("loads arbitrary polygons successfully", async () => {
		await fc.assert(
			fc.asyncProperty(fc.array(polygonArbitrary, { maxLength: 10 }), async (polygons) => {
				const client = createMockClient({
					list: mock(async () => polygons),
				});
				const { result } = renderHook(() => usePolygons(client));

				expect(result.current.isLoading).toBe(true);
				expect(result.current.polygons).toEqual([]);

				await waitFor(() => {
					expect(result.current.isLoading).toBe(false);
				});

				expect(result.current.polygons).toEqual(polygons);
				expect(result.current.error).toBeNull();
			}),
			{ numRuns: 20 },
		);
	});

	it("handles load errors", async () => {
		const errorMessage = faker.lorem.sentence();
		const client = createMockClient({
			list: mock(async () => {
				throw new Error(errorMessage);
			}),
		});
		const { result } = renderHook(() => usePolygons(client));

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.polygons).toEqual([]);
		expect(result.current.error).toBe(errorMessage);
	});

	it("creates an arbitrary valid polygon successfully", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc
					.string({ minLength: 1 })
					.map((s) => s.trim())
					.filter((s) => s.length > 0),
				fc.array(fc.tuple(fc.integer(), fc.integer()), { minLength: 3, maxLength: 15 }),
				async (name, points) => {
					const newPolygon = { id: faker.number.int({ min: 1, max: 100 }), name, color: "#2563eb", points };
					const client = createMockClient({
						list: mock(async () => []),
						create: mock(async () => newPolygon),
					});
					const { result } = renderHook(() => usePolygons(client));

					await waitFor(() => {
						expect(result.current.isLoading).toBe(false);
					});

					let promise: Promise<boolean>;
					act(() => {
						promise = result.current.createPolygon({ name, points });
					});

					expect(result.current.isSaving).toBe(true);
					expect(result.current.pendingCreate).toEqual({
						color: POLYGON_COLOR,
						name,
						pointCount: points.length,
					});

					let success = false;
					await act(async () => {
						success = await promise;
					});

					expect(success).toBe(true);
					expect(result.current.pendingCreate).toBeNull();
					expect(result.current.polygons).toEqual([newPolygon]);
				},
			),
			{ numRuns: 10 },
		);
	});

	it("prevents creating polygons with fewer than 3 points", async () => {
		const name = faker.location.street();
		const points = Array.from({ length: 2 }, () => [faker.number.int(), faker.number.int()]) as [number, number][];
		const client = createMockClient();
		const { result } = renderHook(() => usePolygons(client));

		let success = true;
		await act(async () => {
			success = await result.current.createPolygon({ name, points });
		});

		expect(success).toBe(false);
		expect(result.current.error).toBe("A polygon needs at least 3 points.");
		expect(client.create).not.toHaveBeenCalled();
	});

	it("handles create errors", async () => {
		const errorMessage = faker.lorem.sentence();
		const client = createMockClient({
			list: mock(async () => []),
			create: mock(async () => {
				throw new Error(errorMessage);
			}),
		});
		const { result } = renderHook(() => usePolygons(client));

		const name = faker.location.street();
		const points = Array.from({ length: 4 }, () => [0, 0]) as [number, number][];

		let success = true;
		await act(async () => {
			success = await result.current.createPolygon({ name, points });
		});

		expect(success).toBe(false);
		expect(result.current.isSaving).toBe(false);
		expect(result.current.pendingCreate).toBeNull();
		expect(result.current.error).toBe(errorMessage);
	});

	it("deletes a polygon successfully", async () => {
		const mockPolygon = generatePolygon(faker.number.int({ min: 1, max: 100 }));
		const client = createMockClient({
			list: mock(async () => [mockPolygon]),
		});
		const { result } = renderHook(() => usePolygons(client));

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		act(() => {
			void result.current.deletePolygon(mockPolygon);
		});

		expect(result.current.deletingIds.has(mockPolygon.id)).toBe(true);

		await waitFor(() => {
			expect(result.current.deletingIds.has(mockPolygon.id)).toBe(false);
		});

		expect(result.current.polygons).toEqual([]);
	});

	it("handles delete errors", async () => {
		const errorMessage = faker.lorem.sentence();
		const mockPolygon = generatePolygon(faker.number.int({ min: 1, max: 100 }));
		const client = createMockClient({
			list: mock(async () => [mockPolygon]),
			delete: mock(async () => {
				throw new Error(errorMessage);
			}),
		});
		const { result } = renderHook(() => usePolygons(client));

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		await act(async () => {
			await result.current.deletePolygon(mockPolygon);
		});

		expect(result.current.deletingIds.has(mockPolygon.id)).toBe(false);
		expect(result.current.error).toBe(errorMessage);
		expect(result.current.polygons).toEqual([mockPolygon]);
	});

	it("clears error on successful create after a previous failure", async () => {
		let shouldFail = true;
		const newPolygon: Polygon = {
			id: 1,
			name: "Retry",
			color: "#2563eb",
			points: [
				[0, 0],
				[1, 0],
				[1, 1],
			],
		};
		const client = createMockClient({
			list: mock(async () => []),
			create: mock(async () => {
				if (shouldFail) {
					shouldFail = false;
					throw new Error("first failure");
				}
				return newPolygon;
			}),
		});
		const { result } = renderHook(() => usePolygons(client));

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		let success = false;
		await act(async () => {
			success = await result.current.createPolygon({
				name: "Retry",
				points: [
					[0, 0],
					[1, 0],
					[1, 1],
				],
			});
		});
		expect(success).toBe(false);
		expect(result.current.error).toBe("first failure");

		await act(async () => {
			success = await result.current.createPolygon({
				name: "Retry",
				points: [
					[0, 0],
					[1, 0],
					[1, 1],
				],
			});
		});
		expect(success).toBe(true);
		expect(result.current.error).toBeNull();
	});

	it("clears error on successful delete after a previous failure", async () => {
		const mockPolygon = generatePolygon(1);
		let shouldFail = true;
		const client = createMockClient({
			list: mock(async () => [mockPolygon]),
			delete: mock(async () => {
				if (shouldFail) {
					shouldFail = false;
					throw new Error("first failure");
				}
			}),
		});
		const { result } = renderHook(() => usePolygons(client));

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		await act(async () => {
			await result.current.deletePolygon(mockPolygon);
		});
		expect(result.current.error).toBe("first failure");
		expect(result.current.polygons).toEqual([mockPolygon]);

		await act(async () => {
			await result.current.deletePolygon(mockPolygon);
		});
		expect(result.current.error).toBeNull();
		expect(result.current.polygons).toEqual([]);
	});

	it("starts with no error", async () => {
		const client = createMockClient();
		const { result } = renderHook(() => usePolygons(client));

		await waitFor(() => {
			expect(result.current.error).toBeNull();
		});
	});

	it("starts with empty polygons and loading true", async () => {
		const client = createMockClient();
		const { result } = renderHook(() => usePolygons(client));

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});
		expect(result.current.polygons).toEqual([]);
	});

	it("deletes only the targeted polygon when multiple exist", async () => {
		const p1 = generatePolygon(1);
		const p2 = generatePolygon(2);
		const client = createMockClient({
			list: mock(async () => [p1, p2]),
		});
		const { result } = renderHook(() => usePolygons(client));

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		await act(async () => {
			await result.current.deletePolygon(p1);
		});

		expect(result.current.polygons).toEqual([p2]);
	});
});
