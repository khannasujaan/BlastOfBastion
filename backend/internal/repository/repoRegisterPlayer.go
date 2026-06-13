package repository

import (
	"database/sql"
	"errors"
	"log"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/khannasujaan/BlastOfBastion/internal/database"
	"github.com/khannasujaan/BlastOfBastion/internal/dto"
	"github.com/khannasujaan/BlastOfBastion/internal/model"
	"golang.org/x/crypto/bcrypt"
)

type Signed interface {
	~int | ~int8 | ~int16 | ~int32 | ~int64
}

func Abs[T Signed](x T) T {
	if x < 0 {
		return -x
	}
	return x
}

var ErrUsernameWasTaken = errors.New("Username was taken")
var ErrUsernameNotFound = errors.New("Username not found")
var ErrIncorrectPassword = errors.New("Incorrect password")
var ErrJWTSigningError = errors.New("Couldn't sign JWT token")

func Registering(newPlayer dto.Player) (uuid.UUID, error) {
	var err error
	var searchTableForUsername string
	tx, err := database.Db.Begin()
	if err != nil {
		return uuid.Nil, err
	}
	defer tx.Rollback()
	err = tx.QueryRow("SELECT username FROM players WHERE username = $1", newPlayer.Username).Scan(&searchTableForUsername)
	if err == nil {
		log.Println("Username was taken, Error:", err)
		return uuid.Nil, ErrUsernameWasTaken
	}
	if err != sql.ErrNoRows {
		log.Println("Couldn't fetch data from database, Error:", err)
		return uuid.Nil, err
	}

	var savedId uuid.UUID
	err = tx.QueryRow("INSERT INTO players (username, password_hash) VALUES ($1, $2) RETURNING id", newPlayer.Username, newPlayer.Password).Scan(&savedId)
	if err != nil {
		log.Println("Couldn't insert data in database,", err)
		return uuid.Nil, err
	}

	_, err = tx.Exec("INSERT INTO player_stats (player_id) VALUES ($1)", savedId)
	if err != nil {
		log.Println("Couldn't insert data in database, Error:", err)
		return uuid.Nil, err
	}

	queryClan := `
	INSERT INTO player_buildings (player_id, building_id, grid_x, grid_y, built_by, is_built) VALUES
	($1, 3001, 15, 15, NULL, true),
	($1, 2011, 15, 18, NULL, true),
	($1, 2021, 15, 12, NULL, true);
	`

	_, err = tx.Exec(queryClan, savedId)
	if err != nil {
		log.Println("Couldn't insert data in database, Error:", err)
		return uuid.Nil, err
	}

	err = tx.Commit()
	if err != nil {
		return uuid.Nil, err
	}

	return savedId, nil
}

func Login(newPlayer dto.Player) (string, error) {
	var err error
	var selectedPlayer model.Player
	err = database.Db.QueryRow("SELECT * FROM players WHERE username = $1", newPlayer.Username).Scan(
		&selectedPlayer.Id,
		&selectedPlayer.Username,
		&selectedPlayer.Password_hash,
		&selectedPlayer.Is_deleted,
	)
	if err == sql.ErrNoRows {
		log.Println("Username not found, Error:", err)
		return "", ErrUsernameNotFound
	} else if err != nil {
		log.Println("Database error, Error:", err)
		return "", err
	}

	err = bcrypt.CompareHashAndPassword([]byte(selectedPlayer.Password_hash), []byte(newPlayer.Password))
	if err != nil {
		log.Println("Incorrect password, Error:", err)
		return "", ErrIncorrectPassword
	}
	log.Println(selectedPlayer.Password_hash, newPlayer.Password)

	claims := jwt.RegisteredClaims{
		Subject:   selectedPlayer.Id.String(),
		Issuer:    selectedPlayer.Username,
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
	}
	JWTtokenUnsigned := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	JWTtokenSigned, err := JWTtokenUnsigned.SignedString([]byte(os.Getenv("JWT_KEY")))
	if err != nil {
		log.Println("Couldn't sign JWT token, Error:", err)
		return "", ErrJWTSigningError
	}
	return JWTtokenSigned, nil
}
