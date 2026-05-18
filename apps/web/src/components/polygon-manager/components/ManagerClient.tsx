"use client";

import type { Polygon } from "@repo/polygons";
import { useCallback, useId, useMemo } from "react";
import { POLYGON_COLOR, POLYGON_TRANSPORT } from "../constants";
import { useDraftPolygon } from "../hooks/use-draft-polygon";
import { usePolygonCanvas } from "../hooks/use-polygon-canvas";
import { usePolygons } from "../hooks/use-polygons";
import { createPolygonClient, type PolygonActions } from "../polygon-transport";
import { PolygonCanvas } from "./Canvas";
import { PolygonEditorPanel } from "./EditorPanel";
import { PolygonListPanel } from "./ListPanel";

type PolygonManagerClientProps = PolygonActions;

const PolygonManagerClient = ({
	createPolygonAction,
	deletePolygonAction,
	listPolygonsAction,
}: PolygonManagerClientProps) => {
	const polygonNameId = useId();

	const client = useMemo(
		() => createPolygonClient({ createPolygonAction, deletePolygonAction, listPolygonsAction }, POLYGON_TRANSPORT),
		[createPolygonAction, deletePolygonAction, listPolygonsAction],
	);

	const { createPolygon, deletePolygon, deletingIds, error, isLoading, isSaving, pendingCreate, polygons } =
		usePolygons(client);
	const { addPoint, draftPoints, name, saveDraft, setName, undoLastPoint } = useDraftPolygon();

	const { canvasRef, handleCanvasClick, handleMouseMove, handleMouseLeave, hoveredPolygon, mousePos } =
		usePolygonCanvas({
			draftColor: POLYGON_COLOR,
			draftPoints,
			onAddDraftPoint: addPoint,
			polygons,
		});

	const handleSave = useCallback(() => void saveDraft(createPolygon), [saveDraft, createPolygon]);

	const handleDelete = useCallback((polygon: Polygon) => void deletePolygon(polygon), [deletePolygon]);

	return (
		<main className="min-h-svh bg-slate-50 px-4 py-6 text-slate-950 md:px-8">
			<div className="mx-auto flex max-w-7xl flex-col gap-5">
				<header className="flex flex-col gap-1">
					<h1 className="text-3xl font-semibold tracking-normal">Polygon Manager</h1>
					<p className="text-sm text-slate-600">Draw persisted zones on the image canvas.</p>
				</header>

				<section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
					<PolygonCanvas
						canvasRef={canvasRef}
						onCanvasClick={handleCanvasClick}
						onMouseMove={handleMouseMove}
						onMouseLeave={handleMouseLeave}
						hoveredPolygon={hoveredPolygon}
						mousePos={mousePos}
					/>

					<aside className="flex flex-col gap-4">
						<PolygonEditorPanel
							draftPointCount={draftPoints.length}
							error={error}
							isSaving={isSaving}
							name={name}
							nameInputId={polygonNameId}
							onNameChange={setName}
							onSave={handleSave}
							onUndoPoint={undoLastPoint}
						/>
						<PolygonListPanel
							deletingIds={deletingIds}
							isLoading={isLoading}
							onDeletePolygon={handleDelete}
							pendingCreate={pendingCreate}
							polygons={polygons}
						/>
					</aside>
				</section>
			</div>
		</main>
	);
};

export type { PolygonManagerClientProps };
export { PolygonManagerClient };
