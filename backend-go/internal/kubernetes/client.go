package kubernetes

import (
	"fmt"
	"os"
	"path/filepath"

	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

// NewClientset builds a Kubernetes clientset, either from an explicit kubeconfig path,
// the default ~/.kube/config, or in-cluster config when running inside a pod.
func NewClientset(kubeconfigPath string, inCluster bool) (*kubernetes.Clientset, error) {
	var restConfig *rest.Config
	var err error

	switch {
	case inCluster:
		restConfig, err = rest.InClusterConfig()
	default:
		path := kubeconfigPath
		if path == "" {
			home, homeErr := os.UserHomeDir()
			if homeErr != nil {
				return nil, fmt.Errorf("resolve home directory: %w", homeErr)
			}
			path = filepath.Join(home, ".kube", "config")
		}
		restConfig, err = clientcmd.BuildConfigFromFlags("", path)
	}

	if err != nil {
		return nil, fmt.Errorf("build kubernetes config: %w", err)
	}

	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return nil, fmt.Errorf("create kubernetes clientset: %w", err)
	}
	return clientset, nil
}
