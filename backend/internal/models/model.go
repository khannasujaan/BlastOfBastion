package model

import uuid "github.com/jackc/pgx/pgtype/ext/gofrs-uuid"

type Player struct {
	Id            uuid.UUID `json:"id"`
	Username      string    `json:"username"`
	Password_hash string    `json:"password_hash"`
	Is_deleted    bool      `json:"is_deleted"`
}
