import { describe, expect, it, mock } from "bun:test";
import { faker } from "@faker-js/faker";
import type { CreatePolygonInput, Polygon } from "@repo/polygons";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PolygonManagerClient } from "../../../src/components/polygon-manager/components/ManagerClient";
import { POLYGON_COLOR } from "../../../src/components/polygon-manager/constants";

interface RenderOptions {
	createPolygonAction?: (input: CreatePolygonInput) => Promise<Polygon>;
	deletePolygonAction?: (id: number) => Promise<void>;
	initialPolygons?: Polygon[];
	listPolygonsAction?: () => Promise<Polygon[]>;
}

const generatePolygon = (): Polygon => ({
	id: faker.number.int({ min: 1, max: 1000 }),
	name: faker.location.street(),
	color: faker.color.rgb(),
	points: Array.from({ length: faker.number.int({ min: 3, max: 10 }) }, () => [
		faker.number.int({ min: 0, max: 1920 }),
		faker.number.int({ min: 0, max: 1080 }),
	]),
});

const renderPolygonManager = (options: RenderOptions = {}) => {
	const initialPolygons = options.initialPolygons ?? [];
	const createPolygonAction = mock(
		options.createPolygonAction ??
			(async (input: CreatePolygonInput) => ({
				color: "#2563eb",
				id: faker.number.int({ min: 1000, max: 2000 }),
				name: input.name,
				points: input.points,
			})),
	);
	const deletePolygonAction = mock(options.deletePolygonAction ?? (async () => undefined));
	const listPolygonsAction = mock(options.listPolygonsAction ?? (async () => initialPolygons));

	render(
		<PolygonManagerClient
			createPolygonAction={createPolygonAction}
			deletePolygonAction={deletePolygonAction}
			listPolygonsAction={listPolygonsAction}
		/>,
	);

	return {
		createPolygonAction,
		deletePolygonAction,
		listPolygonsAction,
	};
};

describe("PolygonManager", () => {
	it("shows an empty state after loading polygons", async () => {
		renderPolygonManager();

		expect(await screen.findByText("No polygons saved yet.")).toBeTruthy();
	});

	it("uses skeleton rows only while saved polygons are initially loading", async () => {
		let resolveList: (polygons: Polygon[]) => void = () => undefined;
		renderPolygonManager({
			listPolygonsAction: () =>
				new Promise((resolve) => {
					resolveList = resolve;
				}),
		});

		expect(screen.getByTestId("polygon-list-skeleton")).toBeTruthy();

		await act(async () => {
			resolveList([]);
		});

		expect(await screen.findByText("No polygons saved yet.")).toBeTruthy();
		expect(screen.queryByTestId("polygon-list-skeleton")).toBeNull();
	});

	it("shows load errors from the polygon client", async () => {
		const errorMessage = faker.lorem.sentence();
		renderPolygonManager({
			listPolygonsAction: async () => {
				throw new Error(errorMessage);
			},
		});

		expect(await screen.findByText(errorMessage)).toBeTruthy();
		expect(await screen.findByText("No polygons saved yet.")).toBeTruthy();
	});

	it("renders existing polygons from the shared action", async () => {
		const initialPolygons = [generatePolygon()];
		renderPolygonManager({ initialPolygons });

		const polygon = initialPolygons[0] as Polygon;
		expect(await screen.findByText(polygon.name)).toBeTruthy();
		expect(screen.getByText(`${polygon.points.length} points`)).toBeTruthy();

		// Wait for styles and assert rendered attributes
		const swatch = document.querySelector(`[style*="${polygon.color}"]`) as HTMLElement;
		expect(swatch).toBeTruthy();
		expect(swatch.getAttribute("aria-hidden")).toBe("true");
	});

	it("keeps saved polygon rows inside a bounded scroll area", async () => {
		const initialPolygons = Array.from({ length: 8 }, generatePolygon);
		renderPolygonManager({ initialPolygons });

		expect(await screen.findByText(initialPolygons.at(0)?.name ?? "")).toBeTruthy();
		expect(document.querySelector('[data-slot="scroll-area"]')).toBeTruthy();
		expect(document.querySelector('[data-slot="scroll-area-viewport"]')).toBeTruthy();
	});

	it("creates a polygon from canvas clicks and the Server Action transport", async () => {
		const user = userEvent.setup();
		const { createPolygonAction } = renderPolygonManager();
		const canvas = screen.getByLabelText("Polygon drawing canvas");

		const fakeName = faker.location.street();

		fireEvent.click(canvas, { clientX: 120, clientY: 120 });
		fireEvent.click(canvas, { clientX: 260, clientY: 120 });
		fireEvent.click(canvas, { clientX: 260, clientY: 220 });
		await user.type(screen.getByLabelText("Polygon name"), fakeName);
		await user.click(screen.getByRole("button", { name: "Save polygon" }));

		await waitFor(() => {
			expect(createPolygonAction).toHaveBeenCalledWith({
				name: fakeName,
				points: [
					[240, 240], // based on 960x540 default mocked rect bounding to 1920x1080
					[520, 240],
					[520, 440],
				],
			});
		});
		expect(await screen.findByText(fakeName)).toBeTruthy();
	});

	it("optimistically shows the new polygon row with delete disabled while saving", async () => {
		const user = userEvent.setup();
		let resolveCreate: (polygon: Polygon) => void = () => undefined;
		renderPolygonManager({
			createPolygonAction: () =>
				new Promise((resolve) => {
					resolveCreate = resolve;
				}),
		});
		const canvas = screen.getByLabelText("Polygon drawing canvas");

		await screen.findByText("No polygons saved yet.");
		fireEvent.click(canvas, { clientX: 120, clientY: 120 });
		fireEvent.click(canvas, { clientX: 260, clientY: 120 });
		fireEvent.click(canvas, { clientX: 260, clientY: 220 });

		const pendingName = faker.location.street();
		await user.type(screen.getByLabelText("Polygon name"), pendingName);
		await user.click(screen.getByRole("button", { name: "Save polygon" }));

		expect(screen.queryByTestId("polygon-list-skeleton")).toBeNull();
		expect(await screen.findByText(pendingName)).toBeTruthy();
		expect(screen.getByText("Saving 3 points")).toBeTruthy();

		const pendingDeleteButton = screen.getByRole("button", { name: `Delete ${pendingName}` });
		expect((pendingDeleteButton as HTMLButtonElement).disabled).toBe(true);

		const pendingSwatch = document.querySelector(`[style*="${POLYGON_COLOR}"]`) as HTMLElement;
		expect(pendingSwatch).toBeTruthy();

		await act(async () => {
			resolveCreate({
				color: "#2563eb",
				id: 100,
				name: pendingName,
				points: [
					[240, 240],
					[520, 240],
					[520, 440],
				],
			});
		});

		expect(await screen.findByText("3 points")).toBeTruthy();
		expect(screen.queryByText("Saving 3 points")).toBeNull();
		expect((screen.getByRole("button", { name: `Delete ${pendingName}` }) as HTMLButtonElement).disabled).toBe(false);
	});

	it("keeps existing saved polygons visible while another polygon is saving", async () => {
		const user = userEvent.setup();
		const initialPolygons = [generatePolygon()];
		const targetPolygon = initialPolygons[0] as Polygon;

		renderPolygonManager({
			createPolygonAction: () => new Promise(() => undefined),
			initialPolygons,
		});
		const canvas = screen.getByLabelText("Polygon drawing canvas");

		await screen.findByText(targetPolygon.name);

		fireEvent.click(canvas, { clientX: 120, clientY: 120 });
		fireEvent.click(canvas, { clientX: 260, clientY: 120 });
		fireEvent.click(canvas, { clientX: 260, clientY: 220 });

		const secondZone = faker.location.street();
		await user.type(screen.getByLabelText("Polygon name"), secondZone);
		await user.click(screen.getByRole("button", { name: "Save polygon" }));

		expect(screen.queryByTestId("polygon-list-skeleton")).toBeNull();
		expect(screen.getByText(targetPolygon.name)).toBeTruthy();
		expect(await screen.findByText(secondZone)).toBeTruthy();
		expect((screen.getByRole("button", { name: `Delete ${targetPolygon.name}` }) as HTMLButtonElement).disabled).toBe(
			false,
		);
		expect((screen.getByRole("button", { name: `Delete ${secondZone}` }) as HTMLButtonElement).disabled).toBe(true);
	});

	it("shows the optimistic row instead of skeleton rows when saving overlaps the initial list load", async () => {
		const user = userEvent.setup();
		renderPolygonManager({
			createPolygonAction: () => new Promise(() => undefined),
			listPolygonsAction: () => new Promise(() => undefined),
		});
		const canvas = screen.getByLabelText("Polygon drawing canvas");

		expect(screen.getByTestId("polygon-list-skeleton")).toBeTruthy();

		fireEvent.click(canvas, { clientX: 120, clientY: 120 });
		fireEvent.click(canvas, { clientX: 260, clientY: 120 });
		fireEvent.click(canvas, { clientX: 260, clientY: 220 });

		const fastName = faker.location.street();
		await user.type(screen.getByLabelText("Polygon name"), fastName);
		await user.click(screen.getByRole("button", { name: "Save polygon" }));

		expect(screen.queryByTestId("polygon-list-skeleton")).toBeNull();
		expect(await screen.findByText(fastName)).toBeTruthy();
		expect((screen.getByRole("button", { name: `Delete ${fastName}` }) as HTMLButtonElement).disabled).toBe(true);
	});

	it("disables Save when fewer than 3 draft points are selected", async () => {
		const user = userEvent.setup();
		const { createPolygonAction } = renderPolygonManager();
		const canvas = screen.getByLabelText("Polygon drawing canvas");

		// Only two clicks — not enough for a valid polygon
		fireEvent.click(canvas, { clientX: 120, clientY: 120 });
		fireEvent.click(canvas, { clientX: 260, clientY: 120 });
		await user.type(screen.getByLabelText("Polygon name"), faker.location.street());

		// The Save button should be disabled before the user even tries to submit
		const saveButton = screen.getByRole("button", { name: "Save polygon" });
		expect((saveButton as HTMLButtonElement).disabled).toBe(true);
		expect(createPolygonAction).not.toHaveBeenCalled();
	});

	it("keeps the draft when saving fails", async () => {
		const user = userEvent.setup();
		const errorMessage = faker.lorem.sentence();
		renderPolygonManager({
			createPolygonAction: async () => {
				throw new Error(errorMessage);
			},
		});
		const canvas = screen.getByLabelText("Polygon drawing canvas");

		fireEvent.click(canvas, { clientX: 120, clientY: 120 });
		fireEvent.click(canvas, { clientX: 260, clientY: 120 });
		fireEvent.click(canvas, { clientX: 260, clientY: 220 });

		const zoneName = faker.location.street();
		await user.type(screen.getByLabelText("Polygon name"), zoneName);
		await user.click(screen.getByRole("button", { name: "Save polygon" }));

		expect(await screen.findByText(errorMessage)).toBeTruthy();
		expect((screen.getByLabelText("Polygon name") as HTMLInputElement).value).toBe(zoneName);
		expect(screen.getByText(/3 points? selected/)).toBeTruthy();
	});

	it("deletes polygons through the Server Action transport", async () => {
		const user = userEvent.setup();
		const targetPolygon = generatePolygon();
		const { deletePolygonAction } = renderPolygonManager({
			initialPolygons: [targetPolygon],
		});

		await screen.findByText(targetPolygon.name);
		await user.click(screen.getByRole("button", { name: `Delete ${targetPolygon.name}` }));

		await waitFor(() => {
			expect(deletePolygonAction).toHaveBeenCalledWith(targetPolygon.id);
		});
		expect(await screen.findByText("No polygons saved yet.")).toBeTruthy();
	});

	it("keeps polygons visible when deleting fails", async () => {
		const user = userEvent.setup();
		const errorMessage = faker.lorem.sentence();
		const targetPolygon = generatePolygon();
		renderPolygonManager({
			deletePolygonAction: async () => {
				throw new Error(errorMessage);
			},
			initialPolygons: [targetPolygon],
		});

		await screen.findByText(targetPolygon.name);
		await user.click(screen.getByRole("button", { name: `Delete ${targetPolygon.name}` }));

		expect(await screen.findByText(errorMessage)).toBeTruthy();
		expect(screen.getByText(targetPolygon.name)).toBeTruthy();
	});

	it("disables a polygon delete button while deletion is pending", async () => {
		let resolveDelete: () => void = () => undefined;
		const targetPolygon = generatePolygon();
		renderPolygonManager({
			deletePolygonAction: () =>
				new Promise((resolve) => {
					resolveDelete = resolve;
				}),
			initialPolygons: [targetPolygon],
		});

		await screen.findByText(targetPolygon.name);
		const deleteButton = screen.getByRole("button", { name: `Delete ${targetPolygon.name}` });
		fireEvent.click(deleteButton);

		expect((deleteButton as HTMLButtonElement).disabled).toBe(true);
		await act(async () => {
			resolveDelete();
			await Promise.resolve();
		});
	});
});
