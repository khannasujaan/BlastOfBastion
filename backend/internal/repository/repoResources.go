package repository

import (
	"database/sql"
	"errors"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/khannasujaan/BlastOfBastion/internal/database"
	"github.com/khannasujaan/BlastOfBastion/internal/dto"
)

var ErrPlayerNotFound = errors.New("Player not found")
var ErrUnknownResource = errors.New("Unknown resource")

func GetPlayerMaxStorageResource(id uuid.UUID, resource string, tx *sql.Tx) (int, error) {
	var idtemp int
	switch resource {
	case "gold":
		idtemp = 301
	case "elixir":
		idtemp = 302
	case "default":
		return 0, ErrUnknownResource
	}
	maxCapacity := 0
	storQuery := `
	SELECT rs.storage
	FROM resource_storage rs 
	JOIN player_buildings pb ON pb.building_id = rs.building_id
	WHERE player_id = $1 AND pb.building_id/10 = $2
	`
	rows, err := tx.Query(storQuery, id, idtemp)
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
	WHERE pb.player_id = $1 AND pb.building_id/10 = 300
	`
	var townhallStor int
	err = tx.QueryRow(storQuery, id).Scan(&townhallStor)
	if err != nil {
		return 0, err
	}
	maxCapacity += townhallStor
	return maxCapacity, nil
}

func CollectResource(id uuid.UUID, resourceType string) (dto.ResourceCollectedResponse, error) {
	var empty dto.ResourceCollectedResponse
	var err error
	tx, err := database.Db.Begin()
	if err != nil {
		return empty, err
	}
	defer tx.Rollback()
	var statQuery, updateQuery string
	var mineid int
	switch resourceType {
	case "gold":
		statQuery = `SELECT gold, last_collected_gold FROM player_stats WHERE player_id = $1`
		updateQuery = `UPDATE player_stats SET gold = $1, last_collected_gold = $2 WHERE player_id = $3`
		mineid = 202
	case "elixir":
		statQuery = `SELECT elixir, last_collected_elixir FROM player_stats WHERE player_id = $1`
		updateQuery = `UPDATE player_stats SET elixir = $1, last_collected_elixir = $2 WHERE player_id = $3`
		mineid = 201
	case "default":
		return empty, ErrUnknownResource
	}
	var currentAmount, initialAmount int
	var lastCollected *time.Time
	err = tx.QueryRow(statQuery, id).Scan(&currentAmount, &lastCollected)
	if err != nil {
		return empty, err
	}
	now := time.Now()
	if lastCollected == nil {
		lastCollected = &now
	}
	initialAmount = currentAmount
	maxCapacity, _ := GetPlayerMaxStorageResource(id, resourceType, tx)

	query := `
	SELECT rg.gen_per_hour, rg.storage
	FROM resources_gen rg 
	JOIN player_buildings pb ON pb.building_id = rg.building_id
	JOIN building_catalog bc ON pb.building_id = bc.id
	WHERE pb.player_id = $1 AND pb.building_id/10 = $2
	`
	rows, err := tx.Query(query, id, mineid)
	if err != nil {
		return empty, err
	}
	defer rows.Close()
	for rows.Next() {
		var gph, stor int
		err = rows.Scan(&gph, &stor)
		if err != nil {
			log.Println("Error in fetching Data, ", err)
			return empty, err
		}
		hoursPassed := time.Since(*lastCollected).Hours()
		resourcesGenerated := int(hoursPassed * float64(gph))
		currentAmount += min(resourcesGenerated, stor)
	}
	currentAmount = min(maxCapacity, currentAmount)
	result, err := tx.Exec(updateQuery, currentAmount, time.Now(), id)
	if err != nil {
		log.Println("Error collecting gold:", err)
		return empty, err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return empty, err
	}
	if rowsAffected == 0 {
		return empty, ErrPlayerNotFound
	}

	err = tx.Commit()
	if err != nil {
		return empty, err
	}
	empty.Change = currentAmount - initialAmount
	return empty, nil
}
