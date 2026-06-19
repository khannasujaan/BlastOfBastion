package controller

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/google/uuid"
	"github.com/khannasujaan/BlastOfBastion/internal/dto"
	"github.com/khannasujaan/BlastOfBastion/internal/repository"
)

func Matchmaking(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Invalid Method", http.StatusMethodNotAllowed)
		log.Println("Invalid method")
		return
	}

	var err error
	playerID := r.Context().Value("playerID")
	idString, ok := playerID.(string)
	if !ok {
		http.Error(w, "Invalid player ID format in context", http.StatusInternalServerError)
		log.Println("Invalid player ID format in context")
		return
	}
	parsedUUID, err := uuid.Parse(idString)
	if err != nil {
		http.Error(w, "Could not parse UUID", http.StatusInternalServerError)
		log.Println("Could not parse UUID")
		return
	}

	response, err := repository.Matchmaking(parsedUUID)
	if err != nil {
		http.Error(w, "An Error occured", http.StatusInternalServerError)
		log.Println("An Error occured, ", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)

}

func GetVillage(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Invalid Method", http.StatusMethodNotAllowed)
		log.Println("Invalid method")
		return
	}

	var err error
	var BattleReq dto.GetVillageRequest
	err = json.NewDecoder(r.Body).Decode(&BattleReq)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	playerID := r.Context().Value("playerID")
	idString, ok := playerID.(string)
	if !ok {
		http.Error(w, "Invalid player ID format in context", http.StatusInternalServerError)
		log.Println("Invalid player ID format in context")
		return
	}
	parsedUUID, err := uuid.Parse(idString)
	if err != nil {
		http.Error(w, "Could not parse UUID", http.StatusInternalServerError)
		log.Println("Could not parse UUID")
		return
	}

	response, err := repository.CollectDataBattle(parsedUUID, BattleReq)
	if err != nil {
		http.Error(w, "An Error occured", http.StatusInternalServerError)
		log.Println("An Error occured, ", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)

}

func GetDefense(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Invalid Method", http.StatusMethodNotAllowed)
		log.Println("Invalid method")
		return
	}

	var err error
	var BattleReq dto.GetVillageRequest
	err = json.NewDecoder(r.Body).Decode(&BattleReq)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	playerID := r.Context().Value("playerID")
	idString, ok := playerID.(string)
	if !ok {
		http.Error(w, "Invalid player ID format in context", http.StatusInternalServerError)
		log.Println("Invalid player ID format in context")
		return
	}
	parsedUUID, err := uuid.Parse(idString)
	if err != nil {
		http.Error(w, "Could not parse UUID", http.StatusInternalServerError)
		log.Println("Could not parse UUID")
		return
	}

	response, err := repository.CollectDataDefence(parsedUUID, BattleReq)
	if err != nil {
		http.Error(w, "An Error occured", http.StatusInternalServerError)
		log.Println("An Error occured, ", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)

}

func Conclusion(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Invalid Method", http.StatusMethodNotAllowed)
		log.Println("Invalid method")
		return
	}

	var err error
	var BattleEnd dto.BattleEnd
	err = json.NewDecoder(r.Body).Decode(&BattleEnd)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	playerID := r.Context().Value("playerID")
	idString, ok := playerID.(string)
	if !ok {
		http.Error(w, "Invalid player ID format in context", http.StatusInternalServerError)
		log.Println("Invalid player ID format in context")
		return
	}
	parsedUUID, err := uuid.Parse(idString)
	if err != nil {
		http.Error(w, "Could not parse UUID", http.StatusInternalServerError)
		log.Println("Could not parse UUID")
		return
	}
	var winnerUUID uuid.UUID
	if BattleEnd.Percantage >= 50 {
		winnerUUID = parsedUUID
	} else {
		winnerUUID = BattleEnd.Defender
	}

	err = repository.Conclusion(parsedUUID, BattleEnd.Defender, winnerUUID, BattleEnd.Percantage, BattleEnd.Gold, BattleEnd.Elixir)
	if err != nil {
		http.Error(w, "An Error occured", http.StatusInternalServerError)
		log.Println("An Error occured, ", err)
		return
	}

	w.WriteHeader(http.StatusOK)

}
