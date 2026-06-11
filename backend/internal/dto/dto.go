package dto

type Player struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoggingResponse struct {
	Message string `json:"message"`
	Token   string `json:"token"`
}

type BuildRequest struct {
	BuildingID string `json:"building_id"`
	GridX      int    `json:"grid_x"`
	GridY      int    `json:"grid_y"`
}

type BuildMoveRequest struct {
	BuildingID string `json:"building_id"`
	GridX      int    `json:"grid_x"`
	GridY      int    `json:"grid_y"`
	IGridX     int    `json:"init_grid_x"`
	IGridY     int    `json:"init_grid_y"`
}
