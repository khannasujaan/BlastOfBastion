package dto

import (
	"time"

	"github.com/google/uuid"
)

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
	Id         int        `json:"id"`
	BuildingID int        `json:"building_id"`
	Name       string     `json:"name"`
	Level      int        `json:"level"`
	GridX      int        `json:"grid_x"`
	GridY      int        `json:"grid_y"`
	IsBuilt    bool       `json:"is_built"`
	FinishTime *time.Time `json:"finish_time"`
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
	TroopName string `json:"troop_name"`
	Quantity  int    `json:"quantity"`
}
type TroopTrainRequest struct {
	Troops []TroopRequest `json:"troops"`
}

type TroopUpgradeRequest struct {
	TroopName string `json:"troop_name"`
}

type BattleId struct {
	Opponent uuid.UUID `json:"opponent"`
	Name     string    `json:"name"`
}
type GetVillageRequest struct {
	Opponent uuid.UUID `json:"opponent"`
}
type VillageBattle struct {
	Id         int        `json:"id"`
	BuildingID int        `json:"building_id"`
	Name       string     `json:"name"`
	Level      int        `json:"level"`
	GridX      int        `json:"grid_x"`
	GridY      int        `json:"grid_y"`
	IsBuilt    bool       `json:"is_built"`
	FinishTime *time.Time `json:"finish_time"`
	HP         int        `json:"hp"`
}
type TroopBattle struct {
	TroopId  int    `json:"troop_id"`
	Name     string `json:"name"`
	Level    int    `json:"level"`
	Quantity int    `json:"quantity"`
	Speed    int    `json:"speed"`
	Range    int    `json:"range"`
	Damage   int    `json:"damage"`
	HP       int    `json:"hp"`
}

type BattleResponse struct {
	Gold      int             `json:"gold"`
	Elixir    int             `json:"elixir"`
	Opponent  uuid.UUID       `json:"opponent"`
	Name      string          `json:"name"`
	Buildings []VillageBattle `json:"buildings"`
	Troops    []TroopBattle   `json:"troops"`
}
type Defences struct {
	Id          int        `json:"id"`
	BuildingID  int        `json:"building_id"`
	Name        string     `json:"name"`
	Level       int        `json:"level"`
	GridX       int        `json:"grid_x"`
	GridY       int        `json:"grid_y"`
	IsBuilt     bool       `json:"is_built"`
	FinishTime  *time.Time `json:"finish_time"`
	HP          int        `json:"hp"`
	Range       int        `json:"range"`
	Damage      int        `json:"damage"`
	AttackSpeed int        `json:"attackspeed"`
}
type DefenceResponse struct {
	Defences []Defences `json:"defences"`
}

type BattleEnd struct {
	Defender   uuid.UUID `json:"defender"`
	Percantage int       `json:"percentage"`
	Gold       int       `json:"gold"`
	Elixir     int       `json:"elixir"`
}
