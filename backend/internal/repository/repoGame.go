package repository

import (
	"github.com/google/uuid"
	"github.com/khannasujaan/BlastOfBastion/internal/database"
	"github.com/khannasujaan/BlastOfBastion/internal/dto"
)

func GetGameData(id uuid.UUID) (*dto.GameDataSyncResponse, error) {
	var err error
	tx, err := database.Db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var playerStats dto.StatsSync
	var playerBuildings []dto.VillageSync
	var playerTroops []dto.TroopsSync

	query := `SELECT gold, elixir, trophies FROM player_stats WHERE player_id = $1`
	err = tx.QueryRow(query, id).Scan(&playerStats.Gold, &playerStats.Elixir, &playerStats.Trophies)
	if err != nil {
		return nil, err
	}
	playerStats.MaxGold, err = GetPlayerMaxStorageResource(id, "GoldMine", tx)
	if err != nil {
		return nil, err
	}
	playerStats.MaxElixir, err = GetPlayerMaxStorageResource(id, "ElixirColl", tx)
	if err != nil {
		return nil, err
	}

	query = `
        SELECT pb.id, pb.building_id, pb.grid_x, pb.grid_y, bc.level, bc.name, pb.is_built 
        FROM player_buildings pb
        JOIN building_catalog bc ON pb.building_id = bc.id
        WHERE pb.player_id = $1
    `
	rows, err := tx.Query(query, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var newBuilding dto.VillageSync

		err = rows.Scan(
			&newBuilding.Id,
			&newBuilding.BuildingID,
			&newBuilding.GridX,
			&newBuilding.GridY,
			&newBuilding.Level,
			&newBuilding.Name,
			&newBuilding.IsBuilt,
		)
		if err != nil {
			return nil, err
		}

		playerBuildings = append(playerBuildings, newBuilding)
	}

	query = `
        SELECT pa.troop_id, pa.quantity, tc.name, tc.level 
        FROM player_army pa
        JOIN troops_catalog tc ON pa.troop_id = tc.id
        WHERE pa.player_id = $1
    `
	rows, err = tx.Query(query, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var newTroop dto.TroopsSync

		err = rows.Scan(
			&newTroop.TroopId,
			&newTroop.Quantity,
			&newTroop.Name,
			&newTroop.Level,
		)
		if err != nil {
			return nil, err
		}

		playerTroops = append(playerTroops, newTroop)
	}

	response := dto.GameDataSyncResponse{
		Stats:     playerStats,
		Buildings: playerBuildings,
		Troops:    playerTroops,
	}

	return &response, nil

}
