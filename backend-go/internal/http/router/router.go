package router

import (
	"database/sql"
	"net/http"

	"devlab/backend-go/internal/config"
	"devlab/backend-go/internal/http/handlers"
	"devlab/backend-go/internal/http/middleware"
	appk8s "devlab/backend-go/internal/kubernetes"
	"devlab/backend-go/internal/project"
	"devlab/backend-go/internal/session"
	"devlab/backend-go/internal/storage"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
)

func New(cfg config.Config, db *sql.DB, s3Manager *storage.Manager, envManager *appk8s.EnvironmentManager) http.Handler {
	r := chi.NewRouter()
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{cfg.AllowedOrigin},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	sessionRepo := session.NewRepository(db)
	authHandler := handlers.NewAuthHandler(db, sessionRepo, cfg.JWTSecret, cfg.JWTTTLMinutes, cfg.RefreshTTLDays)
	projectRepo := project.NewRepository(db)
	projectHandler := handlers.NewProjectHandler(projectRepo, s3Manager, envManager, cfg)
	fileHandler := handlers.NewFileHandler(projectHandler, s3Manager)
	terminalHandler := handlers.NewTerminalHandler(projectHandler)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	r.Route("/api/auth", func(api chi.Router) {
		api.Post("/register", authHandler.Register)
		api.Post("/login", authHandler.Login)
		api.Post("/refresh", authHandler.Refresh)

		api.Group(func(protected chi.Router) {
			protected.Use(middleware.Auth(cfg.JWTSecret))
			protected.Get("/me", authHandler.Me)
			protected.Post("/logout", authHandler.Logout)
			protected.Get("/sessions", authHandler.ListSessions)
			protected.Delete("/sessions/{sessionID}", authHandler.RevokeSession)
		})
	})

	r.Route("/api/projects", func(api chi.Router) {
		api.Use(middleware.Auth(cfg.JWTSecret))

		api.Post("/", projectHandler.Create)
		api.Get("/", projectHandler.List)

		api.Route("/{projectID}", func(pr chi.Router) {
			pr.Get("/", projectHandler.Get)
			pr.Delete("/", projectHandler.Delete)
			pr.Get("/status", projectHandler.Status)
			pr.Post("/start", projectHandler.Start)
			pr.Post("/stop", projectHandler.Stop)

			pr.Get("/files", fileHandler.Tree)
			pr.Get("/file", fileHandler.Read)
			pr.Put("/file", fileHandler.Write)
			pr.Post("/folder", fileHandler.CreateFolder)

			pr.Get("/terminal", terminalHandler.Serve)
		})
	})

	return r
}
