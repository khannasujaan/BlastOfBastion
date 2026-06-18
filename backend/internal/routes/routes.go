package routes

import (
	"fmt"
	"net/http"

	"github.com/khannasujaan/BlastOfBastion/internal/controller"
	"github.com/khannasujaan/BlastOfBastion/internal/middleware"
)

func Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Server is healthy")
	})

	mux.HandleFunc("/register", controller.HandleRegister)
	mux.HandleFunc("/login", controller.HandleLogging)

	mux.HandleFunc("/me", middleware.VerifyJWT(controller.GetProfile))
	mux.HandleFunc("/village/sync", middleware.VerifyJWT(controller.GetGameData))
	mux.HandleFunc("/village/building/new", middleware.VerifyJWT(controller.NewBuilding))
	mux.HandleFunc("/village/building/move", middleware.VerifyJWT(controller.MoveBuiling))
	mux.HandleFunc("/village/building/upgrade-start", middleware.VerifyJWT(controller.UpgradeStartBuilding))
	mux.HandleFunc("/village/building/upgrade-finish", middleware.VerifyJWT(controller.UpgradeFinishBuilding))
	mux.HandleFunc("/village/collect/gold", middleware.VerifyJWT(controller.CollectGold()))
	mux.HandleFunc("/village/collect/elixir", middleware.VerifyJWT(controller.CollectElixir()))
	mux.HandleFunc("/village/troop/train", middleware.VerifyJWT(controller.TrainTroop))
	mux.HandleFunc("/village/troop/upgrade", middleware.VerifyJWT(controller.UpgradeTroop))
	mux.HandleFunc("/battle/matchmake", middleware.VerifyJWT(controller.Matchmaking))
	mux.HandleFunc("/battle/getvillage", middleware.VerifyJWT(controller.GetVillage))

	corsMux := middleware.EnableCORS(mux)
	loggedMux := middleware.RequestLogger(corsMux)
	return loggedMux

}
