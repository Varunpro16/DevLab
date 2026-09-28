package project

import (
	"context"
	"database/sql"
	"errors"
)

var ErrNotFound = errors.New("project not found")

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, p Project) (int64, error) {
	result, err := r.db.ExecContext(ctx, `
		INSERT INTO projects (user_id, name, language, status, namespace, deployment_name, service_name)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		p.UserID, p.Name, p.Language, p.Status, p.Namespace, p.DeploymentName, p.ServiceName,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func (r *Repository) ListByUser(ctx context.Context, userID int64) ([]Project, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, user_id, name, language, status, namespace, deployment_name, service_name,
		       COALESCE(pod_name, ''), COALESCE(public_url, ''), created_at, updated_at
		FROM projects WHERE user_id = ? ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Project
	for rows.Next() {
		var p Project
		if err := rows.Scan(&p.ID, &p.UserID, &p.Name, &p.Language, &p.Status, &p.Namespace,
			&p.DeploymentName, &p.ServiceName, &p.PodName, &p.PublicURL, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *Repository) GetByIDForUser(ctx context.Context, id, userID int64) (Project, error) {
	var p Project
	err := r.db.QueryRowContext(ctx, `
		SELECT id, user_id, name, language, status, namespace, deployment_name, service_name,
		       COALESCE(pod_name, ''), COALESCE(public_url, ''), created_at, updated_at
		FROM projects WHERE id = ? AND user_id = ?`, id, userID).Scan(
		&p.ID, &p.UserID, &p.Name, &p.Language, &p.Status, &p.Namespace,
		&p.DeploymentName, &p.ServiceName, &p.PodName, &p.PublicURL, &p.CreatedAt, &p.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return Project{}, ErrNotFound
	}
	if err != nil {
		return Project{}, err
	}
	return p, nil
}

func (r *Repository) UpdateStatus(ctx context.Context, id int64, status Status, podName, publicURL string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE projects SET status = ?, pod_name = ?, public_url = ? WHERE id = ?`,
		status, podName, publicURL, id)
	return err
}

func (r *Repository) Delete(ctx context.Context, id, userID int64) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM projects WHERE id = ? AND user_id = ?`, id, userID)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrNotFound
	}
	return nil
}
