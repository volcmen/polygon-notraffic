import type { Point, Polygon } from "@repo/polygons";
import type { MouseEvent } from "react";
import { IMAGE_HEIGHT, IMAGE_WIDTH, POLYGON_COLOR } from "./constants";

interface CanvasSize {
	height: number;
	width: number;
}
interface PolygonStyle {
	stroke: string;
	fill: string;
}

const FALLBACK_FILL_COLOR = "rgb(37 99 235 / 0.2)";

const scalePointToCanvas = (point: Point, canvasSize: CanvasSize): Point => [
	(point[0] / IMAGE_WIDTH) * canvasSize.width,
	(point[1] / IMAGE_HEIGHT) * canvasSize.height,
];

const getImagePointFromCanvasEvent = (event: MouseEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement): Point => {
	const rect = canvas.getBoundingClientRect();
	const renderedWidth = rect.width || canvas.clientWidth || canvas.width;
	const renderedHeight = rect.height || canvas.clientHeight || canvas.height;
	const x = ((event.clientX - rect.left) / renderedWidth) * IMAGE_WIDTH;
	const y = ((event.clientY - rect.top) / renderedHeight) * IMAGE_HEIGHT;

	return [Number(x.toFixed(1)), Number(y.toFixed(1))];
};

const hexColorToRgba = (color: string, alpha: number): string => {
	const hex = color.replace("#", "");
	const red = Number.parseInt(hex.slice(0, 2), 16);
	const green = Number.parseInt(hex.slice(2, 4), 16);
	const blue = Number.parseInt(hex.slice(4, 6), 16);

	return [red, green, blue].some(Number.isNaN) ? FALLBACK_FILL_COLOR : `rgb(${red} ${green} ${blue} / ${alpha})`;
};

const drawPolygon = (
	context: CanvasRenderingContext2D,
	points: Point[],
	canvasSize: CanvasSize,
	style: PolygonStyle,
): void => {
	const firstPoint = points[0];
	if (!firstPoint) {
		return;
	}

	context.beginPath();
	const [firstX, firstY] = scalePointToCanvas(firstPoint, canvasSize);
	context.moveTo(firstX, firstY);

	for (const point of points.slice(1)) {
		const [x, y] = scalePointToCanvas(point, canvasSize);
		context.lineTo(x, y);
	}

	if (points.length > 2) {
		context.closePath();
		context.fillStyle = style.fill;
		context.fill();
	}

	context.strokeStyle = style.stroke;
	context.lineJoin = "round";
	context.lineWidth = 3;
	context.stroke();

	// Draw a vertex dot at every point
	for (const point of points) {
		const [x, y] = scalePointToCanvas(point, canvasSize);
		context.beginPath();
		context.arc(x, y, 4, 0, Math.PI * 2);
		context.strokeStyle = "#ffffff";
		context.lineWidth = 2;
		context.fillStyle = style.stroke;
		context.fill();
		context.stroke();
	}
};

const drawImageBackground = (
	context: CanvasRenderingContext2D,
	canvas: HTMLCanvasElement,
	image: HTMLImageElement | null,
): void => {
	if (image?.complete && image.naturalWidth > 0) {
		context.drawImage(image, 0, 0, canvas.width, canvas.height);
		return;
	}

	context.fillStyle = "#e2e8f0";
	context.fillRect(0, 0, canvas.width, canvas.height);
};

const drawAllPolygons = (
	context: CanvasRenderingContext2D,
	polygons: Polygon[],
	draftPoints: Point[],
	canvasSize: CanvasSize,
	draftColor = POLYGON_COLOR,
): void => {
	for (const polygon of polygons) {
		drawPolygon(context, polygon.points, canvasSize, {
			stroke: polygon.color,
			fill: hexColorToRgba(polygon.color, 0.2),
		});
	}

	drawPolygon(context, draftPoints, canvasSize, {
		stroke: draftColor,
		fill: hexColorToRgba(draftColor, 0.16),
	});
};

const isPointInPolygon = (point: Point, polygonPoints: Point[]): boolean => {
	const [x, y] = point;
	let inside = false;
	const length = polygonPoints.length;
	for (let i = 0, j = length - 1; i < length; j = i++) {
		const pi = polygonPoints[i];
		const pj = polygonPoints[j];
		if (!pi || !pj) {
			continue;
		}
		const [xi, yi] = pi;
		const [xj, yj] = pj;

		const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
		if (intersect) {
			inside = !inside;
		}
	}
	return inside;
};

export {
	drawAllPolygons,
	drawImageBackground,
	drawPolygon,
	getImagePointFromCanvasEvent,
	isPointInPolygon,
	scalePointToCanvas,
};
