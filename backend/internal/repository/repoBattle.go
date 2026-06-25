package repository

import (
	"log"
	"math/rand/v2"
	"time"

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
	defer tx.Rollback()

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

	if err = tx.Commit(); err != nil {
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
	defer tx.Rollback()
	var opponentBuildings []dto.VillageBattle
	query := `
        SELECT pb.id, pb.building_id, pb.grid_x, pb.grid_y, bc.level, bc.name, pb.is_built , pb.built_by, bc.base_health
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
		var newBuilding dto.VillageBattle

		err = rows.Scan(
			&newBuilding.Id,
			&newBuilding.BuildingID,
			&newBuilding.GridX,
			&newBuilding.GridY,
			&newBuilding.Level,
			&newBuilding.Name,
			&newBuilding.IsBuilt,
			&newBuilding.FinishTime,
			&newBuilding.HP,
		)
		if err != nil {
			return empty, err
		}

		opponentBuildings = append(opponentBuildings, newBuilding)
	}

	var playerTroops []dto.TroopBattle
	query = `
        SELECT pa.troop_id, pa.quantity, tc.name, tc.level, tc.speed, tc.damage, tc.range, tc.health
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
		var newTroop dto.TroopBattle

		err = rows.Scan(
			&newTroop.TroopId,
			&newTroop.Quantity,
			&newTroop.Name,
			&newTroop.Level,
			&newTroop.Speed,
			&newTroop.Damage,
			&newTroop.Range,
			&newTroop.HP,
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

	query = `UPDATE player_stats SET last_attacked_time = $1 WHERE player_id = $2`
	_, err = tx.Exec(query, time.Now(), BattleReq.Opponent)
	if err != nil {
		return empty, err
	}

	if err = tx.Commit(); err != nil {
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

func CollectDataDefence(id uuid.UUID, BattleReq dto.GetVillageRequest) (dto.DefenceResponse, error) {
	var empty dto.DefenceResponse
	tx, err := database.Db.Begin()
	if err != nil {
		return empty, err
	}
	defer tx.Rollback()
	var opponentBuildings []dto.Defences
	query := `
        SELECT pb.id, pb.building_id, pb.grid_x, pb.grid_y, bc.level, bc.name, pb.is_built , pb.built_by, bc.base_health, db.range, db.damage_per_attack, db.attack_speed_ms
        FROM player_buildings pb
        JOIN building_catalog bc ON pb.building_id = bc.id
		JOIN defense_buildings db ON db.building_id = bc.id
        WHERE pb.player_id = $1
    `
	rows, err := tx.Query(query, BattleReq.Opponent)
	if err != nil {
		return empty, err
	}
	defer rows.Close()
	for rows.Next() {
		var newBuilding dto.Defences

		err = rows.Scan(
			&newBuilding.Id,
			&newBuilding.BuildingID,
			&newBuilding.GridX,
			&newBuilding.GridY,
			&newBuilding.Level,
			&newBuilding.Name,
			&newBuilding.IsBuilt,
			&newBuilding.FinishTime,
			&newBuilding.HP,
			&newBuilding.Range,
			&newBuilding.Damage,
			&newBuilding.AttackSpeed,
		)
		if err != nil {
			return empty, err
		}

		opponentBuildings = append(opponentBuildings, newBuilding)
	}
	response := dto.DefenceResponse{
		Defences: opponentBuildings,
	}

	if err = tx.Commit(); err != nil {
		return empty, err
	}

	return response, nil
}

func Conclusion(attacker, defender, winner uuid.UUID, percentage, gold, elixir int) error {
	tx, err := database.Db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `UPDATE player_stats SET gold = GREATEST(gold - $1, 0), elixir = GREATEST(elixir - $2, 0) WHERE player_id = $3`
	_, err = tx.Exec(query, gold, elixir, defender)
	if err != nil {
		log.Println("Error deducting resources from defender:", err)
		return err
	}

	maxGold, err := GetPlayerMaxStorageResource(attacker, "gold", tx)
	if err != nil {
		return err
	}
	maxElixir, err := GetPlayerMaxStorageResource(attacker, "elixir", tx)
	if err != nil {
		return err
	}
	query = `
	UPDATE player_stats 
	SET gold = LEAST(gold + $1, $4), elixir = LEAST(elixir + $2, $5) 
	WHERE player_id = $3
	`
	_, err = tx.Exec(query, gold, elixir, attacker, maxGold, maxElixir)
	if err != nil {
		log.Println("Error adding resources to attacker:", err)
		return err
	}
	var loser uuid.UUID
	if winner == attacker {
		loser = defender
	} else {
		loser = attacker
	}

	query = `UPDATE player_stats SET trophies = GREATEST(trophies - 5, 0) WHERE player_id = $1`
	_, err = tx.Exec(query, loser)
	if err != nil {
		log.Println("Error Adding resources:", err)
		return err
	}
	query = `UPDATE player_stats SET trophies = trophies + 20 WHERE player_id = $1`
	_, err = tx.Exec(query, winner)
	if err != nil {
		log.Println("Error Adding resources:", err)
		return err
	}

	query = `
	INSERT INTO battles (attacker_id, defender_id, winner_id, percentage_damage, gold_gained, elixir_gained, battle_time) VALUES
		($1, $2, $3, $4, $5, $6, $7);
	`
	_, err = tx.Exec(query, attacker, defender, winner, percentage, gold, elixir, time.Now())
	if err != nil {
		log.Println("Error Adding resources:", err)
		return err
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}
