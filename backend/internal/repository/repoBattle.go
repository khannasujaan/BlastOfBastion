package repository

import (
	"github.com/google/uuid"
	"github.com/khannasujaan/BlastOfBastion/internal/database"
	"github.com/khannasujaan/BlastOfBastion/internal/dto"
)

func Matchmaking(id uuid.UUID) (dto.BattleResponse, error) {
	var empty dto.BattleResponse
	var err error

	var playerTrophies int
	query := `SELECT trophies FROM player_stats WHERE player_id = $1`
	err = database.Db.QueryRow(query, id).Scan(&playerTrophies)
	if err != nil {
		return empty, err
	}

	var opponents dto.BattleResponse
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
	rows, err := database.Db.Query(query, id, playerTrophies)
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
		opponents.Opponents = append(opponents.Opponents, oppId)
	}
	opponents.Amount = len(opponents.Opponents)

	return opponents, nil
}
