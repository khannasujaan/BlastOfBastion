package controller

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/google/uuid"
	"github.com/khannasujaan/BlastOfBastion/internal/repository"
)

func CollectGold() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		CollectResource(w, r, "gold")
	}
}

func CollectElixir() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		CollectResource(w, r, "elixir")
	}
}

func CollectResource(w http.ResponseWriter, r *http.Request, resource string) {
	if r.Method != "POST" {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}
	var err error
	playerID := r.Context().Value("playerID")
	idString, ok := playerID.(string)
	if !ok {
		http.Error(w, "Invalid player ID format in context", http.StatusInternalServerError)
		return
	}
	id, err := uuid.Parse(idString)
	if err != nil {
		http.Error(w, "Could not parse UUID", http.StatusInternalServerError)
		return
	}

	response, err := repository.CollectResource(id, resource)
	if err == repository.ErrPlayerNotFound {
		http.Error(w, "Player not found", http.StatusBadRequest)
		log.Println("Player not found")
		return
	} else if err != nil {
		http.Error(w, "Error Occured", http.StatusInternalServerError)
		log.Println("Error Occured, ", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
