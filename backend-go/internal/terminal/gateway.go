package terminal

import (
	"log"
	"net/http"
	"os/exec"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
)

var Upgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin: func(r *http.Request) bool {
		// Origin is enforced by the HTTP layer's CORS + auth middleware before upgrade.
		return true
	},
}

// ServeKubectlExec upgrades the HTTP connection to a WebSocket and bridges it to
// `kubectl exec -it <pod> -- /bin/bash` running in the given namespace, mirroring
// how a real terminal session behaves inside the user's isolated environment.
func ServeKubectlExec(w http.ResponseWriter, r *http.Request, namespace, podName string) {
	conn, err := Upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("terminal: websocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	cmd := exec.Command("kubectl", "exec", "-it", "-n", namespace, podName, "--", "/bin/bash")

	ptmx, err := pty.Start(cmd)
	if err != nil {
		log.Printf("terminal: failed to start pty: %v", err)
		_ = conn.WriteMessage(websocket.TextMessage, []byte("failed to start terminal: "+err.Error()))
		return
	}
	defer func() {
		_ = ptmx.Close()
		_ = cmd.Process.Kill()
	}()

	done := make(chan struct{})

	// pty -> websocket
	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := ptmx.Read(buf)
			if n > 0 {
				if writeErr := conn.WriteMessage(websocket.BinaryMessage, buf[:n]); writeErr != nil {
					break
				}
			}
			if err != nil {
				break
			}
		}
		close(done)
	}()

	// websocket -> pty
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			break
		}
		if _, err := ptmx.Write(message); err != nil {
			break
		}
	}

	<-done
}
