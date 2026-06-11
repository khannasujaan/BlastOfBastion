package model

import (
	"time"

	uuid "github.com/google/uuid"
)

type Player struct {
	Id            uuid.UUID `json:"id"`
	Username      string    `json:"username"`
	Password_hash string    `json:"password_hash"`
	Is_deleted    bool      `json:"is_deleted"`
}

type PlayerStats struct {
	Id                  uuid.UUID  `json:"player_id"`
	Gold                int        `json:"gold"`
	Elixir              int        `json:"elixir"`
	AttacksWon          int        `json:"attacks_won"`
	DefensesWon         int        `json:"defenses_won"`
	AttacksTotal        int        `json:"total_attacks"`
	DefendsTotal        int        `json:"total_defends"`
	Trophies            int        `json:"trophies"`
	LastTimeAttacked    *time.Time `json:"last_attacked_time"`
	LastCollectedGold   *time.Time `json:"last_collected_gold"`
	LastCollectedElixir *time.Time `json:"last_collected_elixir"`
}

type PlayerBuilding struct {
	ID         int        `json:"id"`
	PlayerID   uuid.UUID  `json:"player_id"`
	BuildingID uuid.UUID  `json:"building_id"`
	GridX      int        `json:"grid_x"`
	GridY      int        `json:"grid_y"`
	BuiltBy    *time.Time `json:"built_by"`
	IsBuilt    bool       `json:"is_built"`
}
