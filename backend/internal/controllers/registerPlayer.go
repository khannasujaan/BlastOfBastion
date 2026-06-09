package controller

import (
	"database/sql"
	"encoding/json"
	"io"
	"log"
	"net/http"

	"github.com/gofrs/uuid"
	"github.com/khannasujaan/BlastOfBastion/internal/database"
	model "github.com/khannasujaan/BlastOfBastion/internal/models"
	"golang.org/x/crypto/bcrypt"
)

func HandleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method == "POST" {
		var err error
		v, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Could't read body of request while registering", http.StatusUnauthorized)
			log.Println("Could't read body of request while registering")
			return
		}

		var newPlayer model.Player
		err = json.Unmarshal(v, &newPlayer)
		if err != nil {
			http.Error(w, "Couldn't unmarshal the json received", http.StatusBadRequest)
			log.Println("Couldn't unmarshal the json received")
			return
		}

		password := []byte(newPlayer.Password_hash)
		password_hash, err := bcrypt.GenerateFromPassword(password, 10)
		if err != nil {
			http.Error(w, "Could't hash password", http.StatusInternalServerError)
			log.Println("Could't hash password")
			return
		}

		newPlayer.Password_hash = string(password_hash)
		// fmt.Println(newPlayer.Id, newPlayer.Username, newPlayer.Password_hash, newPlayer.Is_deleted)

		var searchTableForUsername string
		err = database.Db.QueryRow("SELECT username FROM players WHERE username = $1", newPlayer.Username).Scan(&searchTableForUsername)
		if err == nil {
			http.Error(w, "Username was taken", http.StatusBadRequest)
			log.Println("Username was taken")
			return
		}
		if err != sql.ErrNoRows {
			http.Error(w, "Couldn't fetch data from database", http.StatusInternalServerError)
			log.Println("Couldn't fetch data from database")
			return
		}

		var savedId uuid.UUID
		err = database.Db.QueryRow("INSERT INTO players (username, password_hash) VALUES ($1, $2) RETURNING id", newPlayer.Username, newPlayer.Password_hash).Scan(&savedId)
		if err != nil {
			http.Error(w, "Couldn't insert data in database", http.StatusInternalServerError)
			log.Println("Couldn't insert data in database")
			return
		}

		w.WriteHeader(http.StatusCreated)
		log.Println("Successfull Query... Stored data as id", savedId)

	} else {
		http.Error(w, "This method is not allowed", http.StatusMethodNotAllowed)
	}
}
