import { describe, expect, it, mock } from "bun:test";
import { faker } from "@faker-js/faker";
import type { Polygon } from "@repo/polygons";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PolygonListPanel } from "../../../src/components/polygon-manager/components/ListPanel";

const generatePolygon = (): Polygon => ({
	id: faker.number.int({ min: 1, max: 10000 }),
	name: faker.location.street(),
	color: faker.color.rgb(),
	points: Array.from({ length: faker.number.int({ min: 3, max: 10 }) }, () => [
		faker.number.int({ min: 0, max: 1920 }),
		faker.number.int({ min: 0, max: 1080 }),
	]),
});

describe("ListPanel", () => {
	const mockPolygons: Polygon[] = [generatePolygon(), generatePolygon()];

	const defaultProps = {
		deletingIds: new Set<number>(),
		isLoading: false,
		onDeletePolygon: mock(() => undefined),
		pendingCreate: null,
		polygons: [],
	};

	it("renders loading skeleton initially", () => {
		render(<PolygonListPanel {...defaultProps} isLoading={true} />);

		expect(screen.getByTestId("polygon-list-skeleton")).toBeInTheDocument();
		expect(screen.queryByText("No polygons saved yet.")).not.toBeInTheDocument();
	});

	it("renders empty state", () => {
		render(<PolygonListPanel {...defaultProps} />);

		expect(screen.getByText("No polygons saved yet.")).toBeInTheDocument();
		expect(screen.queryByTestId("polygon-list-skeleton")).not.toBeInTheDocument();
	});

	it("renders list of polygons with arbitrary data", () => {
		render(<PolygonListPanel {...defaultProps} polygons={mockPolygons} />);

		expect(screen.getByText("Saved polygons")).toBeInTheDocument();
		expect(screen.getByText(mockPolygons.length.toString())).toBeInTheDocument(); // Count badge

		for (const polygon of mockPolygons) {
			expect(screen.getByText(polygon.name)).toBeInTheDocument();
			expect(screen.getAllByText(`${polygon.points.length} points`).length).toBeGreaterThan(0);
		}
	});

	it("calls onDeletePolygon when delete is clicked", async () => {
		const onDeleteMock = mock((_p: Polygon) => undefined);
		render(<PolygonListPanel {...defaultProps} polygons={mockPolygons} onDeletePolygon={onDeleteMock} />);

		const targetPolygon = mockPolygons[0];
		if (!targetPolygon) throw new Error("Missing polygon");

		const deleteButton = screen.getByRole("button", { name: `Delete ${targetPolygon.name}` });
		const user = userEvent.setup();
		await user.click(deleteButton);

		expect(onDeleteMock).toHaveBeenCalledWith(targetPolygon);
	});

	it("disables delete button and shows visual feedback when deleting", () => {
		const targetPolygon1 = mockPolygons[0];
		const targetPolygon2 = mockPolygons[1];
		if (!targetPolygon1 || !targetPolygon2) throw new Error("Missing polygons");

		const deletingIds = new Set([targetPolygon1.id]);
		render(<PolygonListPanel {...defaultProps} polygons={mockPolygons} deletingIds={deletingIds} />);

		const deleteButton1 = screen.getByRole("button", { name: `Delete ${targetPolygon1.name}` });
		expect(deleteButton1).toBeDisabled();

		const deleteButton2 = screen.getByRole("button", { name: `Delete ${targetPolygon2.name}` });
		expect(deleteButton2).not.toBeDisabled();
	});

	it("renders pending create item", () => {
		const pendingCreate = {
			name: faker.location.street(),
			color: faker.color.rgb(),
			pointCount: faker.number.int({ min: 3, max: 20 }),
		};
		render(<PolygonListPanel {...defaultProps} polygons={mockPolygons} pendingCreate={pendingCreate} />);

		expect(screen.getByText(pendingCreate.name)).toBeInTheDocument();
		expect(screen.getByText(`Saving ${pendingCreate.pointCount} points`)).toBeInTheDocument();

		// Badge count should be mockPolygons.length + 1
		expect(screen.getByText((mockPolygons.length + 1).toString())).toBeInTheDocument();

		const pendingDeleteButton = screen.getByRole("button", { name: `Delete ${pendingCreate.name}` });
		expect(pendingDeleteButton).toBeDisabled();
	});

	it("shows pending create item alone without existing polygons", () => {
		const pendingCreate = {
			name: "Only Pending",
			color: "#2563eb",
			pointCount: 4,
		};
		render(<PolygonListPanel {...defaultProps} pendingCreate={pendingCreate} />);

		expect(screen.getByText("Only Pending")).toBeInTheDocument();
		expect(screen.getByText("Saving 4 points")).toBeInTheDocument();
		expect(screen.getByText("1")).toBeInTheDocument();
	});

	it("renders color swatch for each polygon", () => {
		const polygons: Polygon[] = [
			{
				id: 1,
				name: "Red Zone",
				color: "#dc2626",
				points: [
					[0, 0],
					[10, 0],
					[10, 10],
				],
			},
		];
		render(<PolygonListPanel {...defaultProps} polygons={polygons} />);

		const swatch = document.querySelector('[style*="#dc2626"]');
		expect(swatch).toBeInTheDocument();
	});

	it("hides skeleton when loading is false", () => {
		render(<PolygonListPanel {...defaultProps} isLoading={false} />);

		expect(screen.queryByTestId("polygon-list-skeleton")).not.toBeInTheDocument();
	});

	it("shows empty state when loading is false and no polygons exist", () => {
		render(<PolygonListPanel {...defaultProps} isLoading={false} polygons={[]} />);

		expect(screen.getByText("No polygons saved yet.")).toBeInTheDocument();
		expect(screen.getByText(/Add at least 3 points/i)).toBeInTheDocument();
	});

	it("handles multiple polygons being deleted simultaneously", () => {
		const polygons: Polygon[] = [
			{ id: 1, name: "A", color: "#fff", points: [[0, 0], [1, 0], [1, 1]] },
			{ id: 2, name: "B", color: "#fff", points: [[0, 0], [1, 0], [1, 1]] },
			{ id: 3, name: "C", color: "#fff", points: [[0, 0], [1, 0], [1, 1]] },
		];
		const deletingIds = new Set([1, 3]);
		render(<PolygonListPanel {...defaultProps} polygons={polygons} deletingIds={deletingIds} />);

		expect(screen.getByRole("button", { name: "Delete A" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Delete B" })).not.toBeDisabled();
		expect(screen.getByRole("button", { name: "Delete C" })).toBeDisabled();
	});
});
