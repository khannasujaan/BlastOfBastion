package model

import (
	uuid "github.com/google/uuid"
)

type Player struct {
	Id            uuid.UUID `json:"id"`
	Username      string    `json:"username"`
	Password_hash string    `json:"password_hash"`
	Is_deleted    bool      `json:"is_deleted"`
}

type PlayerStats struct {
	Id                  uuid.UUID `json:"player_id"`
	Gold                int       `json:"gold"`
	Elixir              int       `json:"elixir"`
	AttacksWon          int       `json:"attacks_won"`
	DefensesWon         int       `json:"defenses_won"`
	AttacksTotal        int       `json:"total_attacks"`
	DefendsTotal        int       `json:"total_defends"`
	Trophies            int       `json:"trophies"`
	LastTimeAttacked    string    `json:"last_attacked_time"`
	LastCollectedGold   string    `json:"last_collected_gold"`
	LastCollectedElixir string    `json:"last_collected_elixir"`
}
