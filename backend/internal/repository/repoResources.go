package repository

import (
	"database/sql"
	"errors"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/khannasujaan/BlastOfBastion/internal/database"
)

var ErrPlayerNotFound = errors.New("Player not found")
var ErrUnknownResource = errors.New("Unknown resource")

func GetPlayerMaxStorageResource(id uuid.UUID, storName string, tx *sql.Tx) (int, error) {
	if !((storName == "GoldMine") || (storName == "ElixirColl")) {
		return 0, ErrUnknownResource
	}

	maxCapacity := 0
	storQuery := `
	SELECT rs.storage
	FROM resource_storage rs 
	JOIN player_buildings pb ON pb.building_id = rs.building_id
	JOIN building_catalog bc ON pb.building_id = bc.id
	WHERE player_id = $1 AND bc.name = $2
	`
	rows, err := tx.Query(storQuery, id, storName)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	for rows.Next() {
		var stor int
		err = rows.Scan(&stor)
		if err != nil {
			log.Println("Error in fetching Data, ", err)
			return 0, err
		}
		maxCapacity += stor
	}

	storQuery = `
	SELECT rs.storage
	FROM resource_storage rs 
	JOIN player_buildings pb ON pb.building_id = rs.building_id
	JOIN building_catalog bc ON pb.building_id = bc.id
	WHERE pb.player_id = $1 AND bc.name = 'TownHall'
	`
	var townhallStor int
	err = tx.QueryRow(storQuery, id).Scan(&townhallStor)
	if err != nil {
		return 0, err
	}
	maxCapacity += townhallStor
	return maxCapacity, nil
}

func CollectResource(id uuid.UUID, resourceType string) error {
	var err error
	tx, err := database.Db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var statQuery, updateQuery, storName, mineName string
	if resourceType == "gold" {
		statQuery = `SELECT gold, last_collected_gold FROM player_stats WHERE player_id = $1`
		updateQuery = `UPDATE player_stats SET gold = $1, last_collected_gold = $2 WHERE player_id = $3`
		storName = "GoldStor"
		mineName = "GoldMine"
	} else if resourceType == "elixir" {
		statQuery = `SELECT elixir, last_collected_elixir FROM player_stats WHERE player_id = $1`
		updateQuery = `UPDATE player_stats SET elixir = $1, last_collected_elixir = $2 WHERE player_id = $3`
		storName = "ElixirStor"
		mineName = "ElixirColl"
	} else {
		return ErrUnknownResource
	}
	var currentAmount int
	var lastCollected *time.Time
	err = tx.QueryRow(statQuery, id).Scan(&currentAmount, &lastCollected)
	if err != nil {
		return err
	}
	now := time.Now()
	if lastCollected == nil {
		lastCollected = &now
	}

	maxCapacity, _ := GetPlayerMaxStorageResource(id, storName, tx)

	query := `
	SELECT rg.gen_per_hour, rg.storage
	FROM resources_gen rg 
	JOIN player_buildings pb ON pb.building_id = rg.building_id
	JOIN building_catalog bc ON pb.building_id = bc.id
	WHERE pb.player_id = $1 AND bc.name = $2
	`
	rows, err := tx.Query(query, id, mineName)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var gph, stor int
		err = rows.Scan(&gph, &stor)
		if err != nil {
			log.Println("Error in fetching Data, ", err)
			return err
		}
		hoursPassed := time.Since(*lastCollected).Hours()
		resourcesGenerated := int(hoursPassed * float64(gph))
		currentAmount += min(resourcesGenerated, stor)
	}
	currentAmount = min(maxCapacity, currentAmount)
	result, err := tx.Exec(updateQuery, currentAmount, time.Now(), id)
	if err != nil {
		log.Println("Error collecting gold:", err)
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrPlayerNotFound
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}
