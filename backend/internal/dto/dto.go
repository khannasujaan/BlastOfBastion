package dto

type Player struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoggingResponse struct {
	Message string `json:"message"`
	Token   string `json:"token"`
}
