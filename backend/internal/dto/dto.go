package dto

type Player struct {
	Username      string `json:"username"`
	Password_hash string `json:"password_hash"`
}
