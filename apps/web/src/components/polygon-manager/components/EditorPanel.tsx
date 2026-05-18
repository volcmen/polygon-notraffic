import { Button } from "@repo/ui/components/button";
import { Loader2, Undo2 } from "lucide-react";
import { memo } from "react";
import { MIN_POLYGON_POINTS } from "../constants";

interface PolygonEditorPanelProps {
	draftPointCount: number;
	error: string | null;
	isSaving: boolean;
	name: string;
	nameInputId: string;
	onNameChange: (name: string) => void;
	onSave: () => void;
	onUndoPoint: () => void;
}

const PolygonEditorPanel = memo(function PolygonEditorPanel({
	draftPointCount,
	error,
	isSaving,
	name,
	nameInputId,
	onNameChange,
	onSave,
	onUndoPoint,
}: PolygonEditorPanelProps) {
	const hasEnoughPoints = draftPointCount >= MIN_POLYGON_POINTS;
	const canSave = !isSaving && name.trim() !== "" && hasEnoughPoints;
	const isUndoDisabled = draftPointCount === 0 || isSaving;

	const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		onNameChange(event.target.value);
	};

	return (
		<div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
			<div className="flex items-center justify-between gap-3">
				<h2 className="text-base font-semibold text-slate-900">New polygon</h2>
				<Button
					aria-label="Undo last point"
					disabled={isUndoDisabled}
					onClick={onUndoPoint}
					size="sm"
					type="button"
					variant="secondary"
				>
					<Undo2 className="size-4" />
				</Button>
			</div>

			<div className="mt-4 flex flex-col gap-3">
				<label className="grid gap-2 text-sm font-medium" htmlFor={nameInputId}>
					Polygon name
					<input
						className="h-9 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
						disabled={isSaving}
						id={nameInputId}
						onChange={handleNameChange}
						placeholder="Entrance zone"
						value={name}
					/>
				</label>

				<p className="text-sm text-slate-600">
					{draftPointCount} point{draftPointCount !== 1 ? "s" : ""} selected
					{!hasEnoughPoints && <span className="ml-1 text-slate-400">({MIN_POLYGON_POINTS} minimum)</span>}
				</p>

				<Button disabled={!canSave} onClick={onSave} type="button">
					{isSaving ? (
						<>
							<Loader2 className="size-4 animate-spin" />
							Saving
						</>
					) : (
						"Save polygon"
					)}
				</Button>

				{error ? <p className="text-sm text-red-600">{error}</p> : null}
			</div>
		</div>
	);
});

export { PolygonEditorPanel };
