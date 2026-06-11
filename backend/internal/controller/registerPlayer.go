package controller

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/google/uuid"
	"github.com/khannasujaan/BlastOfBastion/internal/database"
	"github.com/khannasujaan/BlastOfBastion/internal/dto"
	"github.com/khannasujaan/BlastOfBastion/internal/model"
	"github.com/khannasujaan/BlastOfBastion/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

func HandleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "This method is not allowed", http.StatusMethodNotAllowed)
		return
	}

	var err error
	var newPlayer dto.Player
	if err := json.NewDecoder(r.Body).Decode(&newPlayer); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	password := []byte(newPlayer.Password)
	password_hash, err := bcrypt.GenerateFromPassword(password, 10)
	if err != nil {
		http.Error(w, "Could't hash password", http.StatusInternalServerError)
		log.Println("Could't hash password, Error:", err)
		return
	}

	newPlayer.Password = string(password_hash)
	// fmt.Println(newPlayer.Id, newPlayer.Username, newPlayer.Password_hash, newPlayer.Is_deleted)
	savedID, err := repository.Registering(w, newPlayer)

	w.WriteHeader(http.StatusCreated)
	log.Println("Successfull Query... Stored data as id", savedID)

}

func HandleLogging(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "This method is not allowed", http.StatusMethodNotAllowed)
		return
	}

	var err error
	var newPlayer dto.Player
	if err := json.NewDecoder(r.Body).Decode(&newPlayer); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	JWTtokenSigned, err := repository.Login(w, newPlayer)
	if err != nil {
		return
	}

	var responseVar dto.LoggingResponse
	responseVar.Message = "Successfully logged in"
	responseVar.Token = JWTtokenSigned

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(responseVar)
}

func GetProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	playerID := r.Context().Value("playerID")
	var err error
	var selectedPlayer model.PlayerStats
	// log.Println(playerID)
	idString, ok := playerID.(string)
	if !ok {
		http.Error(w, "Invalid player ID format in context", http.StatusInternalServerError)
		return
	}
	parsedUUID, err := uuid.Parse(idString)
	if err != nil {
		http.Error(w, "Could not parse UUID", http.StatusInternalServerError)
		return
	}
	err = database.Db.QueryRow("SELECT * FROM player_stats WHERE player_id = $1", parsedUUID).Scan(
		&selectedPlayer.Id,
		&selectedPlayer.Gold,
		&selectedPlayer.Elixir,
		&selectedPlayer.AttacksWon,
		&selectedPlayer.DefensesWon,
		&selectedPlayer.AttacksTotal,
		&selectedPlayer.DefendsTotal,
		&selectedPlayer.Trophies,
		&selectedPlayer.LastTimeAttacked,
		&selectedPlayer.LastCollectedGold,
		&selectedPlayer.LastCollectedElixir,
	)
	if err != nil {
		http.Error(w, "Error in fetching data", http.StatusInternalServerError)
		log.Println("Error in fetching data, err = ", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(selectedPlayer)
}
