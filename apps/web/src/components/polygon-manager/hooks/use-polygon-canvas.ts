import type { Point, Polygon } from "@repo/polygons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	drawAllPolygons,
	drawImageBackground,
	getImagePointFromCanvasEvent,
	isPointInPolygon,
} from "../canvas-geometry";
import { IMAGE_URL } from "../constants";

interface UsePolygonCanvasConfig {
	draftColor: string;
	draftPoints: Point[];
	onAddDraftPoint: (point: Point) => void;
	polygons: Polygon[];
}

const usePolygonCanvas = ({ draftColor, draftPoints, onAddDraftPoint, polygons }: UsePolygonCanvasConfig) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const imageRef = useRef<HTMLImageElement | null>(null);
	const redrawRef = useRef<() => void>(() => undefined);

	const [hoveredPolygon, setHoveredPolygon] = useState<Polygon | null>(null);
	const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

	const redraw = useCallback(() => {
		const canvas = canvasRef.current;
		const context = canvas?.getContext("2d");

		if (!canvas || !context) {
			return;
		}

		const canvasSize = { height: canvas.height, width: canvas.width };
		context.clearRect(0, 0, canvas.width, canvas.height);
		drawImageBackground(context, canvas, imageRef.current);
		drawAllPolygons(context, polygons, draftPoints, canvasSize, draftColor);
	}, [draftColor, draftPoints, polygons]);

	useEffect(() => {
		redrawRef.current = redraw;
	}, [redraw]);

	useEffect(() => {
		const image = new Image();
		image.onload = () => redrawRef.current();
		image.onerror = () => redrawRef.current();
		image.src = IMAGE_URL;
		imageRef.current = image;

		return () => {
			image.onload = null;
			image.onerror = null;
		};
	}, []);

	useEffect(() => {
		redraw();
	}, [redraw]);

	const handleCanvasClick = useCallback(
		(event: React.MouseEvent<HTMLCanvasElement>) => {
			const canvas = canvasRef.current;
			if (!canvas) {
				return;
			}

			onAddDraftPoint(getImagePointFromCanvasEvent(event, canvas));
		},
		[onAddDraftPoint],
	);

	const handleMouseMove = useCallback(
		(event: React.MouseEvent<HTMLCanvasElement>) => {
			const canvas = canvasRef.current;
			if (!canvas) {
				return;
			}

			const rect = canvas.getBoundingClientRect();
			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;
			setMousePos({ x, y });

			const imgPoint = getImagePointFromCanvasEvent(event, canvas);

			let foundPolygon: Polygon | null = null;
			for (let i = polygons.length - 1; i >= 0; i--) {
				const poly = polygons[i];
				if (poly && isPointInPolygon(imgPoint, poly.points)) {
					foundPolygon = poly;
					break;
				}
			}
			setHoveredPolygon(foundPolygon);
		},
		[polygons],
	);

	const handleMouseLeave = useCallback(() => {
		setHoveredPolygon(null);
	}, []);

	return {
		canvasRef,
		handleCanvasClick,
		handleMouseMove,
		handleMouseLeave,
		hoveredPolygon,
		mousePos,
	} as const;
};

export { usePolygonCanvas };
