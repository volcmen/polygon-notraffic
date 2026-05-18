"use server";

import { type CreatePolygonInput, createPolygonService } from "@repo/polygons";

const getPolygonService = () => createPolygonService();

const listPolygonsAction = async () => {
	return await getPolygonService().listPolygons();
};

const createPolygonAction = async (input: CreatePolygonInput) => {
	const polygon = await getPolygonService().createPolygon(input);
	return polygon;
};

const deletePolygonAction = async (id: number) => {
	await getPolygonService().deletePolygon(id);
};

export { createPolygonAction, deletePolygonAction, listPolygonsAction };
