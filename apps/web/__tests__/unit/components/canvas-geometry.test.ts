import { describe, expect, it, mock } from "bun:test";
import fc from "fast-check";
import {
	drawAllPolygons,
	drawImageBackground,
	getImagePointFromCanvasEvent,
	isPointInPolygon,
	scalePointToCanvas,
} from "../../../src/components/polygon-manager/canvas-geometry";
import { POLYGON_COLOR } from "../../../src/components/polygon-manager/constants";

describe("canvas geometry", () => {
	it("scales image points into canvas coordinates", () => {
		fc.assert(
			fc.property(
				fc.double({ max: 1920, min: 0, noDefaultInfinity: true, noNaN: true }),
				fc.double({ max: 1080, min: 0, noDefaultInfinity: true, noNaN: true }),
				(x, y) => {
					const [scaledX, scaledY] = scalePointToCanvas([x, y], { height: 540, width: 960 });

					expect(Math.abs(scaledX - x / 2)).toBeLessThanOrEqual(1e-12);
					expect(Math.abs(scaledY - y / 2)).toBeLessThanOrEqual(1e-12);
				},
			),
		);
	});

	it("maps rendered canvas clicks back to image coordinates", () => {
		const canvas = document.createElement("canvas");
		Object.defineProperty(canvas, "getBoundingClientRect", {
			value: () => ({
				bottom: 540,
				height: 540,
				left: 10,
				right: 970,
				top: 20,
				width: 960,
				x: 10,
				y: 20,
				toJSON: () => ({}),
			}),
		});

		expect(
			getImagePointFromCanvasEvent({ clientX: 490, clientY: 290 } as React.MouseEvent<HTMLCanvasElement>, canvas),
		).toEqual([960, 540]);
	});

	it("draws persisted polygon colors instead of index-derived colors", () => {
		const context = createContextSpy();

		drawAllPolygons(
			context as unknown as CanvasRenderingContext2D,
			[
				{
					color: "#dc2626",
					id: 1,
					name: "Red",
					points: [
						[0, 0],
						[10, 0],
						[10, 10],
					],
				},
			],
			[],
			{ height: 540, width: 960 },
		);

		expect(context.strokeStyles).toContain("#dc2626");
		expect(context.fillStyles).toContain("rgb(220 38 38 / 0.2)");
	});

	it("uses a stable fallback fill for invalid persisted colors", () => {
		const context = createContextSpy();

		drawAllPolygons(
			context as unknown as CanvasRenderingContext2D,
			[
				{
					color: "not-a-color",
					id: 1,
					name: "Broken color",
					points: [
						[0, 0],
						[10, 0],
						[10, 10],
					],
				},
			],
			[],
			{ height: 540, width: 960 },
		);

		expect(context.fillStyles).toContain("rgb(37 99 235 / 0.2)");
	});

	it("draws draft polygons with the constant in-progress color", () => {
		const context = createContextSpy();
		const draftPoints: [number, number][] = [
			[0, 0],
			[10, 0],
			[10, 10],
		];

		drawAllPolygons(context as unknown as CanvasRenderingContext2D, [], draftPoints, { height: 540, width: 960 });

		expect(context.strokeStyles).toContain(POLYGON_COLOR);
		expect(context.fillStyles).toContain(colorToRgba(POLYGON_COLOR, 0.16));
	});

	it("draws multiple polygons with distinct colors", () => {
		const context = createContextSpy();

		drawAllPolygons(
			context as unknown as CanvasRenderingContext2D,
			[
				{
					color: "#dc2626",
					id: 1,
					name: "Red",
					points: [
						[0, 0],
						[10, 0],
						[10, 10],
					],
				},
				{
					color: "#16a34a",
					id: 2,
					name: "Green",
					points: [
						[20, 20],
						[30, 20],
						[30, 30],
					],
				},
			],
			[],
			{ height: 540, width: 960 },
		);

		expect(context.strokeStyles).toContain("#dc2626");
		expect(context.strokeStyles).toContain("#16a34a");
	});

	it("draws nothing when no polygons and no draft points exist", () => {
		const context = createContextSpy();

		drawAllPolygons(context as unknown as CanvasRenderingContext2D, [], [], { height: 540, width: 960 });

		expect(context.beginPath).not.toHaveBeenCalled();
	});

	it("draws draft with fewer than 3 points (open path)", () => {
		const context = createContextSpy();
		const draftPoints: [number, number][] = [
			[0, 0],
			[10, 0],
		];

		drawAllPolygons(context as unknown as CanvasRenderingContext2D, [], draftPoints, { height: 540, width: 960 });

		expect(context.beginPath).toHaveBeenCalled();
		expect(context.closePath).not.toHaveBeenCalled();
	});
});

describe("drawImageBackground", () => {
	it("draws a filled rectangle when no image is provided", () => {
		const context = createContextSpy();
		const canvas = { width: 1920, height: 1080 } as HTMLCanvasElement;

		drawImageBackground(context as unknown as CanvasRenderingContext2D, canvas, null);

		expect(context.fillStyles).toContain("#e2e8f0");
		expect(context.fillRect).toHaveBeenCalledWith(0, 0, 1920, 1080);
	});

	it("draws image when it is complete and has natural width", () => {
		const context = createContextSpy();
		const canvas = { width: 1920, height: 1080 } as HTMLCanvasElement;
		const image = { complete: true, naturalWidth: 100 } as HTMLImageElement;

		drawImageBackground(context as unknown as CanvasRenderingContext2D, canvas, image);

		expect(context.drawImage).toHaveBeenCalledWith(image, 0, 0, 1920, 1080);
	});

	it("falls back to fill when image is not complete", () => {
		const context = createContextSpy();
		const canvas = { width: 1920, height: 1080 } as HTMLCanvasElement;
		const image = { complete: false, naturalWidth: 100 } as HTMLImageElement;

		drawImageBackground(context as unknown as CanvasRenderingContext2D, canvas, image);

		expect(context.drawImage).not.toHaveBeenCalled();
		expect(context.fillStyles).toContain("#e2e8f0");
		expect(context.fillRect).toHaveBeenCalledWith(0, 0, 1920, 1080);
	});

	it("falls back to fill when image has zero natural width", () => {
		const context = createContextSpy();
		const canvas = { width: 1920, height: 1080 } as HTMLCanvasElement;
		const image = { complete: true, naturalWidth: 0 } as HTMLImageElement;

		drawImageBackground(context as unknown as CanvasRenderingContext2D, canvas, image);

		expect(context.drawImage).not.toHaveBeenCalled();
		expect(context.fillStyles).toContain("#e2e8f0");
		expect(context.fillRect).toHaveBeenCalledWith(0, 0, 1920, 1080);
	});
});

describe("isPointInPolygon", () => {
	it("returns true for point inside a triangle", () => {
		const polygon: [number, number][] = [
			[0, 0],
			[10, 0],
			[5, 10],
		];

		expect(isPointInPolygon([5, 5], polygon)).toBe(true);
	});

	it("returns false for point outside a triangle", () => {
		const polygon: [number, number][] = [
			[0, 0],
			[10, 0],
			[5, 10],
		];

		expect(isPointInPolygon([20, 20], polygon)).toBe(false);
	});

	it("returns false for point on edge", () => {
		const polygon: [number, number][] = [
			[0, 0],
			[10, 0],
			[10, 10],
			[0, 10],
		];

		// Ray-casting algorithm considers edge points as inside
		expect(isPointInPolygon([0, 5], polygon)).toBe(true);
	});

	it("returns true for point inside a rectangle", () => {
		const polygon: [number, number][] = [
			[0, 0],
			[10, 0],
			[10, 10],
			[0, 10],
		];

		expect(isPointInPolygon([5, 5], polygon)).toBe(true);
	});

	it("handles empty polygon", () => {
		expect(isPointInPolygon([5, 5], [])).toBe(false);
	});

	it("handles arbitrary generated rectangles", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 0, max: 100 }),
				fc.integer({ min: 0, max: 100 }),
				fc.integer({ min: 1, max: 100 }),
				fc.integer({ min: 1, max: 100 }),
				(x, y, w, h) => {
					const rectangle: [number, number][] = [
						[x, y],
						[x + w, y],
						[x + w, y + h],
						[x, y + h],
					];
					const centerX = x + w / 2;
					const centerY = y + h / 2;

					expect(isPointInPolygon([centerX, centerY], rectangle)).toBe(true);
				},
			),
		);
	});
});

const colorToRgba = (color: string, alpha: number) => {
	const hex = color.replace("#", "");
	const red = Number.parseInt(hex.slice(0, 2), 16);
	const green = Number.parseInt(hex.slice(2, 4), 16);
	const blue = Number.parseInt(hex.slice(4, 6), 16);

	return `rgb(${red} ${green} ${blue} / ${alpha})`;
};

const createContextSpy = () => {
	const fillStyles: string[] = [];
	const strokeStyles: string[] = [];

	return {
		fillStyles,
		strokeStyles,
		arc: mock(() => undefined),
		beginPath: mock(() => undefined),
		closePath: mock(() => undefined),
		drawImage: mock(() => undefined),
		fill: mock(() => undefined),
		fillRect: mock(() => undefined),
		lineTo: mock(() => undefined),
		moveTo: mock(() => undefined),
		stroke: mock(() => undefined),
		set fillStyle(value: string) {
			fillStyles.push(value);
		},
		set lineJoin(_value: string) {},
		set lineWidth(_value: number) {},
		set strokeStyle(value: string) {
			strokeStyles.push(value);
		},
	};
};
