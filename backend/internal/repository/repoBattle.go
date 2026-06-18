package repository

import (
	"math/rand/v2"

	"github.com/google/uuid"
	"github.com/khannasujaan/BlastOfBastion/internal/database"
	"github.com/khannasujaan/BlastOfBastion/internal/dto"
)

func Matchmaking(id uuid.UUID) (dto.BattleId, error) {
	var empty dto.BattleId
	var err error

	tx, err := database.Db.Begin()
	if err != nil {
		return empty, err
	}

	var playerTrophies int
	query := `SELECT trophies FROM player_stats WHERE player_id = $1`
	err = tx.QueryRow(query, id).Scan(&playerTrophies)
	if err != nil {
		return empty, err
	}

	var opponents []uuid.UUID
	query = `
	    WITH closest_opponents AS (
            (
                SELECT p.id, ps.trophies
                FROM players p
                JOIN player_stats ps ON p.id = ps.player_id
                WHERE p.id != $1 AND ps.trophies >= $2 AND (ps.last_attacked_time < NOW() - INTERVAL '8 hours')
                ORDER BY ps.trophies ASC
                LIMIT 20
            )
            UNION ALL
            (
                SELECT p.id, ps.trophies
                FROM players p
                JOIN player_stats ps ON p.id = ps.player_id
                WHERE p.id != $1 AND ps.trophies < $2 AND (ps.last_attacked_time < NOW() - INTERVAL '8 hours')
                ORDER BY ps.trophies DESC
                LIMIT 20
            )
        )
        SELECT id
        FROM closest_opponents
        ORDER BY abs(trophies - $2)
        LIMIT 20;
	`
	rows, err := tx.Query(query, id, playerTrophies)
	if err != nil {
		return empty, err
	}
	defer rows.Close()
	for rows.Next() {
		var oppId uuid.UUID
		err = rows.Scan(&oppId)
		if err != nil {
			return empty, err
		}
		opponents = append(opponents, oppId)
	}

	randomIndex := rand.IntN(len(opponents))

	finalOpponent := opponents[randomIndex]

	var name string
	err = tx.QueryRow(`SELECT username FROM players WHERE id=$1`, finalOpponent).Scan(&name)
	if err != nil {
		return empty, err
	}

	var response dto.BattleId
	response.Opponent = finalOpponent
	response.Name = name
	return response, nil
}

func CollectDataBattle(id uuid.UUID, BattleReq dto.GetVillageRequest) (dto.BattleResponse, error) {
	var empty dto.BattleResponse
	tx, err := database.Db.Begin()
	if err != nil {
		return empty, err
	}
	var opponentBuildings []dto.VillageSync
	query := `
        SELECT pb.id, pb.building_id, pb.grid_x, pb.grid_y, bc.level, bc.name, pb.is_built , pb.built_by
        FROM player_buildings pb
        JOIN building_catalog bc ON pb.building_id = bc.id
        WHERE pb.player_id = $1
    `
	rows, err := tx.Query(query, BattleReq.Opponent)
	if err != nil {
		return empty, err
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
			return empty, err
		}

		opponentBuildings = append(opponentBuildings, newBuilding)
	}

	var playerTroops []dto.TroopsSync
	query = `
        SELECT pa.troop_id, pa.quantity, tc.name, tc.level 
        FROM player_army pa
        JOIN troops_catalog tc ON pa.troop_id = tc.id
        WHERE pa.player_id = $1
    `
	rows, err = tx.Query(query, id)
	if err != nil {
		return empty, err
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
			return empty, err
		}

		playerTroops = append(playerTroops, newTroop)
	}

	gold, elixir, err := GetPlayerGoldandElixir(tx, BattleReq.Opponent)
	if err != nil {
		return empty, err
	}

	var name string
	err = tx.QueryRow(`SELECT username FROM players WHERE id=$1`, BattleReq.Opponent).Scan(&name)
	if err != nil {
		return empty, err
	}

	response := dto.BattleResponse{
		Name:      name,
		Buildings: opponentBuildings,
		Elixir:    elixir,
		Gold:      gold,
		Opponent:  BattleReq.Opponent,
		Troops:    playerTroops,
	}
	return response, nil
}
