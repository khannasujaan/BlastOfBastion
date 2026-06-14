package dto

import "github.com/google/uuid"

type Player struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoggingResponse struct {
	Message string `json:"message"`
	Token   string `json:"token"`
}

type BuildNewRequest struct {
	BuildingID int `json:"building_id"`
	GridX      int `json:"grid_x"`
	GridY      int `json:"grid_y"`
}
type BuildUpgradeStartRequest BuildNewRequest
type BuildUpgradeFinishRequest BuildNewRequest

type BuildMoveRequest struct {
	BuildingID int `json:"building_id"`
	GridX      int `json:"grid_x"`
	GridY      int `json:"grid_y"`
	IGridX     int `json:"init_grid_x"`
	IGridY     int `json:"init_grid_y"`
}

type VillageSync struct {
	Id         int    `json:"id"`
	BuildingID int    `json:"building_id"`
	Name       string `json:"name"`
	Level      int    `json:"level"`
	GridX      int    `json:"grid_x"`
	GridY      int    `json:"grid_y"`
}
type TroopsSync struct {
	TroopId  int    `json:"troop_id"`
	Name     string `json:"name"`
	Level    int    `json:"level"`
	Quantity int    `json:"quantity"`
}
type StatsSync struct {
	Gold      int `json:"gold"`
	Elixir    int `json:"elixir"`
	MaxGold   int `json:"max_gold"`
	MaxElixir int `json:"max_elixir"`
	Trophies  int `json:"trophies"`
}
type GameDataSyncResponse struct {
	Stats     StatsSync     `json:"stats"`
	Buildings []VillageSync `json:"buildings"`
	Troops    []TroopsSync  `json:"troops"`
}

type ResourceCollectedResponse struct {
	Change int `json:"change"`
}

type TroopRequest struct {
	TroopId  int `json:"troop_id"`
	Quantity int `json:"quantity"`
}
type TroopTrainRequest struct {
	Troops []TroopRequest `json:"troops"`
}

type TroopUpgradeRequest struct {
	TroopId int `json:"troop_id"`
}

type BattleResponse struct {
	Amount    int         `json:"amount"`
	Opponents []uuid.UUID `json:"opponents"`
}
