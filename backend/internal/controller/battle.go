package controller

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/google/uuid"
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
	if response.Amount == 0 {
		http.Error(w, "HAHA LOSER, only they play BlastOfBastion", http.StatusNotFound)
		log.Println("HAHA LOSER, only they play BlastOfBastion")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)

}
