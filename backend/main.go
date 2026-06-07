package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: No .env file found")
	}

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Server is healthy")
	})

	port := os.Getenv("PORT")
	fmt.Println("Loading Server at PORT", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal("Error in Server loading")
	}
}
