package controller

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/google/uuid"
	"github.com/khannasujaan/BlastOfBastion/internal/dto"
	"github.com/khannasujaan/BlastOfBastion/internal/repository"
)

func TrainTroop(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Invalid Method", http.StatusMethodNotAllowed)
		return
	}

	var err error
	var TroopReq dto.TroopTrainRequest
	err = json.NewDecoder(r.Body).Decode(&TroopReq)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	playerID := r.Context().Value("playerID")
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
	err = repository.TrainTroop(parsedUUID, TroopReq)
	if err == repository.ErrTownhallLevelLow {
		http.Error(w, "TownHall level low", http.StatusBadRequest)
		log.Println("Townhall level low")
		return
	} else if err == repository.ErrMoreThanHousingSpace {
		http.Error(w, "Housing space exceeded", http.StatusBadRequest)
		log.Println("Housing space exceeded")
		return
	} else if err != nil {
		http.Error(w, "Error Occured", http.StatusInternalServerError)
		log.Println("Error occured, ", err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func UpgradeTroop(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Invalid Method", http.StatusMethodNotAllowed)
		return
	}

	var err error
	var TroopReq dto.TroopUpgradeRequest
	err = json.NewDecoder(r.Body).Decode(&TroopReq)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	playerID := r.Context().Value("playerID")
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
	err = repository.UpgradeTroop(parsedUUID, TroopReq)
	if err == repository.ErrTownhallLevelLow {
		http.Error(w, "TownHall level low", http.StatusBadRequest)
		log.Println("Townhall level low")
		return
	} else if err == repository.ErrNotEnoughResouces {
		http.Error(w, "Not enough resources", http.StatusBadRequest)
		log.Println("Not enough resources")
		return
	} else if err != nil {
		http.Error(w, "Error Occured", http.StatusInternalServerError)
		log.Println("Error occured, ", err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}
