import type { Polygon } from "@repo/polygons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { memo } from "react";
import { IMAGE_HEIGHT, IMAGE_WIDTH } from "../constants";

interface PolygonCanvasProps {
	canvasRef?: React.RefObject<HTMLCanvasElement | null>;
	onCanvasClick?: (event: React.MouseEvent<HTMLCanvasElement>) => void;
	onMouseMove?: (event: React.MouseEvent<HTMLCanvasElement>) => void;
	onMouseLeave?: () => void;
	hoveredPolygon?: Polygon | null;
	mousePos?: { x: number; y: number };
}

const PolygonCanvas = memo(function PolygonCanvas({
	canvasRef,
	onCanvasClick,
	onMouseMove,
	onMouseLeave,
	hoveredPolygon,
	mousePos,
}: PolygonCanvasProps) {
	const showTooltip = hoveredPolygon && mousePos;

	return (
		<div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
			<canvas
				aria-label="Polygon drawing canvas"
				className="block aspect-video h-auto w-full cursor-crosshair bg-slate-200"
				height={IMAGE_HEIGHT}
				onClick={onCanvasClick}
				onMouseMove={onMouseMove}
				onMouseLeave={onMouseLeave}
				ref={canvasRef}
				role="img"
				width={IMAGE_WIDTH}
			/>

			{showTooltip && (
				<Tooltip open={true}>
					<TooltipTrigger asChild>
						<div
							style={{
								position: "absolute",
								left: mousePos.x,
								top: mousePos.y,
								width: 1,
								height: 1,
								pointerEvents: "none",
							}}
						/>
					</TooltipTrigger>
					<TooltipContent side="top" sideOffset={10} className="bg-slate-900 text-white font-medium shadow-md">
						{hoveredPolygon.name}
					</TooltipContent>
				</Tooltip>
			)}
		</div>
	);
});

export { PolygonCanvas };
