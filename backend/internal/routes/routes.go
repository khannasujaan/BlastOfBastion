package routes

import (
	"fmt"
	"net/http"

	"github.com/khannasujaan/BlastOfBastion/internal/controller"
	"github.com/khannasujaan/BlastOfBastion/internal/middleware"
)

func Routes() {
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Server is healthy")
	})

	http.HandleFunc("/register", controller.HandleRegister)
	http.HandleFunc("/login", controller.HandleLogging)

	http.HandleFunc("/me", middleware.VerifyJWT(controller.GetProfile))
	http.HandleFunc("/village/sync", middleware.VerifyJWT(controller.GetGameData))
	http.HandleFunc("/village/building/new", middleware.VerifyJWT(controller.NewBuilding))
	http.HandleFunc("/village/building/move", middleware.VerifyJWT(controller.MoveBuiling))
	http.HandleFunc("/village/building/upgrade-start", middleware.VerifyJWT(controller.UpgradeStartBuilding))
	http.HandleFunc("/village/building/upgrade-finish", middleware.VerifyJWT(controller.UpgradeFinishBuilding))
	http.HandleFunc("/village/collect/gold", middleware.VerifyJWT(controller.CollectGold()))
	http.HandleFunc("/village/collect/elixir", middleware.VerifyJWT(controller.CollectElixir()))

}
