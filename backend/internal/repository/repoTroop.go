package repository

import (
	"database/sql"
	"errors"
	"log"
	"strings"

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

	log.Println(TroopReq.Troops)
	var totalHousingSpace int
	query := `
	SELECT rs.storage
	FROM resource_storage rs 
	JOIN player_buildings pb ON pb.building_id = rs.building_id
	WHERE pb.player_id = $1 AND pb.building_id BETWEEN 3031 AND 3032
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

		if troop.Quantity <= 0 {
			continue
		}

		currentTroopName := troop.TroopName
		currentQuantity := troop.Quantity

		query := `SELECT troop_id FROM troops_unlocked WHERE player_id = $1 AND troop_name = $2`
		var troopid int
		err = tx.QueryRow(query, id, currentTroopName).Scan(&troopid)
		if err != nil {
			return err
		}

		var currentHousingSpace, unlockThallLevel int
		query = `SELECT housing_space, unlock_thall_level FROM troops_catalog WHERE id = $1`
		err = tx.QueryRow(query, troopid).Scan(&currentHousingSpace, &unlockThallLevel)
		if err != nil {
			return err
		}
		housingSpaceReq += (currentQuantity) * (currentHousingSpace)
		if unlockThallLevel > townhallLevelOfPlayer {
			return ErrTownhallLevelLow
		}
	}
	if housingSpaceReq > totalHousingSpace {
		log.Println(housingSpaceReq, totalHousingSpace)
		return ErrMoreThanHousingSpace
	}

	_, err = tx.Exec(`DELETE FROM player_army WHERE player_id = $1`, id)
	if err != nil {
		return err
	}
	insertQuery := `INSERT INTO player_army (player_id, troop_id, quantity) VALUES ($1, $2, $3)`
	for _, troop := range TroopReq.Troops {
		if troop.Quantity > 0 {
			query := `SELECT troop_id FROM troops_unlocked WHERE player_id = $1 AND troop_name = $2`
			var troopid int
			err = tx.QueryRow(query, id, troop.TroopName).Scan(&troopid)
			if err != nil {
				return err
			}

			_, err = tx.Exec(insertQuery, id, troopid, troop.Quantity)
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

	var troopId int
	query := `SELECT troop_id FROM troops_unlocked WHERE player_id = $1 AND troop_name = $2`
	err = tx.QueryRow(query, id, TroopReq.TroopName).Scan(&troopId)
	if err != nil {
		return err
	}

	var unlockThallLevel, costElixir int
	query = `SELECT unlock_thall_level, cost_elixir FROM troops_catalog WHERE id = $1`
	err = tx.QueryRow(query, troopId+1).Scan(&unlockThallLevel, &costElixir)
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

	query = `UPDATE troops_unlocked SET troop_id = $1 WHERE player_id = $2 AND troop_name = $3`
	_, err = tx.Exec(query, troopId+1, id, TroopReq.TroopName)
	if err != nil {
		return err
	}

	query = `UPDATE player_army SET troop_id = $1 WHERE player_id = $2 AND troop_id = $3`
	_, err = tx.Exec(query, troopId+1, id, troopId)
	if err != nil {
		return err
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}

func GetInfoTroop(id uuid.UUID) (map[string]int, error) {
	troopMap := make(map[string]int)
	var err error
	tx, err := database.Db.Begin()
	if err != nil {
		return troopMap, err
	}
	defer tx.Rollback()

	query := `SELECT troop_name, troop_id FROM troops_unlocked WHERE player_id = $1`
	rows, err := tx.Query(query, id)
	if err != nil {
		return troopMap, err
	}
	defer rows.Close()
	for rows.Next() {
		var name string
		var troopid int
		err = rows.Scan(&name, &troopid)
		if err != nil {
			return troopMap, err
		}
		troopMap[strings.ToLower(name)] = troopid
	}
	err = tx.Commit()
	if err != nil {
		return nil, err
	}

	return troopMap, nil
}

func GetTroopData(id uuid.UUID, TroopReq dto.TroopDataRequest) (dto.TroopDataResponse, error) {
	var empty dto.TroopDataResponse
	var err error
	tx, err := database.Db.Begin()
	if err != nil {
		return empty, err
	}
	defer tx.Rollback()

	var response dto.TroopDataResponse
	query := `SELECT id, name, housing_space, level, unlock_thall_level, cost_elixir FROM troops_catalog WHERE id = $1`
	err = tx.QueryRow(query, id).Scan(&response.TroopId, &response.Name, &response.HSpace, &response.Level, &response.ThallLevel, &response.Cost)
	if err != nil {
		return empty, err
	}

	return response, nil
}
