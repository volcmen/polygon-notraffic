import { describe, expect, it, mock } from "bun:test";
import type { Point, Polygon } from "@repo/polygons";
import { act, renderHook } from "@testing-library/react";
import fc from "fast-check";
import { usePolygonCanvas } from "../../../src/components/polygon-manager/hooks/use-polygon-canvas";

describe("usePolygonCanvas", () => {
	it("initializes without crashing", () => {
		const mockOnAddDraftPoint = mock((_point: Point) => undefined);
		const { result } = renderHook(() =>
			usePolygonCanvas({
				draftColor: "#2563eb",
				draftPoints: [],
				onAddDraftPoint: mockOnAddDraftPoint,
				polygons: [],
			}),
		);

		expect(result.current.canvasRef.current).toBeNull();
		expect(typeof result.current.handleCanvasClick).toBe("function");
	});

	it("mathematically scales arbitrary canvas clicks to 1920x1080 internal resolution", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 100, max: 4000 }), // width
				fc.integer({ min: 100, max: 4000 }), // height
				fc.integer({ min: 0, max: 4000 }), // clientX
				fc.integer({ min: 0, max: 4000 }), // clientY
				fc.integer({ min: 0, max: 1000 }), // left
				fc.integer({ min: 0, max: 1000 }), // top
				(width, height, clientX, clientY, left, top) => {
					const mockOnAddDraftPoint = mock((_point: Point) => undefined);
					const { result } = renderHook(() =>
						usePolygonCanvas({
							draftColor: "#2563eb",
							draftPoints: [],
							onAddDraftPoint: mockOnAddDraftPoint,
							polygons: [],
						}),
					);

					const canvas = document.createElement("canvas");
					canvas.width = width;
					canvas.height = height;
					Object.defineProperty(canvas, "getBoundingClientRect", {
						value: () => ({
							bottom: top + height,
							height,
							left,
							right: left + width,
							top,
							width,
							x: left,
							y: top,
							toJSON: () => ({}),
						}),
					});

					result.current.canvasRef.current = canvas;

					const mockEvent = {
						clientX,
						clientY,
					} as React.MouseEvent<HTMLCanvasElement>;

					result.current.handleCanvasClick(mockEvent);

					const rawX = ((clientX - left) / width) * 1920;
					const rawY = ((clientY - top) / height) * 1080;
					const expectedX = Number(rawX.toFixed(1));
					const expectedY = Number(rawY.toFixed(1));

					expect(mockOnAddDraftPoint).toHaveBeenCalledWith([expectedX, expectedY]);
				},
			),
		);
	});

	it("handleCanvasClick does nothing if canvas is not attached", () => {
		const mockOnAddDraftPoint = mock((_point: Point) => undefined);
		const { result } = renderHook(() =>
			usePolygonCanvas({
				draftColor: "#2563eb",
				draftPoints: [],
				onAddDraftPoint: mockOnAddDraftPoint,
				polygons: [],
			}),
		);

		const mockEvent = {
			clientX: 100,
			clientY: 100,
		} as React.MouseEvent<HTMLCanvasElement>;

		result.current.handleCanvasClick(mockEvent);

		expect(mockOnAddDraftPoint).not.toHaveBeenCalled();
	});

	it("tracks mouse position and detects hovered polygon correctly", () => {
		const mockOnAddDraftPoint = mock((_point: Point) => undefined);
		const polygons: Polygon[] = [
			{
				id: 1,
				name: "Test Area",
				color: "#2563eb",
				points: [
					[100, 100],
					[200, 100],
					[200, 200],
					[100, 200],
				],
			},
		];

		const { result } = renderHook(() =>
			usePolygonCanvas({
				draftColor: "#2563eb",
				draftPoints: [],
				onAddDraftPoint: mockOnAddDraftPoint,
				polygons,
			}),
		);

		const canvas = document.createElement("canvas");
		Object.defineProperty(canvas, "clientWidth", { value: 1000 });
		Object.defineProperty(canvas, "clientHeight", { value: 500 });
		canvas.width = 1920;
		canvas.height = 1080;

		Object.defineProperty(canvas, "getBoundingClientRect", {
			value: () => ({
				left: 0,
				top: 0,
				width: 1000,
				height: 500,
				bottom: 500,
				right: 1000,
				x: 0,
				y: 0,
				toJSON: () => ({}),
			}),
		});

		result.current.canvasRef.current = canvas;

		// Move mouse outside the polygon (scaled coordinates: [500, 250] in client -> [960, 540] in image)
		let mockEvent = {
			clientX: 500,
			clientY: 250,
		} as React.MouseEvent<HTMLCanvasElement>;

		act(() => {
			result.current.handleMouseMove(mockEvent);
		});
		expect(result.current.mousePos).toEqual({ x: 500, y: 250 });
		expect(result.current.hoveredPolygon).toBeNull();

		// Move mouse inside the polygon (scaled coordinates: [78.125, 69.444] in client -> [150, 150] in image)
		mockEvent = {
			clientX: 78.125,
			clientY: 69.444,
		} as React.MouseEvent<HTMLCanvasElement>;

		act(() => {
			result.current.handleMouseMove(mockEvent);
		});
		expect(result.current.mousePos).toEqual({ x: 78.125, y: 69.444 });
		expect(result.current.hoveredPolygon).toEqual(polygons[0] ?? null);

		// Leave mouse
		act(() => {
			result.current.handleMouseLeave();
		});
		expect(result.current.hoveredPolygon).toBeNull();
	});

	it("handleMouseMove does nothing if canvas is not attached", () => {
		const mockOnAddDraftPoint = mock((_point: Point) => undefined);
		const { result } = renderHook(() =>
			usePolygonCanvas({
				draftColor: "#2563eb",
				draftPoints: [],
				onAddDraftPoint: mockOnAddDraftPoint,
				polygons: [],
			}),
		);

		const mockEvent = {
			clientX: 100,
			clientY: 100,
		} as React.MouseEvent<HTMLCanvasElement>;

		act(() => {
			result.current.handleMouseMove(mockEvent);
		});

		expect(result.current.hoveredPolygon).toBeNull();
	});

	it("handleMouseLeave clears hovered polygon", () => {
		const mockOnAddDraftPoint = mock((_point: Point) => undefined);
		const testPolygon: Polygon = {
			id: 1,
			name: "Test",
			color: "#2563eb",
			points: [
				[0, 0],
				[100, 0],
				[100, 100],
			],
		};
		const polygons: Polygon[] = [testPolygon];
		const { result } = renderHook(() =>
			usePolygonCanvas({
				draftColor: "#2563eb",
				draftPoints: [],
				onAddDraftPoint: mockOnAddDraftPoint,
				polygons,
			}),
		);

		// Simulate having a hovered polygon by first moving inside
		const canvas = document.createElement("canvas");
		canvas.width = 1920;
		canvas.height = 1080;
		Object.defineProperty(canvas, "clientWidth", { value: 1920 });
		Object.defineProperty(canvas, "clientHeight", { value: 1080 });
		Object.defineProperty(canvas, "getBoundingClientRect", {
			value: () => ({
				left: 0,
				top: 0,
				width: 1920,
				height: 1080,
				bottom: 1080,
				right: 1920,
				x: 0,
				y: 0,
				toJSON: () => ({}),
			}),
		});
		result.current.canvasRef.current = canvas;

		act(() => {
			result.current.handleMouseMove({ clientX: 50, clientY: 50 } as React.MouseEvent<HTMLCanvasElement>);
		});
		expect(result.current.hoveredPolygon).toEqual(testPolygon);

		act(() => {
			result.current.handleMouseLeave();
		});
		expect(result.current.hoveredPolygon).toBeNull();
	});

	it("detects hovered polygon from multiple polygons (topmost wins)", () => {
		const mockOnAddDraftPoint = mock((_point: Point) => undefined);
		const polygons: Polygon[] = [
			{
				id: 1,
				name: "Bottom",
				color: "#ff0000",
				points: [
					[0, 0],
					[200, 0],
					[200, 200],
					[0, 200],
				],
			},
			{
				id: 2,
				name: "Top",
				color: "#00ff00",
				points: [
					[50, 50],
					[150, 50],
					[150, 150],
					[50, 150],
				],
			},
		];
		const { result } = renderHook(() =>
			usePolygonCanvas({
				draftColor: "#2563eb",
				draftPoints: [],
				onAddDraftPoint: mockOnAddDraftPoint,
				polygons,
			}),
		);

		const canvas = document.createElement("canvas");
		canvas.width = 1920;
		canvas.height = 1080;
		Object.defineProperty(canvas, "clientWidth", { value: 1920 });
		Object.defineProperty(canvas, "clientHeight", { value: 1080 });
		Object.defineProperty(canvas, "getBoundingClientRect", {
			value: () => ({
				left: 0,
				top: 0,
				width: 1920,
				height: 1080,
				bottom: 1080,
				right: 1920,
				x: 0,
				y: 0,
				toJSON: () => ({}),
			}),
		});
		result.current.canvasRef.current = canvas;

		// Point at [100, 100] is inside both polygons; the topmost (last in array) should win
		act(() => {
			result.current.handleMouseMove({ clientX: 100, clientY: 100 } as React.MouseEvent<HTMLCanvasElement>);
		});
		expect(result.current.hoveredPolygon?.id).toBe(2);
	});

	it("does not detect hover on point outside all polygons", () => {
		const mockOnAddDraftPoint = mock((_point: Point) => undefined);
		const polygons: Polygon[] = [
			{
				id: 1,
				name: "Small",
				color: "#2563eb",
				points: [
					[10, 10],
					[20, 10],
					[20, 20],
				],
			},
		];
		const { result } = renderHook(() =>
			usePolygonCanvas({
				draftColor: "#2563eb",
				draftPoints: [],
				onAddDraftPoint: mockOnAddDraftPoint,
				polygons,
			}),
		);

		const canvas = document.createElement("canvas");
		canvas.width = 1920;
		canvas.height = 1080;
		Object.defineProperty(canvas, "clientWidth", { value: 1920 });
		Object.defineProperty(canvas, "clientHeight", { value: 1080 });
		Object.defineProperty(canvas, "getBoundingClientRect", {
			value: () => ({
				left: 0,
				top: 0,
				width: 1920,
				height: 1080,
				bottom: 1080,
				right: 1920,
				x: 0,
				y: 0,
				toJSON: () => ({}),
			}),
		});
		result.current.canvasRef.current = canvas;

		act(() => {
			result.current.handleMouseMove({ clientX: 100, clientY: 100 } as React.MouseEvent<HTMLCanvasElement>);
		});
		expect(result.current.hoveredPolygon).toBeNull();
	});

	it("starts with null hovered polygon and zero mouse position", () => {
		const mockOnAddDraftPoint = mock((_point: Point) => undefined);
		const { result } = renderHook(() =>
			usePolygonCanvas({
				draftColor: "#2563eb",
				draftPoints: [],
				onAddDraftPoint: mockOnAddDraftPoint,
				polygons: [],
			}),
		);

		expect(result.current.hoveredPolygon).toBeNull();
		expect(result.current.mousePos).toEqual({ x: 0, y: 0 });
	});
});
