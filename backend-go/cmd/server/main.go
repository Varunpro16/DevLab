package main

import (
	"context"
	"log"
	"net/http"

	"devlab/backend-go/internal/config"
	"devlab/backend-go/internal/database"
	"devlab/backend-go/internal/http/router"
	appk8s "devlab/backend-go/internal/kubernetes"
	"devlab/backend-go/internal/storage"
)

func main() {
	ctx := context.Background()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	db, err := database.NewMySQL(cfg.MySQLDSN())
	if err != nil {
		log.Fatalf("database connection error: %v", err)
	}
	defer db.Close()

	s3Manager, err := storage.NewManager(ctx, cfg.AWSRegion, cfg.S3Bucket)
	if err != nil {
		log.Fatalf("s3 manager error: %v", err)
	}

	var envManager *appk8s.EnvironmentManager
	clientset, err := appk8s.NewClientset(cfg.KubeconfigPath, cfg.K8sInCluster)
	if err != nil {
		log.Printf("warning: kubernetes client unavailable, project environments will fail until this is fixed: %v", err)
		envManager = appk8s.NewEnvironmentManager(nil, cfg.IngressDomain)
	} else {
		envManager = appk8s.NewEnvironmentManager(clientset, cfg.IngressDomain)
	}

	handler := router.New(cfg, db, s3Manager, envManager)
	addr := ":" + cfg.Port

	log.Printf("devlab api listening on the %s", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("server exited with error: %v", err)
	}
}
