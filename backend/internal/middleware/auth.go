package middleware

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

func VerifyJWT(f http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		recievedJWTraw := r.Header.Get("Authorization")
		if recievedJWTraw == "" {
			http.Error(w, "No JWT found", http.StatusUnauthorized)
			log.Println("No JWT found")
			return
		}

		recievedJWT := strings.TrimPrefix(recievedJWTraw, "Bearer ")
		token, err := jwt.ParseWithClaims(recievedJWT, &jwt.RegisteredClaims{}, func(token *jwt.Token) (any, error) {
			return []byte(os.Getenv("JWT_KEY")), nil
		})
		if err != nil {
			if err == jwt.ErrTokenExpired {
				http.Error(w, "Token expired", http.StatusUnauthorized)
				log.Println("Token expired")
				return
			} else {
				http.Error(w, "Error Occured", http.StatusUnauthorized)
				log.Println("Error, ", err)
				return
			}
		}
		claims, ok := token.Claims.(*jwt.RegisteredClaims)
		if !ok || !token.Valid {
			http.Error(w, "Invalid token claims", http.StatusUnauthorized)
			log.Println("Invalid token claims, ", err)
			return
		}
		playerID := claims.ID
		ctx := context.WithValue(r.Context(), "playerID", playerID)
		r = r.WithContext(ctx)
		f(w, r)
	}
}
