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

}
