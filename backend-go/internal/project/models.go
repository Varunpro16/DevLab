package project

import "time"

type Status string

const (
	StatusStopped  Status = "stopped"
	StatusStarting Status = "starting"
	StatusRunning  Status = "running"
	StatusFailed   Status = "failed"
)

type Project struct {
	ID             int64     `json:"id"`
	UserID         int64     `json:"user_id"`
	Name           string    `json:"name"`
	Language       string    `json:"language"`
	Status         Status    `json:"status"`
	Namespace      string    `json:"namespace"`
	DeploymentName string    `json:"deployment_name"`
	ServiceName    string    `json:"service_name"`
	PodName        string    `json:"pod_name,omitempty"`
	PublicURL      string    `json:"public_url,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// S3Prefix returns the storage prefix that holds this project's files.
func (p Project) S3Prefix() string {
	return "projects/" + itoa(p.UserID) + "/" + itoa(p.ID) + "/"
}

func itoa(n int64) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}
