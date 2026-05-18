import { describe, expect, it, mock } from "bun:test";
import { faker } from "@faker-js/faker";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PolygonEditorPanel } from "../../../src/components/polygon-manager/components/EditorPanel";

describe("EditorPanel", () => {
	const defaultProps = {
		draftPointCount: 0,
		error: null,
		isSaving: false,
		name: "",
		nameInputId: faker.string.uuid(),
		onNameChange: mock(() => undefined),
		onSave: mock(() => undefined),
		onUndoPoint: mock(() => undefined),
	};

	it("renders empty state correctly", () => {
		render(<PolygonEditorPanel {...defaultProps} />);

		expect(screen.getByText("New polygon")).toBeInTheDocument();
		expect(screen.getByLabelText("Polygon name")).toBeInTheDocument();
		expect(screen.getByText(/0 points selected/i)).toBeInTheDocument();
		expect(screen.getByText("(3 minimum)")).toBeInTheDocument();

		const undoButton = screen.getByRole("button", { name: "Undo last point" });
		expect(undoButton).toBeDisabled();

		const saveButton = screen.getByRole("button", { name: "Save polygon" });
		expect(saveButton).toBeDisabled();
	});

	it("disables save button if name is empty but has enough points", () => {
		render(<PolygonEditorPanel {...defaultProps} draftPointCount={faker.number.int({ min: 3, max: 10 })} name="   " />);

		const saveButton = screen.getByRole("button", { name: "Save polygon" });
		expect(saveButton).toBeDisabled();
	});

	it("disables save button if has name but not enough points", () => {
		const fakeName = faker.location.street();
		render(
			<PolygonEditorPanel {...defaultProps} draftPointCount={faker.number.int({ min: 0, max: 2 })} name={fakeName} />,
		);

		const saveButton = screen.getByRole("button", { name: "Save polygon" });
		expect(saveButton).toBeDisabled();
	});

	it("enables save button when valid and handles click", async () => {
		const onSaveMock = mock(() => undefined);
		const fakeName = faker.location.street();
		render(
			<PolygonEditorPanel
				{...defaultProps}
				draftPointCount={faker.number.int({ min: 3, max: 10 })}
				name={fakeName}
				onSave={onSaveMock}
			/>,
		);

		const saveButton = screen.getByRole("button", { name: "Save polygon" });
		expect(saveButton).not.toBeDisabled();

		const user = userEvent.setup();
		await user.click(saveButton);
		expect(onSaveMock).toHaveBeenCalled();
	});

	it("shows saving state and disables interactions", () => {
		const fakeName = faker.location.street();
		render(
			<PolygonEditorPanel
				{...defaultProps}
				draftPointCount={faker.number.int({ min: 3, max: 10 })}
				name={fakeName}
				isSaving={true}
			/>,
		);

		const saveButton = screen.getByRole("button", { name: /saving/i });
		expect(saveButton).toBeDisabled();

		const undoButton = screen.getByRole("button", { name: "Undo last point" });
		expect(undoButton).toBeDisabled();

		const nameInput = screen.getByLabelText("Polygon name");
		expect(nameInput).toBeDisabled();
	});

	it("displays error message if present", () => {
		const errorMessage = faker.lorem.sentence();
		render(<PolygonEditorPanel {...defaultProps} error={errorMessage} />);

		expect(screen.getByText(errorMessage)).toBeInTheDocument();
	});

	it("calls onNameChange when typing", async () => {
		const onNameChangeMock = mock((_val: string) => undefined);
		render(<PolygonEditorPanel {...defaultProps} onNameChange={onNameChangeMock} />);

		const nameInput = screen.getByLabelText("Polygon name");
		const user = userEvent.setup();

		const typedText = faker.string.alpha(1);
		await user.type(nameInput, typedText);

		expect(onNameChangeMock).toHaveBeenLastCalledWith(typedText);
	});

	it("calls onUndoPoint when undo clicked", async () => {
		const onUndoPointMock = mock(() => undefined);
		render(
			<PolygonEditorPanel
				{...defaultProps}
				draftPointCount={faker.number.int({ min: 1, max: 10 })}
				onUndoPoint={onUndoPointMock}
			/>,
		);

		const undoButton = screen.getByRole("button", { name: "Undo last point" });
		expect(undoButton).not.toBeDisabled();

		const user = userEvent.setup();
		await user.click(undoButton);

		expect(onUndoPointMock).toHaveBeenCalled();
	});

	it("disables undo button when no draft points exist", () => {
		render(<PolygonEditorPanel {...defaultProps} draftPointCount={0} />);

		const undoButton = screen.getByRole("button", { name: "Undo last point" });
		expect(undoButton).toBeDisabled();
	});

	it("shows correct point count with exactly 3 points", () => {
		render(<PolygonEditorPanel {...defaultProps} draftPointCount={3} name="Test" />);

		expect(screen.getByText(/3 points selected/i)).toBeInTheDocument();
	});

	it("shows correct point count with many points", () => {
		render(<PolygonEditorPanel {...defaultProps} draftPointCount={15} name="Test" />);

		expect(screen.getByText(/15 points selected/i)).toBeInTheDocument();
	});

	it("enables save button at exactly 3 points with a name", () => {
		render(<PolygonEditorPanel {...defaultProps} draftPointCount={3} name="Valid" />);

		const saveButton = screen.getByRole("button", { name: "Save polygon" });
		expect(saveButton).not.toBeDisabled();
	});

	it("shows error message below the form", () => {
		const errorMessage = faker.lorem.sentence();
		render(<PolygonEditorPanel {...defaultProps} error={errorMessage} draftPointCount={3} name="Test" />);

		expect(screen.getByText(errorMessage)).toBeInTheDocument();
	});

	it("disables name input while saving", () => {
		render(<PolygonEditorPanel {...defaultProps} isSaving={true} />);

		const nameInput = screen.getByLabelText("Polygon name");
		expect(nameInput).toBeDisabled();
	});

	it("displays header text for new polygon", () => {
		render(<PolygonEditorPanel {...defaultProps} />);

		expect(screen.getByText("New polygon")).toBeInTheDocument();
	});
});
