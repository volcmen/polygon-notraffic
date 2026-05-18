import type { Polygon } from "@repo/polygons";
import { Button } from "@repo/ui/components/button";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Loader2, Trash2 } from "lucide-react";
import { memo } from "react";

interface PendingCreate {
	color: string;
	name: string;
	pointCount: number;
}

interface PolygonListPanelProps {
	deletingIds: Set<number>;
	isLoading: boolean;
	onDeletePolygon: (polygon: Polygon) => void;
	pendingCreate: PendingCreate | null;
	polygons: Polygon[];
}

const PolygonListSkeleton = () => {
	return (
		<div className="flex flex-col gap-2" data-testid="polygon-list-skeleton">
			{Array.from({ length: 3 }).map((_, index) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: pure static array representing loading state
					key={index}
					className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2"
				>
					<div className="flex min-w-0 items-center gap-3 flex-1">
						{/* Colour swatch skeleton */}
						<Skeleton className="size-3 shrink-0 rounded-full" />
						<div className="min-w-0 flex-1 flex flex-col gap-1.5">
							{/* Polygon name skeleton */}
							<Skeleton className="h-4 w-2/3 max-w-[120px]" />
							{/* Points count skeleton */}
							<Skeleton className="h-3 w-1/3 max-w-[60px]" />
						</div>
					</div>
					{/* Delete button skeleton */}
					<Skeleton className="h-8 w-8 shrink-0 rounded-md" />
				</div>
			))}
		</div>
	);
};

const PolygonListPanel = memo(function PolygonListPanel({
	deletingIds,
	isLoading,
	onDeletePolygon,
	pendingCreate,
	polygons,
}: PolygonListPanelProps) {
	const hasRows = polygons.length > 0 || pendingCreate !== null;
	const showInitialSkeleton = isLoading && !hasRows;
	const visibleCount = polygons.length + (pendingCreate ? 1 : 0);

	return (
		<div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
			<div className="flex items-center justify-between gap-3">
				<h2 className="text-base font-semibold text-slate-900">Saved polygons</h2>
				{hasRows ? (
					<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
						{visibleCount}
					</span>
				) : null}
			</div>

			<div className="mt-4">
				{showInitialSkeleton ? (
					<PolygonListSkeleton />
				) : (
					<>
						<PolygonListStatus hasRows={hasRows} />

						{hasRows ? (
							<ScrollArea className="h-[min(14.5svh,22rem)] rounded-md pr-3" type="always">
								<ul className="flex flex-col gap-2 pb-1 pr-1">
									{pendingCreate ? <PendingPolygonListItem pendingCreate={pendingCreate} /> : null}
									{polygons.map((polygon) => (
										<PolygonListItem
											deletingIds={deletingIds}
											key={polygon.id}
											onDelete={onDeletePolygon}
											polygon={polygon}
										/>
									))}
								</ul>
							</ScrollArea>
						) : null}
					</>
				)}
			</div>
		</div>
	);
});

interface PolygonListStatusProps {
	hasRows: boolean;
}

const PolygonListStatus = ({ hasRows }: PolygonListStatusProps) => {
	if (!hasRows) {
		return (
			<div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3">
				<p className="text-sm font-medium text-slate-700">No polygons saved yet.</p>
				<p className="mt-1 text-xs text-slate-500">Add at least 3 points, name the zone, then save it.</p>
			</div>
		);
	}

	return null;
};

interface PendingPolygonListItemProps {
	pendingCreate: PendingCreate;
}

const PendingPolygonListItem = ({ pendingCreate }: PendingPolygonListItemProps) => (
	<li className="flex items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-blue-950">
		<div className="flex min-w-0 items-center gap-3">
			<span
				aria-hidden="true"
				className="flex size-3 shrink-0 items-center justify-center rounded-full ring-2 ring-white"
				style={{ backgroundColor: pendingCreate.color }}
			/>
			<div className="min-w-0">
				<p className="truncate text-sm font-medium">{pendingCreate.name}</p>
				<p className="text-xs text-blue-700">Saving {pendingCreate.pointCount} points</p>
			</div>
		</div>
		<Button aria-label={`Delete ${pendingCreate.name}`} disabled={true} size="sm" type="button" variant="destructive">
			<Loader2 className="size-4 animate-spin" />
		</Button>
	</li>
);

interface PolygonListItemProps {
	deletingIds: Set<number>;
	onDelete: (polygon: Polygon) => void;
	polygon: Polygon;
}

const PolygonListItem = ({ deletingIds, onDelete, polygon }: PolygonListItemProps) => {
	const isDeleting = deletingIds.has(polygon.id);

	const handleOnDeleteClick = () => {
		onDelete(polygon);
	};

	return (
		<li
			className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 transition-opacity data-[deleting=true]:opacity-60"
			data-deleting={isDeleting}
		>
			<div className="flex min-w-0 items-center gap-3">
				{/* Colour swatch — decorative, described by the adjacent text */}
				<span
					aria-hidden="true"
					className="size-3 shrink-0 rounded-full ring-2 ring-white"
					style={{ backgroundColor: polygon.color }}
				/>
				<div className="min-w-0">
					<p className="truncate text-sm font-medium text-slate-900">{polygon.name}</p>
					<p className="text-xs text-slate-500">{polygon.points.length} points</p>
				</div>
			</div>
			<Button
				aria-label={`Delete ${polygon.name}`}
				disabled={isDeleting}
				onClick={handleOnDeleteClick}
				size="sm"
				type="button"
				variant="destructive"
			>
				{isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
			</Button>
		</li>
	);
};

export { PolygonListPanel };
