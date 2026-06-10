package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	controller "github.com/khannasujaan/BlastOfBastion/internal/controllers"
	"github.com/khannasujaan/BlastOfBastion/internal/database"
)

func main() {
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatal("Warning: No .env file found")
	}

	database.ConnectToDatabase()
	log.Println("Connected to database successfully")

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Server is healthy")
	})

	http.HandleFunc("/register", controller.HandleRegister)
	http.HandleFunc("/login", controller.HandleLogging)

	port := os.Getenv("PORT")
	log.Println("Loading Server at PORT", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal("Error in Server loading")
	}
}
