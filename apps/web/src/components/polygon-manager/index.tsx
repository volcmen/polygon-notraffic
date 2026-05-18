import { PolygonManagerClient } from "./components/ManagerClient";
import { createPolygonAction, deletePolygonAction, listPolygonsAction } from "./polygon-actions";

const PolygonManager = () => {
	return (
		<PolygonManagerClient
			createPolygonAction={createPolygonAction}
			deletePolygonAction={deletePolygonAction}
			listPolygonsAction={listPolygonsAction}
		/>
	);
};

export { PolygonManager };
