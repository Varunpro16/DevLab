package storage

import (
	"bytes"
	"context"
	"fmt"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type Manager struct {
	client *s3.Client
	bucket string
}

type FileNode struct {
	Name string `json:"name"`
	Type string `json:"type"` // "file" or "folder"
	Path string `json:"path"`
}

func NewManager(ctx context.Context, region, bucket string) (*Manager, error) {
	cfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion(region))
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}
	return &Manager{client: s3.NewFromConfig(cfg), bucket: bucket}, nil
}

// SeedProject writes the initial set of template files under the project's S3 prefix.
func (m *Manager) SeedProject(ctx context.Context, prefix string, files map[string]string) error {
	for relPath, content := range files {
		key := strings.TrimPrefix(prefix+relPath, "/")
		_, err := m.client.PutObject(ctx, &s3.PutObjectInput{
			Bucket: aws.String(m.bucket),
			Key:    aws.String(key),
			Body:   strings.NewReader(content),
		})
		if err != nil {
			return fmt.Errorf("seed file %s: %w", key, err)
		}
	}
	return nil
}

// CopyPrefix copies every object under srcPrefix to the equivalent relative path
// under destPrefix, within the same bucket. Used to seed a new project's files
// from a pre-existing S3 template (e.g. "initialsetup/react/") instead of
// generating file content in code.
func (m *Manager) CopyPrefix(ctx context.Context, srcPrefix, destPrefix string) error {
	if !strings.HasSuffix(srcPrefix, "/") {
		srcPrefix += "/"
	}
	if !strings.HasSuffix(destPrefix, "/") {
		destPrefix += "/"
	}

	var continuationToken *string
	copied := 0
	for {
		out, err := m.client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
			Bucket:            aws.String(m.bucket),
			Prefix:            aws.String(srcPrefix),
			ContinuationToken: continuationToken,
		})
		if err != nil {
			return fmt.Errorf("list objects for copy: %w", err)
		}

		for _, obj := range out.Contents {
			srcKey := aws.ToString(obj.Key)
			if strings.HasSuffix(srcKey, "/") {
				continue // skip folder marker objects
			}
			relPath := strings.TrimPrefix(srcKey, srcPrefix)
			destKey := destPrefix + relPath

			_, err := m.client.CopyObject(ctx, &s3.CopyObjectInput{
				Bucket:     aws.String(m.bucket),
				Key:        aws.String(destKey),
				CopySource: aws.String(fmt.Sprintf("%s/%s", m.bucket, srcKey)),
			})
			if err != nil {
				return fmt.Errorf("copy %s to %s: %w", srcKey, destKey, err)
			}
			copied++
		}

		if out.IsTruncated == nil || !*out.IsTruncated {
			break
		}
		continuationToken = out.NextContinuationToken
	}

	if copied == 0 {
		return fmt.Errorf("no template files found under s3://%s/%s", m.bucket, srcPrefix)
	}
	return nil
}

// Tree lists immediate files and folders under the given prefix (non-recursive).
func (m *Manager) Tree(ctx context.Context, prefix string) ([]FileNode, error) {
	if !strings.HasSuffix(prefix, "/") {
		prefix += "/"
	}

	out, err := m.client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
		Bucket:    aws.String(m.bucket),
		Prefix:    aws.String(prefix),
		Delimiter: aws.String("/"),
	})
	if err != nil {
		return nil, fmt.Errorf("list objects: %w", err)
	}

	var nodes []FileNode
	for _, cp := range out.CommonPrefixes {
		name := strings.TrimSuffix(strings.TrimPrefix(aws.ToString(cp.Prefix), prefix), "/")
		nodes = append(nodes, FileNode{Name: name, Type: "folder", Path: aws.ToString(cp.Prefix)})
	}
	for _, obj := range out.Contents {
		key := aws.ToString(obj.Key)
		if key == prefix {
			continue
		}
		nodes = append(nodes, FileNode{Name: strings.TrimPrefix(key, prefix), Type: "file", Path: key})
	}
	return nodes, nil
}

// ReadFile returns the content of a file stored at key.
func (m *Manager) ReadFile(ctx context.Context, key string) (string, error) {
	out, err := m.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(m.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return "", fmt.Errorf("get object: %w", err)
	}
	defer out.Body.Close()

	buf := new(bytes.Buffer)
	if _, err := buf.ReadFrom(out.Body); err != nil {
		return "", fmt.Errorf("read object body: %w", err)
	}
	return buf.String(), nil
}

// WriteFile stores content at key, overwriting any existing object.
func (m *Manager) WriteFile(ctx context.Context, key, content string) error {
	_, err := m.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(m.bucket),
		Key:    aws.String(key),
		Body:   strings.NewReader(content),
	})
	if err != nil {
		return fmt.Errorf("put object: %w", err)
	}
	return nil
}

// CreateFolder creates a zero-byte marker object so empty folders appear in listings.
func (m *Manager) CreateFolder(ctx context.Context, key string) error {
	if !strings.HasSuffix(key, "/") {
		key += "/"
	}
	_, err := m.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(m.bucket),
		Key:    aws.String(key),
		Body:   strings.NewReader(""),
	})
	if err != nil {
		return fmt.Errorf("create folder: %w", err)
	}
	return nil
}

// DeletePrefix removes every object under the given prefix (used when deleting a project).
func (m *Manager) DeletePrefix(ctx context.Context, prefix string) error {
	list, err := m.client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
		Bucket: aws.String(m.bucket),
		Prefix: aws.String(prefix),
	})
	if err != nil {
		return fmt.Errorf("list objects for delete: %w", err)
	}
	for _, obj := range list.Contents {
		_, err := m.client.DeleteObject(ctx, &s3.DeleteObjectInput{
			Bucket: aws.String(m.bucket),
			Key:    obj.Key,
		})
		if err != nil {
			return fmt.Errorf("delete object %s: %w", aws.ToString(obj.Key), err)
		}
	}
	return nil
}
