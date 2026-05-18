import { describe, expect, it, mock } from "bun:test";
import type { Polygon } from "@repo/polygons";
import { TooltipProvider } from "@repo/ui/components/tooltip";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { PolygonCanvas } from "../../../src/components/polygon-manager/components/Canvas";

describe("PolygonCanvas", () => {
	it("renders a canvas element with correct attributes", () => {
		render(<PolygonCanvas />);

		const canvas = screen.getByRole("img", { name: "Polygon drawing canvas" });
		expect(canvas).toBeInTheDocument();
		expect(canvas).toHaveAttribute("width", "1920");
		expect(canvas).toHaveAttribute("height", "1080");
	});

	it("calls onCanvasClick when clicked", async () => {
		const mockOnClick = mock(() => undefined);

		render(<PolygonCanvas onCanvasClick={mockOnClick} />);

		const canvas = screen.getByRole("img", { name: "Polygon drawing canvas" });
		const user = userEvent.setup();
		await user.click(canvas);

		expect(mockOnClick).toHaveBeenCalled();
	});

	it("renders tooltip content when a polygon is hovered", async () => {
		const mockRef = createRef<HTMLCanvasElement>();
		const mockPolygon: Polygon = {
			id: 1,
			name: "Hovered Area",
			color: "#2563eb",
			points: [
				[0, 0],
				[10, 0],
				[10, 10],
			],
		};

		render(
			<TooltipProvider>
				<PolygonCanvas canvasRef={mockRef} hoveredPolygon={mockPolygon} mousePos={{ x: 100, y: 100 }} />
			</TooltipProvider>,
		);

		const tooltipTexts = await screen.findAllByText("Hovered Area");
		expect(tooltipTexts.length).toBeGreaterThan(0);
	});

	it("does not render tooltip when hoveredPolygon is null", () => {
		render(<PolygonCanvas hoveredPolygon={null} mousePos={{ x: 100, y: 100 }} />);

		expect(screen.queryByText(/Hovered/)).not.toBeInTheDocument();
	});

	it("does not render tooltip when mousePos is missing", () => {
		const mockPolygon: Polygon = {
			id: 1,
			name: "No Mouse",
			color: "#ff0000",
			points: [
				[0, 0],
				[10, 0],
				[10, 10],
			],
		};

		render(<PolygonCanvas hoveredPolygon={mockPolygon} />);

		expect(screen.queryByText("No Mouse")).not.toBeInTheDocument();
	});

	it("calls onMouseMove when mouse moves over canvas", async () => {
		const onMouseMoveMock = mock(() => undefined);

		render(<PolygonCanvas onMouseMove={onMouseMoveMock} />);

		const canvas = screen.getByRole("img", { name: "Polygon drawing canvas" });
		const user = userEvent.setup();
		await user.hover(canvas);

		expect(onMouseMoveMock).toHaveBeenCalled();
	});

	it("calls onMouseLeave when mouse leaves canvas", async () => {
		const onMouseLeaveMock = mock(() => undefined);

		render(<PolygonCanvas onMouseLeave={onMouseLeaveMock} />);

		const canvas = screen.getByRole("img", { name: "Polygon drawing canvas" });
		fireEvent.mouseLeave(canvas);

		expect(onMouseLeaveMock).toHaveBeenCalled();
	});

	it("renders with cursor-crosshair style", () => {
		render(<PolygonCanvas />);

		const canvas = screen.getByRole("img", { name: "Polygon drawing canvas" });
		expect(canvas).toHaveClass("cursor-crosshair");
	});

	it("accepts and forwards a canvas ref", () => {
		const ref = createRef<HTMLCanvasElement>();
		render(<PolygonCanvas canvasRef={ref} />);

		expect(ref.current).toBeInstanceOf(HTMLCanvasElement);
	});
});
