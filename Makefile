include .env
export

.PHONY: docker server migrate migrate-down

docker:
	docker compose up -d

server:
	go run database/main.go

migrate:
	migrate -path ./backend/internal/database/migrations -database "$(DB_URL)" up
