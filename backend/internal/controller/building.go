package controller

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/google/uuid"
	"github.com/khannasujaan/BlastOfBastion/internal/dto"
	"github.com/khannasujaan/BlastOfBastion/internal/repository"
)

func NewBuilding(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	var err error
	var BuildReq dto.BuildRequest
	err = json.NewDecoder(r.Body).Decode(&BuildReq)
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

	err = repository.NewBuilding(parsedUUID, BuildReq)
	if err == repository.ErrNotEnoughResouces {
		http.Error(w, "Not enough resources", http.StatusBadRequest)
		log.Println("Not enough resources")
		return
	} else if err == repository.ErrSpaceOccupied {
		http.Error(w, "Space already occupied", http.StatusBadRequest)
		log.Println("Space already occupied")
		return
	} else if err != nil {
		http.Error(w, "An Error Occured", http.StatusInternalServerError)
		log.Println("An Error occured, ", err)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func MoveBuiling(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	var err error
	var BuildReq dto.BuildMoveRequest
	err = json.NewDecoder(r.Body).Decode(&BuildReq)
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
	err = repository.MoveBuilding(parsedUUID, BuildReq)
	if err == repository.ErrSpaceOccupied {
		http.Error(w, "Space already occupied", http.StatusBadRequest)
		log.Println("Space already occupied")
		return
	} else if err == repository.ErrBuildingNotFound {
		http.Error(w, "Building not found", http.StatusBadRequest)
		log.Println("Building not found")
		return
	} else if err != nil {
		http.Error(w, "An Error Occured", http.StatusInternalServerError)
		log.Println("An Error occured, ", err)
		return
	}
	w.WriteHeader(http.StatusOK)
}
