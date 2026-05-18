process.env.NEXT_PUBLIC_POLYGON_TRANSPORT = "server-action";
process.env.POLYGON_ACTION_DELAY_MS = "0";

import { afterEach, mock } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

GlobalRegistrator.register();

import "@testing-library/jest-dom";

declare module "bun:test" {
	interface Matchers<T> extends Omit<TestingLibraryMatchers<unknown, T>, "toBeEmpty"> {}
}

const { cleanup } = await import("@testing-library/react");

afterEach(() => {
	cleanup();
	mock.restore();
});

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
	value: () => ({
		arc: mock(() => undefined),
		beginPath: mock(() => undefined),
		clearRect: mock(() => undefined),
		closePath: mock(() => undefined),
		drawImage: mock(() => undefined),
		fill: mock(() => undefined),
		fillRect: mock(() => undefined),
		lineTo: mock(() => undefined),
		moveTo: mock(() => undefined),
		stroke: mock(() => undefined),
	}),
});

Object.defineProperty(HTMLCanvasElement.prototype, "getBoundingClientRect", {
	value: () => ({
		bottom: 540,
		height: 540,
		left: 0,
		right: 960,
		top: 0,
		width: 960,
		x: 0,
		y: 0,
		toJSON: () => ({}),
	}),
});
