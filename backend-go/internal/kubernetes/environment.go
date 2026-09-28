package kubernetes

import (
	"context"
	"fmt"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/client-go/kubernetes"
)

type EnvironmentManager struct {
	client        kubernetes.Interface
	ingressDomain string
}

func NewEnvironmentManager(client kubernetes.Interface, ingressDomain string) *EnvironmentManager {
	return &EnvironmentManager{client: client, ingressDomain: ingressDomain}
}

type EnvironmentSpec struct {
	Namespace      string
	DeploymentName string
	ServiceName    string
	AppLabel       string
	Image          string
	Command        []string
	ContainerPort  int32
	Env            map[string]string
}

// EnsureNamespace creates the namespace if it doesn't already exist.
func (m *EnvironmentManager) EnsureNamespace(ctx context.Context, namespace string) error {
	_, err := m.client.CoreV1().Namespaces().Get(ctx, namespace, metav1.GetOptions{})
	if err == nil {
		return nil
	}
	if !apierrors.IsNotFound(err) {
		return fmt.Errorf("get namespace: %w", err)
	}

	_, err = m.client.CoreV1().Namespaces().Create(ctx, &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{Name: namespace},
	}, metav1.CreateOptions{})
	if err != nil && !apierrors.IsAlreadyExists(err) {
		return fmt.Errorf("create namespace: %w", err)
	}
	return nil
}

// CreateEnvironment creates (or replaces) the Deployment + Service + Ingress for a project.
func (m *EnvironmentManager) CreateEnvironment(ctx context.Context, spec EnvironmentSpec) error {
	if err := m.EnsureNamespace(ctx, spec.Namespace); err != nil {
		return err
	}

	envVars := make([]corev1.EnvVar, 0, len(spec.Env))
	for k, v := range spec.Env {
		envVars = append(envVars, corev1.EnvVar{Name: k, Value: v})
	}

	replicas := int32(1)
	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Name: spec.DeploymentName, Namespace: spec.Namespace},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{MatchLabels: map[string]string{"app": spec.AppLabel}},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: map[string]string{"app": spec.AppLabel}},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:            spec.AppLabel,
							Image:           spec.Image,
							Command:         []string{"sh", "-c"},
							Args:            spec.Command,
							Env:             envVars,
							Ports:           []corev1.ContainerPort{{ContainerPort: spec.ContainerPort}},
							SecurityContext: restrictedSecurityContext(),
							VolumeMounts: []corev1.VolumeMount{
								{Name: "workspace", MountPath: "/app"},
							},
						},
					},
					Volumes: []corev1.Volume{
						{Name: "workspace", VolumeSource: corev1.VolumeSource{EmptyDir: &corev1.EmptyDirVolumeSource{}}},
					},
					SecurityContext: podSecurityContext(),
				},
			},
		},
	}

	if err := m.upsertDeployment(ctx, spec.Namespace, deployment); err != nil {
		return err
	}

	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{Name: spec.ServiceName, Namespace: spec.Namespace},
		Spec: corev1.ServiceSpec{
			Selector: map[string]string{"app": spec.AppLabel},
			Ports: []corev1.ServicePort{
				{Port: 80, TargetPort: intstr.FromInt32(spec.ContainerPort)},
			},
			Type: corev1.ServiceTypeClusterIP,
		},
	}
	if err := m.upsertService(ctx, spec.Namespace, service); err != nil {
		return err
	}

	host := fmt.Sprintf("%s-%s.%s", spec.AppLabel, spec.Namespace, m.ingressDomain)
	pathType := networkingv1.PathTypePrefix
	ingress := &networkingv1.Ingress{
		ObjectMeta: metav1.ObjectMeta{
			Name:      spec.AppLabel + "-ingress",
			Namespace: spec.Namespace,
			Annotations: map[string]string{
				"nginx.ingress.kubernetes.io/rewrite-target": "/",
			},
		},
		Spec: networkingv1.IngressSpec{
			Rules: []networkingv1.IngressRule{
				{
					Host: host,
					IngressRuleValue: networkingv1.IngressRuleValue{
						HTTP: &networkingv1.HTTPIngressRuleValue{
							Paths: []networkingv1.HTTPIngressPath{
								{
									Path:     "/",
									PathType: &pathType,
									Backend: networkingv1.IngressBackend{
										Service: &networkingv1.IngressServiceBackend{
											Name: spec.ServiceName,
											Port: networkingv1.ServiceBackendPort{Number: 80},
										},
									},
								},
							},
						},
					},
				},
			},
		},
	}
	return m.upsertIngress(ctx, spec.Namespace, ingress)
}

func (m *EnvironmentManager) upsertDeployment(ctx context.Context, namespace string, d *appsv1.Deployment) error {
	client := m.client.AppsV1().Deployments(namespace)
	_, err := client.Get(ctx, d.Name, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		_, err = client.Create(ctx, d, metav1.CreateOptions{})
		return err
	}
	if err != nil {
		return err
	}
	_, err = client.Update(ctx, d, metav1.UpdateOptions{})
	return err
}

func (m *EnvironmentManager) upsertService(ctx context.Context, namespace string, s *corev1.Service) error {
	client := m.client.CoreV1().Services(namespace)
	existing, err := client.Get(ctx, s.Name, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		_, err = client.Create(ctx, s, metav1.CreateOptions{})
		return err
	}
	if err != nil {
		return err
	}
	s.ResourceVersion = existing.ResourceVersion
	s.Spec.ClusterIP = existing.Spec.ClusterIP
	_, err = client.Update(ctx, s, metav1.UpdateOptions{})
	return err
}

func (m *EnvironmentManager) upsertIngress(ctx context.Context, namespace string, i *networkingv1.Ingress) error {
	client := m.client.NetworkingV1().Ingresses(namespace)
	_, err := client.Get(ctx, i.Name, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		_, err = client.Create(ctx, i, metav1.CreateOptions{})
		return err
	}
	if err != nil {
		return err
	}
	_, err = client.Update(ctx, i, metav1.UpdateOptions{})
	return err
}

// Scale sets the deployment replica count (0 to stop, 1 to start).
func (m *EnvironmentManager) Scale(ctx context.Context, namespace, deploymentName string, replicas int32) error {
	client := m.client.AppsV1().Deployments(namespace)
	deployment, err := client.Get(ctx, deploymentName, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("get deployment: %w", err)
	}
	deployment.Spec.Replicas = &replicas
	_, err = client.Update(ctx, deployment, metav1.UpdateOptions{})
	return err
}

// Delete removes the deployment, service, and ingress for a project.
func (m *EnvironmentManager) Delete(ctx context.Context, namespace, deploymentName, serviceName, appLabel string) error {
	_ = m.client.NetworkingV1().Ingresses(namespace).Delete(ctx, appLabel+"-ingress", metav1.DeleteOptions{})
	_ = m.client.CoreV1().Services(namespace).Delete(ctx, serviceName, metav1.DeleteOptions{})
	return m.client.AppsV1().Deployments(namespace).Delete(ctx, deploymentName, metav1.DeleteOptions{})
}

// PodStatus reports the phase and readiness of the first pod matching the app label.
type PodStatus struct {
	PodName string
	Phase   string
	Ready   bool
}

func (m *EnvironmentManager) PodStatus(ctx context.Context, namespace, appLabel string) (PodStatus, error) {
	pods, err := m.client.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: "app=" + appLabel,
	})
	if err != nil {
		return PodStatus{}, fmt.Errorf("list pods: %w", err)
	}
	if len(pods.Items) == 0 {
		return PodStatus{Phase: "NotFound"}, nil
	}

	pod := pods.Items[0]
	ready := false
	for _, cond := range pod.Status.Conditions {
		if cond.Type == corev1.PodReady && cond.Status == corev1.ConditionTrue {
			ready = true
		}
	}
	return PodStatus{PodName: pod.Name, Phase: string(pod.Status.Phase), Ready: ready}, nil
}

func restrictedSecurityContext() *corev1.SecurityContext {
	falseVal := false
	return &corev1.SecurityContext{
		AllowPrivilegeEscalation: &falseVal,
		Privileged:               &falseVal,
		Capabilities:             &corev1.Capabilities{Drop: []corev1.Capability{"ALL"}},
	}
}

func podSecurityContext() *corev1.PodSecurityContext {
	// Project pods run `apt-get install awscli` at startup to pull the project
	// from S3, which requires root. Container-level hardening (no privilege
	// escalation, all capabilities dropped) is still enforced below.
	return &corev1.PodSecurityContext{}
}
