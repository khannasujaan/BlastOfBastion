package main

import (
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/khannasujaan/BlastOfBastion/internal/database"
	"github.com/khannasujaan/BlastOfBastion/internal/dto"
)

func Seed(playerData dto.PlayerData) error {
	tx, err := database.Db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	playerQuery := `
	INSERT INTO players (username, password_hash) 
	VALUES ($1, $2) 
	RETURNING id
	`
	var id string
	err = tx.QueryRow(playerQuery, playerData.Username, playerData.PasswordHash).Scan(&id)
	if err != nil {
		return err
	}

	playerStatsQuery := `INSERT INTO player_stats (player_id, last_attacked_time) VALUES ($1, $2)`
	res, err := tx.Exec(playerStatsQuery, id, time.Now().Add(-24*60*time.Minute))
	if err != nil {
		return err
	}
	noRows, err := res.RowsAffected()
	if err != nil {
		return err
	} else if noRows == 0 {
		return errors.New("No rows affected")
	}

	playerBuildingQuery := `
	INSERT INTO player_buildings (player_id, building_id, grid_x, grid_y, built_by, is_built) 
	VALUES ($1, $2, $3, $4, NULL, true)
	`
	for _, b := range playerData.Buildings {
		res, err = tx.Exec(playerBuildingQuery, id, b.BuildingId, b.GridX, b.GridY)
		if err != nil {
			return err
		}
		noRows, err = res.RowsAffected()
		if err != nil {
			return err
		} else if noRows == 0 {
			return errors.New("No rows affected")
		}
	}

	troopUnlockedQuery := `
	INSERT INTO troops_unlocked (player_id, troop_name, troop_id)
	VALUES ($1, $2, $3)
	`
	for _, t := range playerData.Troops {
		res, err = tx.Exec(troopUnlockedQuery, id, t.TroopName, t.TroopId)
		if err != nil {
			return err
		}
		noRows, err = res.RowsAffected()
		if err != nil {
			return err
		} else if noRows == 0 {
			return errors.New("No rows affected")
		}
	}

	err = tx.Commit()
	if err != nil {
		return err
	}
	return nil
}

func SeedAllPlayers() {
	t1 := []dto.PlayerDataTroops{
		{TroopName: "Barbarian", TroopId: 101},
		{TroopName: "Archer", TroopId: 200},
		{TroopName: "Goblin", TroopId: 300},
		{TroopName: "Giant", TroopId: 400},
		{TroopName: "Wizard", TroopId: 500},
	}
	t2 := []dto.PlayerDataTroops{
		{TroopName: "Barbarian", TroopId: 101},
		{TroopName: "Archer", TroopId: 201},
		{TroopName: "Goblin", TroopId: 301},
		{TroopName: "Giant", TroopId: 401},
		{TroopName: "Wizard", TroopId: 500},
	}
	t3 := []dto.PlayerDataTroops{
		{TroopName: "Barbarian", TroopId: 102},
		{TroopName: "Archer", TroopId: 202},
		{TroopName: "Goblin", TroopId: 302},
		{TroopName: "Giant", TroopId: 402},
		{TroopName: "Wizard", TroopId: 501},
	}
	t4 := []dto.PlayerDataTroops{
		{TroopName: "Barbarian", TroopId: 103},
		{TroopName: "Archer", TroopId: 203},
		{TroopName: "Goblin", TroopId: 303},
		{TroopName: "Giant", TroopId: 402},
		{TroopName: "Wizard", TroopId: 501},
	}

	players := []dto.PlayerData{
		{
			Username:     "th1a",
			PasswordHash: "$2a$10$nPgrbDs86.LBmzZlDIwBFerKIcqt6u0JvIIb8XrMSm0qZTgrJkRgW",
			Buildings: []dto.PlayerDataBuildings{
				{BuildingId: 3001, GridX: 15, GridY: 15},
				{BuildingId: 3031, GridX: 10, GridY: 10},
				{BuildingId: 4001, GridX: 19, GridY: 12},
				{BuildingId: 2011, GridX: 20, GridY: 23},
				{BuildingId: 2021, GridX: 11, GridY: 17},
			},
			Troops: t1,
		},
		{
			Username:     "th1b",
			PasswordHash: "$2a$10$nPgrbDs86.LBmzZlDIwBFerKIcqt6u0JvIIb8XrMSm0qZTgrJkRgW",
			Buildings: []dto.PlayerDataBuildings{
				{BuildingId: 3001, GridX: 15, GridY: 15},
				{BuildingId: 3031, GridX: 10, GridY: 10},
				{BuildingId: 4001, GridX: 19, GridY: 12},
				{BuildingId: 2011, GridX: 20, GridY: 23},
				{BuildingId: 2021, GridX: 11, GridY: 17},
				{BuildingId: 1011, GridX: 12, GridY: 14},
			},
			Troops: t1,
		},
		{
			Username:     "th1c",
			PasswordHash: "$2a$10$nPgrbDs86.LBmzZlDIwBFerKIcqt6u0JvIIb8XrMSm0qZTgrJkRgW",
			Buildings: []dto.PlayerDataBuildings{
				{BuildingId: 3001, GridX: 15, GridY: 15},
				{BuildingId: 3031, GridX: 10, GridY: 10},
				{BuildingId: 4001, GridX: 19, GridY: 12},
				{BuildingId: 2011, GridX: 20, GridY: 23},
				{BuildingId: 2021, GridX: 11, GridY: 17},
				{BuildingId: 1011, GridX: 12, GridY: 14},
				{BuildingId: 1011, GridX: 11, GridY: 25},
			},
			Troops: t1,
		},
		{
			Username:     "th2a",
			PasswordHash: "$2a$10$nPgrbDs86.LBmzZlDIwBFerKIcqt6u0JvIIb8XrMSm0qZTgrJkRgW",
			Buildings: []dto.PlayerDataBuildings{
				{BuildingId: 3002, GridX: 15, GridY: 15},
				{BuildingId: 3031, GridX: 10, GridY: 10},
				{BuildingId: 3012, GridX: 7, GridY: 7},
				{BuildingId: 3022, GridX: 1, GridY: 1},
				{BuildingId: 4002, GridX: 19, GridY: 12},
				{BuildingId: 2012, GridX: 20, GridY: 23},
				{BuildingId: 2022, GridX: 11, GridY: 17},
				{BuildingId: 1012, GridX: 12, GridY: 14},
				{BuildingId: 1012, GridX: 11, GridY: 25},
			},
			Troops: t2,
		},
		{
			Username:     "th2b",
			PasswordHash: "$2a$10$nPgrbDs86.LBmzZlDIwBFerKIcqt6u0JvIIb8XrMSm0qZTgrJkRgW",
			Buildings: []dto.PlayerDataBuildings{
				{BuildingId: 3002, GridX: 15, GridY: 15},
				{BuildingId: 3031, GridX: 10, GridY: 10},
				{BuildingId: 3012, GridX: 7, GridY: 7},
				{BuildingId: 3022, GridX: 1, GridY: 1},
				{BuildingId: 4002, GridX: 19, GridY: 12},
				{BuildingId: 2012, GridX: 20, GridY: 23},
				{BuildingId: 2022, GridX: 11, GridY: 17},
				{BuildingId: 1012, GridX: 12, GridY: 14},
				{BuildingId: 1012, GridX: 11, GridY: 25},
				{BuildingId: 1022, GridX: 25, GridY: 25},
			},
			Troops: t2,
		},
		{
			Username:     "th2c",
			PasswordHash: "$2a$10$nPgrbDs86.LBmzZlDIwBFerKIcqt6u0JvIIb8XrMSm0qZTgrJkRgW",
			Buildings: []dto.PlayerDataBuildings{
				{BuildingId: 3002, GridX: 15, GridY: 15},
				{BuildingId: 3031, GridX: 10, GridY: 10},
				{BuildingId: 3012, GridX: 7, GridY: 7},
				{BuildingId: 3022, GridX: 1, GridY: 1},
				{BuildingId: 4002, GridX: 19, GridY: 12},
				{BuildingId: 2012, GridX: 20, GridY: 23},
				{BuildingId: 2022, GridX: 11, GridY: 17},
				{BuildingId: 1012, GridX: 12, GridY: 14},
				{BuildingId: 1012, GridX: 11, GridY: 25},
				{BuildingId: 1022, GridX: 25, GridY: 25},
			},
			Troops: t2,
		},
		{
			Username:     "th3a",
			PasswordHash: "$2a$10$nPgrbDs86.LBmzZlDIwBFerKIcqt6u0JvIIb8XrMSm0qZTgrJkRgW",
			Buildings: []dto.PlayerDataBuildings{
				{BuildingId: 3003, GridX: 15, GridY: 15},
				{BuildingId: 3031, GridX: 10, GridY: 10},
				{BuildingId: 3013, GridX: 7, GridY: 7},
				{BuildingId: 3023, GridX: 1, GridY: 1},
				{BuildingId: 4002, GridX: 19, GridY: 12},
				{BuildingId: 2013, GridX: 20, GridY: 23},
				{BuildingId: 2023, GridX: 11, GridY: 17},
				{BuildingId: 1013, GridX: 12, GridY: 14},
				{BuildingId: 1013, GridX: 11, GridY: 25},
				{BuildingId: 1023, GridX: 25, GridY: 25},
			},
			Troops: t3,
		},
		{
			Username:     "th3b",
			PasswordHash: "$2a$10$nPgrbDs86.LBmzZlDIwBFerKIcqt6u0JvIIb8XrMSm0qZTgrJkRgW",
			Buildings: []dto.PlayerDataBuildings{
				{BuildingId: 3003, GridX: 15, GridY: 15},
				{BuildingId: 3031, GridX: 10, GridY: 10},
				{BuildingId: 3013, GridX: 7, GridY: 7},
				{BuildingId: 3023, GridX: 1, GridY: 1},
				{BuildingId: 4002, GridX: 19, GridY: 12},
				{BuildingId: 2013, GridX: 20, GridY: 23},
				{BuildingId: 2023, GridX: 11, GridY: 17},
				{BuildingId: 1013, GridX: 12, GridY: 14},
				{BuildingId: 1013, GridX: 11, GridY: 25},
				{BuildingId: 1023, GridX: 25, GridY: 25},
			},
			Troops: t3,
		},
		{
			Username:     "th3c",
			PasswordHash: "$2a$10$nPgrbDs86.LBmzZlDIwBFerKIcqt6u0JvIIb8XrMSm0qZTgrJkRgW",
			Buildings: []dto.PlayerDataBuildings{
				{BuildingId: 3003, GridX: 15, GridY: 15},
				{BuildingId: 3031, GridX: 10, GridY: 10},
				{BuildingId: 3013, GridX: 7, GridY: 7},
				{BuildingId: 3023, GridX: 1, GridY: 1},
				{BuildingId: 4002, GridX: 19, GridY: 12},
				{BuildingId: 2013, GridX: 20, GridY: 23},
				{BuildingId: 2023, GridX: 11, GridY: 17},
				{BuildingId: 1013, GridX: 12, GridY: 14},
				{BuildingId: 1013, GridX: 11, GridY: 25},
				{BuildingId: 1023, GridX: 25, GridY: 25},
			},
			Troops: t3,
		},
		{
			Username:     "th4a",
			PasswordHash: "$2a$10$nPgrbDs86.LBmzZlDIwBFerKIcqt6u0JvIIb8XrMSm0qZTgrJkRgW",
			Buildings: []dto.PlayerDataBuildings{
				{BuildingId: 3004, GridX: 15, GridY: 15},
				{BuildingId: 3031, GridX: 10, GridY: 10},
				{BuildingId: 3032, GridX: 4, GridY: 4},
				{BuildingId: 3013, GridX: 7, GridY: 7},
				{BuildingId: 3023, GridX: 1, GridY: 1},
				{BuildingId: 4002, GridX: 19, GridY: 12},
				{BuildingId: 2013, GridX: 20, GridY: 23},
				{BuildingId: 2023, GridX: 11, GridY: 17},
				{BuildingId: 1014, GridX: 12, GridY: 14},
				{BuildingId: 1014, GridX: 11, GridY: 25},
				{BuildingId: 1014, GridX: 11, GridY: 29},
				{BuildingId: 1024, GridX: 25, GridY: 25},
				{BuildingId: 1024, GridX: 17, GridY: 25},
			},
			Troops: t4,
		},
		{
			Username:     "th4b",
			PasswordHash: "$2a$10$nPgrbDs86.LBmzZlDIwBFerKIcqt6u0JvIIb8XrMSm0qZTgrJkRgW",
			Buildings: []dto.PlayerDataBuildings{
				{BuildingId: 3004, GridX: 15, GridY: 15},
				{BuildingId: 3031, GridX: 10, GridY: 10},
				{BuildingId: 3032, GridX: 4, GridY: 4},
				{BuildingId: 3013, GridX: 7, GridY: 7},
				{BuildingId: 3023, GridX: 1, GridY: 1},
				{BuildingId: 4002, GridX: 19, GridY: 12},
				{BuildingId: 2013, GridX: 20, GridY: 23},
				{BuildingId: 2023, GridX: 11, GridY: 17},
				{BuildingId: 1014, GridX: 12, GridY: 14},
				{BuildingId: 1014, GridX: 11, GridY: 25},
				{BuildingId: 1014, GridX: 11, GridY: 29},
				{BuildingId: 1024, GridX: 25, GridY: 25},
				{BuildingId: 1024, GridX: 17, GridY: 25},
			},
			Troops: t4,
		},
		{
			Username:     "th4c",
			PasswordHash: "$2a$10$nPgrbDs86.LBmzZlDIwBFerKIcqt6u0JvIIb8XrMSm0qZTgrJkRgW",
			Buildings: []dto.PlayerDataBuildings{
				{BuildingId: 3004, GridX: 15, GridY: 15},
				{BuildingId: 3031, GridX: 10, GridY: 10},
				{BuildingId: 3032, GridX: 4, GridY: 4},
				{BuildingId: 3013, GridX: 7, GridY: 7},
				{BuildingId: 3023, GridX: 1, GridY: 1},
				{BuildingId: 4002, GridX: 19, GridY: 12},
				{BuildingId: 2013, GridX: 20, GridY: 23},
				{BuildingId: 2023, GridX: 11, GridY: 17},
				{BuildingId: 1014, GridX: 12, GridY: 14},
				{BuildingId: 1014, GridX: 11, GridY: 25},
				{BuildingId: 1014, GridX: 11, GridY: 29},
				{BuildingId: 1024, GridX: 25, GridY: 25},
				{BuildingId: 1024, GridX: 17, GridY: 25},
			},
			Troops: t4,
		},
	}

	successCount := 0

	for _, player := range players {
		err := Seed(player)
		if err != nil {
			log.Printf("%s: %v\n", player.Username, err)
		} else {
			successCount++
			fmt.Printf("%s\n", player.Username)
		}
	}

	log.Printf("%d/%d\n", successCount, len(players))
}
