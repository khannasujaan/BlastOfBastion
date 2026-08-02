package main

import (
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/khannasujaan/BlastOfBastion/internal/database"
	"github.com/khannasujaan/BlastOfBastion/internal/routes"
)

func main() {
	if os.Getenv("RUNNING_IN_DOCKER") == "" {
		err := godotenv.Load()
		if err != nil {
			log.Println("No .env file found")
		}
	}

	database.ConnectToDatabase()
	log.Println("Connected to database successfully")
	corsMux := routes.Routes()

	port := os.Getenv("PORT")
	if port == "" {
		port = os.Getenv("BACKEND_PORT")
	}
	if port == "" {
		port = "8080"
	}
	log.Println("Loading Server at PORT", port)
	if err := http.ListenAndServe(":"+port, corsMux); err != nil {
		log.Fatal("Error in Server loading")
	}
}
