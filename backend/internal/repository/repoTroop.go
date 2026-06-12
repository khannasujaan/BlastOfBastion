package repository

import (
	"errors"

	"github.com/google/uuid"
	"github.com/khannasujaan/BlastOfBastion/internal/database"
	"github.com/khannasujaan/BlastOfBastion/internal/dto"
)

var ErrMoreThanHousingSpace = errors.New("Exceeds maximum housing space")

func TrainTroop(id uuid.UUID, TroopReq dto.TroopTrainRequest) error {
	tx, err := database.Db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var totalHousingSpace int
	query := `
	SELECT rs.storage
	FROM resource_storage rs 
	JOIN player_buildings pb ON pb.building_id = rs.building_id
	JOIN building_catalog bc ON pb.building_id = bc.id
	WHERE pb.player_id = $1 AND bc.name = 'ArmyCamp'
	`
	rows, err := tx.Query(query, id)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var storage int
		err = rows.Scan(&storage)
		if err != nil {
			return err
		}
		totalHousingSpace += storage
	}
	townhallLevelOfPlayer, err := GetPlayerTownHallLevel(id, tx)
	if err != nil {
		return err
	}

	var housingSpaceReq int
	for _, troop := range TroopReq.Troops {
		currentTroopID := troop.TroopId
		currentQuantity := troop.Quantity
		var currentHousingSpace, unlockThallLevel int
		query := `SELECT housing_space, unlock_thall_level FROM troops_catalog WHERE id = $1`
		err = tx.QueryRow(query, currentTroopID).Scan(&currentHousingSpace, &unlockThallLevel)
		if err != nil {
			return err
		}
		housingSpaceReq += (currentQuantity) * (currentHousingSpace)
		if unlockThallLevel > townhallLevelOfPlayer {
			return ErrTownhallLevelLow
		}
	}
	if housingSpaceReq > totalHousingSpace {
		return ErrMoreThanHousingSpace
	}

	_, err = tx.Exec(`DELETE FROM player_army WHERE player_id = $1`, id)
	if err != nil {
		return err
	}
	insertQuery := `INSERT INTO player_army (player_id, troop_id, quantity) VALUES ($1, $2, $3)`
	for _, troop := range TroopReq.Troops {
		if troop.Quantity > 0 {
			_, err = tx.Exec(insertQuery, id, troop.TroopId, troop.Quantity)
			if err != nil {
				return err
			}
		}
	}
	return tx.Commit()
}
