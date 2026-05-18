import { describe, expect, it, mock } from "bun:test";
import { faker } from "@faker-js/faker";
import { act, renderHook } from "@testing-library/react";
import fc from "fast-check";
import { useDraftPolygon } from "../../../src/components/polygon-manager/hooks/use-draft-polygon";

describe("useDraftPolygon", () => {
	it("starts with empty state", () => {
		const { result } = renderHook(() => useDraftPolygon());

		expect(result.current.draftPoints).toEqual([]);
		expect(result.current.name).toBe("");
	});

	it("adds points correctly for any arbitrary sequence", () => {
		fc.assert(
			fc.property(
				fc.array(fc.tuple(fc.integer({ min: 0, max: 3000 }), fc.integer({ min: 0, max: 3000 })), { maxLength: 50 }),
				(points) => {
					const { result } = renderHook(() => useDraftPolygon());

					act(() => {
						for (const p of points) {
							result.current.addPoint(p);
						}
					});

					expect(result.current.draftPoints).toEqual(points);
				},
			),
		);
	});

	it("maintains correct state across arbitrary adds and undos", () => {
		fc.assert(
			fc.property(
				fc.array(fc.tuple(fc.integer({ min: 0, max: 3000 }), fc.integer({ min: 0, max: 3000 })), {
					minLength: 1,
					maxLength: 50,
				}),
				fc.integer({ min: 0, max: 100 }),
				(points, undoCount) => {
					const { result } = renderHook(() => useDraftPolygon());

					act(() => {
						for (const p of points) {
							result.current.addPoint(p);
						}
					});

					act(() => {
						for (let i = 0; i < undoCount; i++) {
							result.current.undoLastPoint();
						}
					});

					const expectedLength = Math.max(0, points.length - undoCount);
					expect(result.current.draftPoints).toHaveLength(expectedLength);
					expect(result.current.draftPoints).toEqual(points.slice(0, expectedLength));
				},
			),
		);
	});

	it("updates name correctly for any valid string", () => {
		fc.assert(
			fc.property(fc.string(), (name) => {
				const { result } = renderHook(() => useDraftPolygon());

				act(() => {
					result.current.setName(name);
				});

				expect(result.current.name).toBe(name);
			}),
		);
	});

	it("saves draft and resets state on success with generated data", async () => {
		const { result } = renderHook(() => useDraftPolygon());
		const mockCreate = mock(async () => true);

		const fakeName = faker.location.street();
		const fakePoints = Array.from({ length: faker.number.int({ min: 3, max: 10 }) }, () => [
			faker.number.int({ min: 0, max: 1920 }),
			faker.number.int({ min: 0, max: 1080 }),
		]) as [number, number][];

		act(() => {
			result.current.setName(`  ${fakeName}  `);
			for (const p of fakePoints) {
				result.current.addPoint(p);
			}
		});

		await act(async () => {
			await result.current.saveDraft(mockCreate);
		});

		expect(mockCreate).toHaveBeenCalledWith({
			name: fakeName,
			points: fakePoints,
		});

		// State should be reset
		expect(result.current.draftPoints).toEqual([]);
		expect(result.current.name).toBe("");
	});

	it("does not reset state if saving fails", async () => {
		const { result } = renderHook(() => useDraftPolygon());
		const mockCreate = mock(async () => false);

		const fakeName = faker.location.street();
		const fakePoint: [number, number] = [
			faker.number.int({ min: 0, max: 1920 }),
			faker.number.int({ min: 0, max: 1080 }),
		];

		act(() => {
			result.current.setName(fakeName);
			result.current.addPoint(fakePoint);
		});

		await act(async () => {
			await result.current.saveDraft(mockCreate);
		});

		// State should be preserved
		expect(result.current.draftPoints).toEqual([fakePoint]);
		expect(result.current.name).toBe(fakeName);
	});

	it("calls create even when name is empty after trim (validation happens upstream)", async () => {
		const { result } = renderHook(() => useDraftPolygon());
		const mockCreate = mock(async () => true);

		act(() => {
			result.current.setName("   ");
			result.current.addPoint([0, 0]);
			result.current.addPoint([1, 0]);
			result.current.addPoint([1, 1]);
		});

		await act(async () => {
			await result.current.saveDraft(mockCreate);
		});

		// saveDraft passes through to create; the create function receives the empty name
		expect(mockCreate).toHaveBeenCalledWith({
			name: "",
			points: [
				[0, 0],
				[1, 0],
				[1, 1],
			],
		});
		// State is reset because create returned true
		expect(result.current.draftPoints).toEqual([]);
		expect(result.current.name).toBe("");
	});

	it("calls create even with fewer than 3 points (validation happens upstream)", async () => {
		const { result } = renderHook(() => useDraftPolygon());
		const mockCreate = mock(async () => true);

		act(() => {
			result.current.setName("Test");
			result.current.addPoint([0, 0]);
			result.current.addPoint([1, 0]);
		});

		await act(async () => {
			await result.current.saveDraft(mockCreate);
		});

		// saveDraft passes through to create regardless of point count
		expect(mockCreate).toHaveBeenCalledWith({
			name: "Test",
			points: [
				[0, 0],
				[1, 0],
			],
		});
		expect(result.current.draftPoints).toEqual([]);
		expect(result.current.name).toBe("");
	});

	it("undoLastPoint does nothing when no points exist", () => {
		const { result } = renderHook(() => useDraftPolygon());

		act(() => {
			result.current.undoLastPoint();
		});

		expect(result.current.draftPoints).toEqual([]);
	});

	it("undoLastPoint removes only the last point", () => {
		const { result } = renderHook(() => useDraftPolygon());

		act(() => {
			result.current.addPoint([0, 0]);
			result.current.addPoint([1, 0]);
			result.current.addPoint([1, 1]);
		});

		act(() => {
			result.current.undoLastPoint();
		});

		expect(result.current.draftPoints).toEqual([
			[0, 0],
			[1, 0],
		]);
	});

	it("saveDraft trims the name before calling create", async () => {
		const { result } = renderHook(() => useDraftPolygon());
		const mockCreate = mock(async () => true);

		act(() => {
			result.current.setName("  TrimmedName  ");
			result.current.addPoint([0, 0]);
			result.current.addPoint([1, 0]);
			result.current.addPoint([1, 1]);
		});

		await act(async () => {
			await result.current.saveDraft(mockCreate);
		});

		expect(mockCreate).toHaveBeenCalledWith({
			name: "TrimmedName",
			points: [
				[0, 0],
				[1, 0],
				[1, 1],
			],
		});
	});

	it("saveDraft calls create with exact points and trimmed name", async () => {
		const { result } = renderHook(() => useDraftPolygon());
		const mockCreate = mock(async () => true);
		const points: [number, number][] = [
			[12.3, 12.0],
			[16.3, 12.0],
			[16.3, 8.0],
			[12.3, 8.0],
		];

		act(() => {
			result.current.setName("P1");
			for (const p of points) {
				result.current.addPoint(p);
			}
		});

		await act(async () => {
			await result.current.saveDraft(mockCreate);
		});

		expect(mockCreate).toHaveBeenCalledWith({ name: "P1", points });
		expect(result.current.draftPoints).toEqual([]);
		expect(result.current.name).toBe("");
	});
});
