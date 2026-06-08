package database

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
)

var Db *sql.DB

func ConnectToDatabase() *sql.DB {
	var err error
	db_url := os.Getenv("DB_URL")

	Db, err = sql.Open("pgx", db_url)
	if err != nil {
		log.Fatal("Invalid credentials to the database ...", err)
	}
	log.Println("Trying to connect to database...")

	err = Db.Ping()
	if err != nil {
		log.Fatal("Error in connecting to database")
	}
	return Db
}
