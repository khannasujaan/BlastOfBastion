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

var ErrNotEnoughResouces = errors.New("Not enough resources")
var ErrSpaceOccupied = errors.New("Space Occupied")
var ErrBuildingNotFound = errors.New("No such building found")
var ErrTownhallLevelLow = errors.New("A higher Town hall level is required for that")
var ErrBadRequest = errors.New("Bad request")

func GetPlayerTownHallLevel(playerID uuid.UUID, tx *sql.Tx) (int, error) {
	query := `
        SELECT bc.level 
        FROM player_buildings pb
        JOIN building_catalog bc ON pb.building_id = bc.id
        WHERE pb.player_id = $1 AND bc.name = 'TownHall'
    `

	var townHallLevel int
	err := tx.QueryRow(query, playerID).Scan(&townHallLevel)

	if err != nil {
		if err == sql.ErrNoRows {
			return 0, errors.New("town hall not found")
		}
		return 0, err
	}

	return townHallLevel, nil
}

func GetBuilidingLevelandName(buildingId uuid.UUID, tx *sql.Tx) (int, string, error) {
	query := `SELECT level, name FROM building_catalog WHERE id = $1`
	var level int
	var name string
	err := tx.QueryRow(query, buildingId).Scan(&level, &name)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, "", errors.New("No such building found")
		}
		return 0, "", err
	}
	return level, name, nil
}

func GetPlayerGoldandElixir(tx *sql.Tx, id uuid.UUID) (int, int, error) {
	var err error
	query := `SELECT gold, elixir FROM player_stats WHERE player_id = $1`
	var gold, elixir int
	err = tx.QueryRow(query, id).Scan(&gold, &elixir)
	if err != nil {
		log.Println("Error in fetching Data, ", err)
		return 0, 0, err
	}
	return gold, elixir, nil
}

func NewBuilding(id uuid.UUID, BuildReq dto.BuildNewRequest) error {
	var err error
	tx, err := database.Db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	query := `SELECT grid_x, grid_y FROM player_buildings WHERE player_id = $1`
	rows, err := tx.Query(query, id)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var x, y int
		err = rows.Scan(&x, &y)
		if err != nil {
			log.Println("Error in fetching Data, ", err)
			return err
		}
		if (Abs(BuildReq.GridX-x) < 2) && (Abs(BuildReq.GridY-y) < 2) {
			return ErrSpaceOccupied
		}
	}

	gold, elixir, err := GetPlayerGoldandElixir(tx, id)
	if err != nil {
		return err
	}
	query = `SELECT cost_gold, cost_elixir FROM building_catalog WHERE id = $1`
	var costGold, costElixir int
	buildingUuid, err := uuid.Parse(BuildReq.BuildingID)
	if err != nil {
		return err
	}
	err = tx.QueryRow(query, buildingUuid).Scan(&costGold, &costElixir)
	if err != nil {
		log.Println("Error in fetching Data, ", err)
		return err
	}

	if (gold < costGold) || (elixir < costElixir) {
		log.Println("Not enouhgt resources")
		return ErrNotEnoughResouces
	}

	playerTownhall, err := GetPlayerTownHallLevel(id, tx)
	if err != nil {
		log.Println("Error in fetching Data, ", err)
		return err
	}

	query = `SELECT unlock_thall_level FROM building_catalog WHERE id = $1`
	var unlockThallLevel int
	err = tx.QueryRow(query, buildingUuid).Scan(&unlockThallLevel)
	if err != nil {
		log.Println("Error in fetching Data, ", err)
		return err
	}

	if unlockThallLevel > playerTownhall {
		log.Println("Town hall level low")
		return ErrTownhallLevelLow
	}

	var buildingCount int
	query = `SELECT COUNT(*) FROM player_buildings WHERE player_id = $1 AND building_id = $2`
	err = tx.QueryRow(query, id, buildingUuid).Scan(&buildingCount)
	if err != nil {
		log.Println("Error in fetching Data, ", err)
		return err
	}

	// CHECK THE AMOUNT OF BUILDINGS

	query = `UPDATE player_stats SET gold = gold - $1, elixir = elixir - $2 WHERE player_id = $3`
	_, err = tx.Exec(query, costGold, costElixir, id)
	if err != nil {
		log.Println("Error deducting resources:", err)
		return err
	}

	query = `INSERT INTO player_buildings (player_id, building_id, grid_x, grid_y) VALUES ($1, $2, $3, $4)`
	_, err = tx.Exec(query, id, buildingUuid, BuildReq.GridX, BuildReq.GridY)
	if err != nil {
		log.Println("Error inserting building:", err)
		return err
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}

func MoveBuilding(id uuid.UUID, BuildReq dto.BuildMoveRequest) error {
	var err error
	tx, err := database.Db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `SELECT grid_x, grid_y FROM player_buildings WHERE player_id = $1`
	rows, err := tx.Query(query, id)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var x, y int
		err = rows.Scan(&x, &y)
		if err != nil {
			log.Println("Error in fetching Data, ", err)
			return err
		}
		if !((BuildReq.IGridX == x) && (BuildReq.IGridY == y)) && (Abs(BuildReq.GridX-x) < 2) && (Abs(BuildReq.GridY-y) < 2) {
			return ErrSpaceOccupied
		}
	}

	query = `UPDATE player_buildings SET grid_x = $1, grid_y = $2 WHERE grid_x = $3 AND grid_y = $4 AND player_id = $5`
	result, err := tx.Exec(query, BuildReq.GridX, BuildReq.GridY, BuildReq.IGridX, BuildReq.IGridY, id)
	if err != nil {
		log.Println("Error moving building:", err)
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrBuildingNotFound
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}

func UpgradeBuilding(id uuid.UUID, BuildReq dto.BuildUpgradeStartRequest) error {
	var err error
	tx, err := database.Db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	buildingIDuuid, err := uuid.Parse(BuildReq.BuildingID)
	if err != nil {
		return err
	}

	level, name, err := GetBuilidingLevelandName(buildingIDuuid, tx)
	if err != nil {
		return err
	}

	query := `SELECT id FROM player_buildings WHERE player_id = $1 AND grid_x = $2 AND grid_y = $3`
	var instanceId int
	err = tx.QueryRow(query, id, BuildReq.GridX, BuildReq.GridY).Scan(&instanceId)
	if err != nil {
		log.Println("Error in fetching Data, ", err)
		return err
	}

	query = `SELECT id, unlock_thall_level, cost_gold, cost_elixir, build_time FROM building_catalog WHERE name = $1 AND level = $2`
	var newuuid uuid.UUID
	var tHallNeedLevel, costGold, costElixir, buildTime int
	err = tx.QueryRow(query, name, level+1).Scan(&newuuid, &tHallNeedLevel, &costGold, &costElixir, &buildTime)
	if err != nil {
		log.Println("Can't upgrade", err)
		return ErrTownhallLevelLow
	}
	currentThallLevel, err := GetPlayerTownHallLevel(id, tx)
	if err != nil {
		log.Println("couldn't fetch town hall")
		return err
	}
	if tHallNeedLevel > currentThallLevel {
		log.Println("Can't upgrade", err)
		return ErrTownhallLevelLow
	}

	gold, elixir, err := GetPlayerGoldandElixir(tx, id)
	if err != nil {
		return err
	}

	if (gold < costGold) || (elixir < costElixir) {
		return ErrNotEnoughResouces
	}

	// Verification done
	query = `UPDATE player_stats SET gold = gold - $1, elixir = elixir - $2 WHERE player_id = $3`
	_, err = tx.Exec(query, costGold, costElixir, id)
	if err != nil {
		log.Println("Error deducting resources:", err)
		return err
	}

	now := time.Now()
	query = `UPDATE player_buildings SET building_id = $1, built_by = $2, is_built = false WHERE id = $3`
	result, err := tx.Exec(query, newuuid, now.Add(time.Second*time.Duration(buildTime)), instanceId)
	if err != nil {
		log.Println("Error upgrading building:", err)
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrBuildingNotFound
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}

func UpgradeBuildingFinish(id uuid.UUID, BuildReq dto.BuildUpgradeFinishRequest) error {
	var err error
	tx, err := database.Db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var builtBy time.Time
	query := `SELECT built_by FROM player_buildings WHERE grid_x = $1 AND grid_y = $2`
	err = tx.QueryRow(query, BuildReq.GridX, BuildReq.GridY).Scan(&builtBy)
	if err != nil {
		return err
	}

	if builtBy.Compare(time.Now()) > 0 {
		return ErrBadRequest
	}

	query = `UPDATE player_buildings SET built_by = NULL, is_built = true WHERE player_id = $1 AND grid_x = $2 AND grid_y = $3`
	result, err := tx.Exec(query, id, BuildReq.GridX, BuildReq.GridY)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrBuildingNotFound
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}
