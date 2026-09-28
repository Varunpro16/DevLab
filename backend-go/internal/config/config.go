package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Port          string
	Environment   string
	AllowedOrigin string

	DBHost     string
	DBPort     string
	DBName     string
	DBUser     string
	DBPassword string

	JWTSecret      string
	JWTTTLMinutes  int
	RefreshTTLDays int

	AWSRegion          string
	AWSAccessKeyID     string
	AWSSecretAccessKey string
	S3Bucket           string

	KubeconfigPath string
	K8sInCluster   bool
	K8sNamespace   string
	IngressDomain  string
}

func Load() (Config, error) {
	cfg := Config{
		Port:          getEnv("APP_PORT", "5001"),
		Environment:   getEnv("APP_ENV", "development"),
		AllowedOrigin: getEnv("APP_ALLOWED_ORIGIN", "http://localhost:3000"),
		DBHost:        getEnv("DB_HOST", "127.0.0.1"),
		DBPort:        getEnv("DB_PORT", "3306"),
		DBName:        getEnv("DB_NAME", "devlab"),
		DBUser:        getEnv("DB_USER", "root"),
		DBPassword:    getEnv("DB_PASSWORD", "password"),
		JWTSecret:     getEnv("JWT_SECRET", "change-this-in-production"),

		AWSRegion:          getEnv("AWS_REGION", "us-east-1"),
		AWSAccessKeyID:     getEnv("AWS_ACCESS_KEY_ID", ""),
		AWSSecretAccessKey: getEnv("AWS_SECRET_ACCESS_KEY", ""),
		S3Bucket:           getEnv("S3_BUCKET", ""),

		KubeconfigPath: getEnv("KUBECONFIG_PATH", ""),
		K8sInCluster:   getEnv("K8S_IN_CLUSTER", "false") == "true",
		K8sNamespace:   getEnv("K8S_NAMESPACE", "default"),
		IngressDomain:  getEnv("INGRESS_DOMAIN", "127.0.0.1.nip.io"),
	}

	ttlRaw := getEnv("JWT_TTL_MINUTES", "1440")
	ttl, err := strconv.Atoi(ttlRaw)
	if err != nil || ttl <= 0 {
		return Config{}, fmt.Errorf("invalid JWT_TTL_MINUTES: %q", ttlRaw)
	}
	cfg.JWTTTLMinutes = ttl

	refreshTTLRaw := getEnv("REFRESH_TTL_DAYS", "30")
	refreshTTL, err := strconv.Atoi(refreshTTLRaw)
	if err != nil || refreshTTL <= 0 {
		return Config{}, fmt.Errorf("invalid REFRESH_TTL_DAYS: %q", refreshTTLRaw)
	}
	cfg.RefreshTTLDays = refreshTTL

	if cfg.JWTSecret == "" {
		return Config{}, fmt.Errorf("JWT_SECRET cannot be empty")
	}

	return cfg, nil
}

func (c Config) MySQLDSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true", c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName)
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}
