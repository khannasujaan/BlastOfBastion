package repository

import (
	"database/sql"
	"errors"
	"log"

	"github.com/google/uuid"
	"github.com/khannasujaan/BlastOfBastion/internal/database"
	"github.com/khannasujaan/BlastOfBastion/internal/dto"
)

var ErrMoreThanHousingSpace = errors.New("Exceeds maximum housing space")

func GetTroopLevelandName(troopId int, tx *sql.Tx) (int, string, error) {
	query := `SELECT level, name FROM troops_catalog WHERE id = $1`
	var level int
	var name string
	err := tx.QueryRow(query, troopId).Scan(&level, &name)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, "", errors.New("No such troop found")
		}
		return 0, "", err
	}
	return level, name, nil
}

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
	WHERE pb.player_id = $1 AND pb.building_id/10 = 303
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

func UpgradeTroop(id uuid.UUID, TroopReq dto.TroopUpgradeRequest) error {
	tx, err := database.Db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var unlockThallLevel, costElixir int
	query := `SELECT unlock_thall_level, cost_elixir FROM troops_catalog WHERE id = $1`
	err = tx.QueryRow(query, TroopReq.TroopId+1).Scan(&unlockThallLevel, &costElixir)
	if err != nil {
		return err
	}
	currentTownhall, err := GetPlayerTownHallLevel(id, tx)
	if err != nil {
		return err
	}

	if unlockThallLevel > currentTownhall {
		return ErrTownhallLevelLow
	}

	_, elixir, err := GetPlayerGoldandElixir(tx, id)
	if err != nil {
		return err
	}
	if elixir < costElixir {
		return ErrNotEnoughResouces
	}

	query = `UPDATE player_stats SET elixir = elixir - $1 WHERE player_id = $2`
	_, err = tx.Exec(query, costElixir, id)
	if err != nil {
		log.Println("Error deducting resources:", err)
		return err
	}

	// CHANGE THE LEVEL OF TROOP IN PLAYER_STATS

	// query = `UPDATE player_army SET `
	// result, err := tx.Exec(query)
	// if err != nil {
	// 	log.Println("Error upgrading building:", err)
	// 	return err
	// }
	// rowsAffected, err := result.RowsAffected()
	// if err != nil {
	// 	return err
	// }
	// if rowsAffected == 0 {
	// 	return ErrTroopNotFound
	// }

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}
