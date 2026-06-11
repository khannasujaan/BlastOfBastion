package repository

import (
	"database/sql"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/khannasujaan/BlastOfBastion/internal/database"
	"github.com/khannasujaan/BlastOfBastion/internal/dto"
	"github.com/khannasujaan/BlastOfBastion/internal/model"
	"golang.org/x/crypto/bcrypt"
)

func Registering(w http.ResponseWriter, newPlayer dto.Player) (uuid.UUID, error) {
	var err error
	var searchTableForUsername string
	err = database.Db.QueryRow("SELECT username FROM players WHERE username = $1", newPlayer.Username).Scan(&searchTableForUsername)
	if err == nil {
		http.Error(w, "Username was taken", http.StatusBadRequest)
		log.Println("Username was taken, Error:", err)
		return uuid.UUID{0}, err
	}
	if err != sql.ErrNoRows {
		http.Error(w, "Couldn't fetch data from database", http.StatusInternalServerError)
		log.Println("Couldn't fetch data from database, Error:", err)
		return uuid.UUID{0}, err
	}

	var savedId uuid.UUID
	err = database.Db.QueryRow("INSERT INTO players (username, password_hash) VALUES ($1, $2) RETURNING id", newPlayer.Username, newPlayer.Password).Scan(&savedId)
	if err != nil {
		http.Error(w, "Couldn't insert data in database", http.StatusInternalServerError)
		log.Println("Couldn't insert data in database, Error:", err)
		return uuid.UUID{0}, err
	}

	_, err = database.Db.Exec("INSERT INTO player_stats (player_id) VALUES ($1)", savedId)
	if err != nil {
		http.Error(w, "Couldn't insert data in database", http.StatusInternalServerError)
		log.Println("Couldn't insert data in database, Error:", err)
		return uuid.UUID{0}, err
	}

	queryClan := `
	INSERT INTO player_buildings (player_id, building_id, grid_x, grid_y, built_by, is_built) VALUES
	($1, 'e2884f17-8356-4e7a-bb95-42f5c22d5919', 15, 15, NULL, true),
	($1, 'bd85d5b5-f8cd-4396-aad7-0d8163103c36', 15, 18, NULL, true),
	($1, '512ef74f-2a4a-4ccc-93ef-e483634154c3', 15, 12, NULL, true),
	($1, '6de702e0-d5de-4224-939a-83e0c207e455', 12, 15, NULL, true),
	($1, '09135b20-9b85-4637-abb8-32fc1d486752', 18, 15, NULL, true);
	`

	_, err = database.Db.Exec(queryClan, savedId)
	if err != nil {
		http.Error(w, "Couldn't insert data in database", http.StatusInternalServerError)
		log.Println("Couldn't insert data in database, Error:", err)
		return uuid.UUID{0}, err
	}

	return savedId, nil
}

func Login(w http.ResponseWriter, newPlayer dto.Player) (string, error) {
	var err error
	var selectedPlayer model.Player
	err = database.Db.QueryRow("SELECT * FROM players WHERE username = $1", newPlayer.Username).Scan(
		&selectedPlayer.Id,
		&selectedPlayer.Username,
		&selectedPlayer.Password_hash,
		&selectedPlayer.Is_deleted,
	)
	if err == sql.ErrNoRows {
		http.Error(w, "Username not found", http.StatusNotFound)
		log.Println("Username not found, Error:", err)
		return "", err
	} else if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		log.Println("Database error, Error:", err)
		return "", err
	}

	err = bcrypt.CompareHashAndPassword([]byte(selectedPlayer.Password_hash), []byte(newPlayer.Password))
	if err != nil {
		http.Error(w, "Incorrect password", http.StatusUnauthorized)
		log.Println("Incorrect password, Error:", err)
		return "", err
	}
	log.Println(selectedPlayer.Password_hash, newPlayer.Password)

	claims := jwt.RegisteredClaims{
		ID:        selectedPlayer.Id.String(),
		Issuer:    selectedPlayer.Username,
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
	}
	JWTtokenUnsigned := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	JWTtokenSigned, err := JWTtokenUnsigned.SignedString([]byte(os.Getenv("JWT_KEY")))
	if err != nil {
		http.Error(w, "Couldn't sign JWT token", http.StatusInternalServerError)
		log.Println("Couldn't sign JWT token, Error:", err)
		return "", err
	}
	return JWTtokenSigned, nil
}
