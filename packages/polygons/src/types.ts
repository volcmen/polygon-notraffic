type Point = [number, number];

interface Polygon {
	color: string;
	id: number;
	name: string;
	points: Point[];
}

interface CreatePolygonInput {
	name: string;
	points: Point[];
}

export type { CreatePolygonInput, Point, Polygon };
