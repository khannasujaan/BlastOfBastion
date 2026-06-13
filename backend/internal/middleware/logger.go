package middleware

import (
	"log/slog"
	"net/http"
	"time"
)

// RequestLogger automatically logs the details of every incoming API hit
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		// 1. Record the exact time the request arrived
		start := time.Now()

		// 2. Pass the request down the chain to your actual controller
		next.ServeHTTP(w, r)

		// 3. After the controller finishes, calculate how long it took
		duration := time.Since(start)

		// 4. Log the result as a beautiful JSON object
		slog.Info("API Request",
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.String("duration", duration.String()),
		)
	})
}
