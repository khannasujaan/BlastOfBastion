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
var ErrMaxCountOfBuilding = errors.New("No more of this building at this townhall level")

func GetPlayerTownHallLevel(playerID uuid.UUID, tx *sql.Tx) (int, error) {
	query := `
        SELECT bc.level 
        FROM player_buildings pb
        JOIN building_catalog bc ON pb.building_id = bc.id
        WHERE pb.player_id = $1 AND bc.id/10 = 300
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

func GetBuilidingLevelandName(buildingId int, tx *sql.Tx) (int, string, error) {
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
		if (Abs(BuildReq.GridX-x) < 3) && (Abs(BuildReq.GridY-y) < 3) && (BuildReq.GridX >= 1) && (BuildReq.GridY >= 1) && (BuildReq.GridX <= 29) && (BuildReq.GridY <= 29) {
			return ErrSpaceOccupied
		}
	}

	gold, elixir, err := GetPlayerGoldandElixir(tx, id)
	if err != nil {
		return err
	}
	var name string
	query = `SELECT cost_gold, cost_elixir, name FROM building_catalog WHERE id = $1`
	var costGold, costElixir int
	buildingUuid := BuildReq.BuildingID

	err = tx.QueryRow(query, buildingUuid).Scan(&costGold, &costElixir, &name)
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

	query = `SELECT unlock_thall_level, build_time FROM building_catalog WHERE id = $1`
	var unlockThallLevel, buildTime int
	err = tx.QueryRow(query, buildingUuid).Scan(&unlockThallLevel, &buildTime)
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

	var maxBuildingCount int
	query = `SELECT quantity FROM max_buildings WHERE name = $1 AND thall_level=$2`
	err = tx.QueryRow(query, name, playerTownhall).Scan(&maxBuildingCount)
	if err != nil {
		log.Println("Error in fetching Data, ", err)
		return err
	}

	if buildingCount >= maxBuildingCount {
		log.Println("No more of this building at this townhall level")
		return ErrMaxCountOfBuilding
	}

	query = `UPDATE player_stats SET gold = gold - $1, elixir = elixir - $2 WHERE player_id = $3`
	_, err = tx.Exec(query, costGold, costElixir, id)
	if err != nil {
		log.Println("Error deducting resources:", err)
		return err
	}

	query = `INSERT INTO player_buildings (player_id, building_id, grid_x, grid_y, built_by) VALUES ($1, $2, $3, $4, $5)`
	_, err = tx.Exec(query, id, buildingUuid, BuildReq.GridX, BuildReq.GridY, time.Now().Add(time.Second*time.Duration(buildTime)))
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
		if !((BuildReq.IGridX == x) && (BuildReq.IGridY == y)) && (Abs(BuildReq.GridX-x) < 3) && (Abs(BuildReq.GridY-y) < 3) && (BuildReq.GridX >= 1) && (BuildReq.GridY >= 1) && (BuildReq.GridX <= 29) && (BuildReq.GridY <= 29) {
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
	log.Println(BuildReq.BuildingID, BuildReq.GridX, BuildReq.GridY)
	query := `SELECT id FROM player_buildings WHERE player_id = $1 AND grid_x = $2 AND grid_y = $3`
	var instanceId int
	err = tx.QueryRow(query, id, BuildReq.GridX, BuildReq.GridY).Scan(&instanceId)
	if err != nil {
		log.Println("Error in fetching Data, ", err)
		return err
	}

	query = `SELECT id, unlock_thall_level, cost_gold, cost_elixir, build_time FROM building_catalog WHERE id = $1`
	var newuuid, tHallNeedLevel, costGold, costElixir, buildTime int
	err = tx.QueryRow(query, BuildReq.BuildingID+1).Scan(&newuuid, &tHallNeedLevel, &costGold, &costElixir, &buildTime)
	if err != nil {
		log.Println("Can't upgrade", err)
		return err
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

	if (BuildReq.BuildingID/10 == 300) && (currentThallLevel == 1) {
		query = `UPDATE troops_unlocked SET troop_id = 301 WHERE player_id = $1 AND troop_name = 'Goblin'`
		_, err = tx.Exec(query, id)
		if err != nil {
			log.Println("Updating Troop level", err)
			return err
		}
		query = `UPDATE troops_unlocked SET troop_id = 401 WHERE player_id = $1 AND troop_name = 'Giant'`
		_, err = tx.Exec(query, id)
		if err != nil {
			log.Println("Updating Troop level", err)
			return err
		}
	}
	if (BuildReq.BuildingID/10 == 300) && (currentThallLevel == 3) {
		query = `UPDATE troops_unlocked SET troop_id = 501 WHERE player_id = $1 AND troop_name = 'Wizard'`
		_, err = tx.Exec(query, id)
		if err != nil {
			log.Println("Updating Troop level", err)
			return err
		}
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
	query := `SELECT built_by FROM player_buildings WHERE grid_x = $1 AND grid_y = $2 AND player_id = $3`
	err = tx.QueryRow(query, BuildReq.GridX, BuildReq.GridY, id).Scan(&builtBy)
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

func GetUpgradeStats(id int) (dto.UpgradeStatsResponse, error) {
	var res dto.UpgradeStatsResponse

	query := `
        SELECT c1.level, c2.level, c1.base_health, c2.base_health, c2.cost_gold, c2.cost_elixir, c2.build_time
        FROM building_catalog c1
        JOIN building_catalog c2 ON c2.id = c1.id + 1
        WHERE c1.id = $1`

	err := database.Db.QueryRow(query, id).Scan(
		&res.CurrentLevel, &res.NextLevel, &res.CurrentHealth, &res.NextHealth,
		&res.CostGold, &res.CostElixir, &res.Time,
	)
	if err != nil {
		return res, err
	}

	category := id / 1000
	switch category {
	case 1:
		query := `SELECT d1.range, d2.range, d1.damage_per_attack, d2.damage_per_attack
                  FROM defense_buildings d1
                  JOIN defense_buildings d2 ON d2.building_id = d1.building_id + 1
                  WHERE d1.building_id = $1`
		var ds dto.DefenseStats
		err = database.Db.QueryRow(query, id).Scan(&ds.CurrentRange, &ds.NextRange, &ds.CurrentDmg, &ds.NextDmg)
		res.DefenseStats = &ds

	case 2:
		query := `SELECT g1.gen_per_hour, g2.gen_per_hour
				  FROM resources_gen g1
				  JOIN resources_gen g2 ON g2.building_id = g1.building_id + 1
				  WHERE g1.building_id = $1`
		var ps dto.ProductionStats
		err = database.Db.QueryRow(query, id).Scan(&ps.CurrentGen, &ps.NextGen)
		res.ProductionStats = &ps

	case 3:
		query := `SELECT s1.storage, s2.storage
                  FROM resource_storage s1
                  JOIN resource_storage s2 ON s2.building_id = s1.building_id + 1
                  WHERE s1.building_id = $1`
		var ss dto.StorageStats
		err = database.Db.QueryRow(query, id).Scan(&ss.CurrentCapacity, &ss.NextCapacity)
		res.StorageStats = &ss
	}

	return res, err
}
