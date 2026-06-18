package controller

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/google/uuid"
	"github.com/khannasujaan/BlastOfBastion/internal/dto"
	"github.com/khannasujaan/BlastOfBastion/internal/repository"
)

var ErrInvalidMethod = errors.New("invalid method")

func initController[T any](w http.ResponseWriter, r *http.Request) (T, uuid.UUID, error) {
	var emptyReq T
	if r.Method != "POST" {
		return emptyReq, uuid.Nil, ErrInvalidMethod
	}

	var err error
	var BuildReq T
	err = json.NewDecoder(r.Body).Decode(&BuildReq)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return emptyReq, uuid.Nil, err
	}

	playerID := r.Context().Value("playerID")
	idString, ok := playerID.(string)
	if !ok {
		http.Error(w, "Invalid player ID format in context", http.StatusInternalServerError)
		return emptyReq, uuid.Nil, err
	}
	parsedUUID, err := uuid.Parse(idString)
	if err != nil {
		http.Error(w, "Could not parse UUID", http.StatusInternalServerError)
		return emptyReq, uuid.Nil, err
	}
	return BuildReq, parsedUUID, nil
}

func NewBuilding(w http.ResponseWriter, r *http.Request) {
	var err error
	BuildReq, parsedUUID, err := initController[dto.BuildNewRequest](w, r)
	if err == ErrInvalidMethod {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		log.Println("Invalid method")
		return
	} else if err != nil {
		http.Error(w, "An Error Occured", http.StatusInternalServerError)
		log.Println("An Error occured, ", err)
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
	} else if err == repository.ErrMaxCountOfBuilding {
		http.Error(w, "Can't build more of this building at current townhall level", http.StatusBadRequest)
		log.Println("Can't build more of this building at current townhall level")
		return
	} else if err != nil {
		http.Error(w, "An Error Occured", http.StatusInternalServerError)
		log.Println("An Error occured, ", err)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func MoveBuiling(w http.ResponseWriter, r *http.Request) {
	var err error
	BuildReq, parsedUUID, err := initController[dto.BuildMoveRequest](w, r)
	if err == ErrInvalidMethod {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		log.Println("Invalid method")
		return
	} else if err != nil {
		http.Error(w, "An Error Occured", http.StatusInternalServerError)
		log.Println("An Error occured, ", err)
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

func UpgradeStartBuilding(w http.ResponseWriter, r *http.Request) {
	var err error
	BuildReq, parsedUUID, err := initController[dto.BuildUpgradeStartRequest](w, r)
	if err == ErrInvalidMethod {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		log.Println("Invalid method")
		return
	} else if err != nil {
		http.Error(w, "An Error Occured", http.StatusInternalServerError)
		log.Println("An Error occured, ", err)
		return
	}
	err = repository.UpgradeBuilding(parsedUUID, BuildReq)
	if err == repository.ErrNotEnoughResouces {
		http.Error(w, "Not enough resources", http.StatusBadRequest)
		log.Println("Not enough resources")
		return
	} else if err == repository.ErrTownhallLevelLow {
		http.Error(w, "Town hall level low", http.StatusBadRequest)
		log.Println("Town hall level low")
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

func UpgradeFinishBuilding(w http.ResponseWriter, r *http.Request) {
	var err error
	BuildReq, parsedUUID, err := initController[dto.BuildUpgradeFinishRequest](w, r)
	if err == ErrInvalidMethod {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		log.Println("Invalid method")
		return
	} else if err != nil {
		http.Error(w, "An Error Occured", http.StatusInternalServerError)
		log.Println("An Error occured, ", err)
		return
	}
	err = repository.UpgradeBuildingFinish(parsedUUID, BuildReq)
	if err == repository.ErrBadRequest {
		http.Error(w, "Ugrade not finished yet", http.StatusBadRequest)
		log.Println("Ugrade not finished yet")
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
}
