import type { CreatePolygonInput, Point } from "@repo/polygons";
import { useCallback, useState } from "react";

type CreatePolygonFn = (input: CreatePolygonInput) => Promise<boolean>;

interface UseDraftPolygonResult {
	draftPoints: Point[];
	name: string;
	setName: React.Dispatch<React.SetStateAction<string>>;
	addPoint: (point: Point) => void;
	undoLastPoint: () => void;
	saveDraft: (createPolygon: CreatePolygonFn) => Promise<void>;
}

const useDraftPolygon = (): UseDraftPolygonResult => {
	const [draftPoints, setDraftPoints] = useState<Point[]>([]);
	const [name, setName] = useState("");

	const addPoint = useCallback((point: Point) => {
		setDraftPoints((current) => [...current, point]);
	}, []);

	const undoLastPoint = useCallback(() => {
		setDraftPoints((current) => current.slice(0, -1));
	}, []);

	const reset = useCallback(() => {
		setDraftPoints([]);
		setName("");
	}, []);

	const saveDraft = useCallback(
		async (createPolygon: CreatePolygonFn) => {
			const saved = await createPolygon({ name: name.trim(), points: draftPoints });
			if (saved) {
				reset();
			}
		},
		[draftPoints, name, reset],
	);

	return {
		addPoint,
		draftPoints,
		name,
		saveDraft,
		setName,
		undoLastPoint,
	} as const;
};

export { useDraftPolygon };
