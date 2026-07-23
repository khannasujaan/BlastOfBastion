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
	playerStats.MaxGold, err = GetPlayerMaxStorageResource(id, "gold", tx)
	if err != nil {
		return nil, err
	}
	playerStats.MaxElixir, err = GetPlayerMaxStorageResource(id, "elixir", tx)
	if err != nil {
		return nil, err
	}

	query = `
        SELECT pb.id, pb.building_id, pb.grid_x, pb.grid_y, bc.level, bc.name, pb.is_built , pb.built_by
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
			&newBuilding.FinishTime,
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

func GetGameCatalog() (dto.CatalogResponse, error) {
	var response dto.CatalogResponse
	response.MaxBuildings = make(map[string]map[int]int)

	tx, err := database.Db.Begin()
	if err != nil {
		return response, err
	}
	defer tx.Rollback()

	bRows, err := tx.Query(`SELECT id, name, level, cost_gold, cost_elixir, unlock_thall_level, build_time FROM building_catalog`)
	if err != nil {
		return response, err
	}
	defer bRows.Close()
	for bRows.Next() {
		var b dto.CatalogBuilding
		bRows.Scan(&b.ID, &b.Name, &b.Level, &b.CostGold, &b.CostElixir, &b.Thelev, &b.BuildTime)
		response.Buildings = append(response.Buildings, b)
	}

	tRows, err := tx.Query(`SELECT id, name, damage, health, housing_space, level, speed, unlock_thall_level, range, cost_elixir FROM troops_catalog`)
	if err != nil {
		return response, err
	}
	defer tRows.Close()
	for tRows.Next() {
		var t dto.CatalogTroop
		tRows.Scan(&t.ID, &t.Name, &t.Damage, &t.Health, &t.HousingSpace, &t.Level, &t.Speed, &t.UnlockThallLevel, &t.Range, &t.CostElixir)
		response.Troops = append(response.Troops, t)
	}

	mRows, err := tx.Query(`SELECT name, thall_level, quantity FROM max_buildings`)
	if err != nil {
		return response, err
	}
	defer mRows.Close()
	for mRows.Next() {
		var name string
		var thall, qty int
		mRows.Scan(&name, &thall, &qty)

		if _, exists := response.MaxBuildings[name]; !exists {
			response.MaxBuildings[name] = make(map[int]int)
		}
		response.MaxBuildings[name][thall] = qty
	}

	tx.Commit()
	return response, nil
}
