import type { CreatePolygonInput, Polygon } from "@repo/polygons";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { POLYGON_COLOR } from "../constants";
import type { PolygonClient } from "../polygon-transport";

interface State {
	deletingIds: Set<number>;
	error: string | null;
	isLoading: boolean;
	isSaving: boolean;
	pendingCreate: PendingCreate | null;
	polygons: Polygon[];
}

interface PendingCreate {
	color: string;
	name: string;
	pointCount: number;
}

type Action =
	| { type: "load_start" }
	| { type: "loaded"; polygons: Polygon[] }
	| { type: "load_failed"; error: string }
	| { type: "save_start"; input: CreatePolygonInput }
	| { type: "saved"; polygon: Polygon }
	| { type: "save_failed"; error: string }
	| { type: "delete_start"; id: number }
	| { type: "deleted"; id: number }
	| { type: "delete_failed"; id: number; error: string };

const initialState: State = {
	deletingIds: new Set(),
	error: null,
	isLoading: true,
	isSaving: false,
	pendingCreate: null,
	polygons: [],
};

const reducer = (state: State, action: Action): State => {
	switch (action.type) {
		case "load_start":
			return { ...state, error: null, isLoading: true };

		case "loaded":
			return { ...state, isLoading: false, polygons: action.polygons };

		case "load_failed":
			return { ...state, error: action.error, isLoading: false };

		case "save_start":
			return {
				...state,
				error: null,
				isSaving: true,
				pendingCreate: {
					color: POLYGON_COLOR,
					name: action.input.name.trim(),
					pointCount: action.input.points.length,
				},
			};

		case "saved": {
			return {
				...state,
				isSaving: false,
				pendingCreate: null,
				polygons: [...state.polygons, action.polygon],
			};
		}

		case "save_failed":
			return { ...state, error: action.error, isSaving: false, pendingCreate: null };

		case "delete_start": {
			const next = new Set(state.deletingIds);
			next.add(action.id);
			return { ...state, deletingIds: next, error: null };
		}

		case "deleted": {
			const next = new Set(state.deletingIds);
			next.delete(action.id);
			return {
				...state,
				deletingIds: next,
				polygons: state.polygons.filter((p) => p.id !== action.id),
			};
		}

		case "delete_failed": {
			const next = new Set(state.deletingIds);
			next.delete(action.id);
			return { ...state, deletingIds: next, error: action.error };
		}
	}
};

const toErrorMessage = (error: unknown, fallback: string): string =>
	error instanceof Error ? error.message : fallback;

const usePolygons = (client: PolygonClient) => {
	const loadRequestId = useRef(0);
	const [{ deletingIds, error, isLoading, isSaving, pendingCreate, polygons }, dispatch] = useReducer(
		reducer,
		initialState,
	);

	useEffect(() => {
		const controller = new AbortController();
		let isActive = true;
		const requestId = loadRequestId.current + 1;
		loadRequestId.current = requestId;

		const loadPolygons = async () => {
			dispatch({ type: "load_start" });

			try {
				const items = await client.list(controller.signal);
				if (isActive && loadRequestId.current === requestId) dispatch({ type: "loaded", polygons: items });
			} catch (err) {
				if (controller.signal.aborted) return;
				if (isActive && loadRequestId.current === requestId) {
					dispatch({ type: "load_failed", error: toErrorMessage(err, "Could not load polygons.") });
				}
			}
		};

		void loadPolygons();

		return () => {
			isActive = false;
			controller.abort();
		};
	}, [client]);

	const createPolygon = useCallback(
		async (input: CreatePolygonInput): Promise<boolean> => {
			if (input.points.length < 3) {
				dispatch({ type: "save_failed", error: "A polygon needs at least 3 points." });
				return false;
			}

			dispatch({ type: "save_start", input });

			try {
				const polygon = await client.create(input);
				dispatch({ type: "saved", polygon });
				return true;
			} catch (err) {
				dispatch({ type: "save_failed", error: toErrorMessage(err, "Could not save polygon.") });
				return false;
			}
		},
		[client],
	);

	const deletePolygon = useCallback(
		async (polygon: Polygon): Promise<void> => {
			dispatch({ type: "delete_start", id: polygon.id });

			try {
				await client.delete(polygon.id);
				dispatch({ type: "deleted", id: polygon.id });
			} catch (err) {
				dispatch({ type: "delete_failed", id: polygon.id, error: toErrorMessage(err, "Could not delete polygon.") });
			}
		},
		[client],
	);

	return {
		createPolygon,
		deletePolygon,
		deletingIds,
		error,
		isLoading,
		isSaving,
		pendingCreate,
		polygons,
	} as const;
};

export { usePolygons };
