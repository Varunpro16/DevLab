const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");
const http = require("http");
const k8s = require('@kubernetes/client-node');
const pool = require('./db');
const mysql = require('mysql2/promise');
const { spawn } = require('child_process');
const db = require('./db')
const { exec } = require('child_process');
const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, CopyObjectCommand } =
  require("@aws-sdk/client-s3");
const pty = require('node-pty');
const { log } = require("console");
const app = express();

const PORT = 5000;
const BUCKET = "replit-bucket-saiivarun-2025"; // single bucket
const REGION = "us-east-1"; // change region

const s3 = new S3Client({ region: REGION });
const kc = new k8s.KubeConfig();
kc.loadFromDefault();


// Updated directory structure
const BASE_DIR = path.join(__dirname, "workspace");
const INITIAL_SETUP_DIR = path.join(BASE_DIR, "initialsetup");
const EDITED_VERSION_DIR = path.join(BASE_DIR, "editedversion");
const PROJECT_DIR = path.join(__dirname, "projects"); // Keep for backward compatibility

const k8sApi = kc.makeApiClient(k8s.AppsV1Api);
const coreApi = kc.makeApiClient(k8s.CoreV1Api);
const networkingApi = kc.makeApiClient(k8s.NetworkingV1Api);


app.use(cors());
app.use(bodyParser.json());


const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] },
});




// Template structures
const TEMPLATES = {
  react: {
    'package.json': JSON.stringify({
      "name": "react-project",
      "version": "0.1.0",
      "dependencies": {
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "react-scripts": "5.0.1"
      },
      "scripts": {
        "start": "react-scripts start",
        "build": "react-scripts build",
        "test": "react-scripts test",
        "eject": "react-scripts eject"
      }
    }, null, 2),
    'src/App.js': `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to React!</h1>
        <p>Start editing to see changes.</p>
      </header>
    </div>
  );
}

export default App;`,
    'src/index.js': `import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
    'src/App.css': `.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
}`,
    'src/index.css': `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto';
}`,
    'public/index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>React App</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`,
    'README.md': `# React Project

This project was bootstrapped with Create React App.

## Available Scripts

- \`npm start\` - Runs the app in development mode
- \`npm run build\` - Builds the app for production
- \`npm test\` - Launches the test runner`
  },
  
  python: {
    'main.py': `#!/usr/bin/env python3
"""
Main Python application
"""

def main():
    print("Hello, Python!")
    print("Start coding your Python application here.")
    
    # Example usage
    from utils.helpers import helper_function
    result = helper_function()
    print(f"Helper result: {result}")

if __name__ == "__main__":
    main()`,
    'requirements.txt': `# Add your Python dependencies here
# requests==2.28.1
# flask==2.2.2
# numpy==1.24.0`,
    'README.md': `# Python Project

## Getting Started

1. Install dependencies:
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`

2. Run the application:
   \`\`\`bash
   python main.py
   \`\`\`

## Project Structure

- \`main.py\` - Main application entry point
- \`utils/\` - Utility modules
- \`requirements.txt\` - Python dependencies`,
    'utils/__init__.py': '# Utils package',
    'utils/helpers.py': `"""
Utility functions for the application
"""

def helper_function():
    """Example helper function"""
    return "This is a helper function"

def calculate_sum(a, b):
    """Calculate sum of two numbers"""
    return a + b

def greet_user(name):
    """Greet a user"""
    return f"Hello, {name}! Welcome to Python."`
  },
  
  cpp: {
    'main.cpp': `#include <iostream>
#include "utils.h"

int main() {
    std::cout << "Hello, C++!" << std::endl;
    std::cout << "Start coding your C++ application here." << std::endl;
    
    // Example function calls
    greet("World");
    
    int result = add(5, 3);
    std::cout << "5 + 3 = " << result << std::endl;
    
    return 0;
}`,
    'utils.h': `#ifndef UTILS_H
#define UTILS_H

#include <string>

// Function declarations
void greet(const std::string& name);
int add(int a, int b);
int multiply(int a, int b);

#endif // UTILS_H`,
    'utils.cpp': `#include "utils.h"
#include <iostream>

void greet(const std::string& name) {
    std::cout << "Hello, " << name << "!" << std::endl;
}

int add(int a, int b) {
    return a + b;
}

int multiply(int a, int b) {
    return a * b;
}`,
    'Makefile': `CXX = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -O2
TARGET = main
SOURCES = main.cpp utils.cpp
OBJECTS = $(SOURCES:.cpp=.o)

$(TARGET): $(OBJECTS)
	$(CXX) $(CXXFLAGS) -o $(TARGET) $(OBJECTS)

%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

clean:
	rm -f $(OBJECTS) $(TARGET)

.PHONY: clean`,
    'README.md': `# C++ Project

## Building and Running

1. Compile the project:
   \`\`\`bash
   make
   \`\`\`

2. Run the executable:
   \`\`\`bash
   ./main
   \`\`\`

3. Clean build files:
   \`\`\`bash
   make clean
   \`\`\`

## Project Structure

- \`main.cpp\` - Main application entry point
- \`utils.h\` - Header file with function declarations
- \`utils.cpp\` - Implementation of utility functions
- \`Makefile\` - Build configuration`
  }
};


// Create initial templates
const createInitialTemplates = () => {
  Object.keys(TEMPLATES).forEach(templateName => {
    const templatePath = path.join(INITIAL_SETUP_DIR, templateName);
    const template = TEMPLATES[templateName];
    
    Object.keys(template).forEach(filePath => {
      const fullPath = path.join(templatePath, filePath);
      const dir = path.dirname(fullPath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, template[filePath]);
      }
    });
  });
};



const terminals = {};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);


  // Regular terminal (React pod) - existing code
  socket.on('create-terminal', (data) => {
    const { cols = 80, rows = 24, userId, projectName, podName } = data;
    
    console.log(`Creating terminal session for ${socket.id}`);
    
    // For Kubernetes pod (if you want to use K8s)
    const useKubernetes = true;
    const namespace =  'default';
    
    let terminal;
    console.log("podname: ",podName);
    
    if (useKubernetes && podName) {
      // Kubernetes pod terminal
      let kubectlArgs = [
        'exec',
        '-it',
        '-n', namespace,
        podName,
        '--', '/bin/bash'
      ];
      
      console.log('Creating Kubernetes terminal:', 'kubectl', kubectlArgs.join(' '));
      
      terminal = pty.spawn('kubectl', kubectlArgs, {
        name: 'xterm-color',
        cols: cols,
        rows: rows,
        cwd: process.cwd(),
        env: {
          ...process.env,
          TERM: 'xterm-256color'
        }
      });
    } else {
      // Local terminal (default)
      console.log('Creating local terminal session');
      
      terminal = pty.spawn('bash', [], {
        name: 'xterm-color',
        cols: cols,
        rows: rows,
        cwd: process.env.HOME || process.cwd(),
        env: {
          ...process.env,
          TERM: 'xterm-256color'
        }
      });
    }

    // Store terminal session
    terminals[socket.id] = terminal;

    // Send terminal output to client
    terminal.on('data', (data) => {
      socket.emit('terminal-output', data);
    });

    // Handle terminal exit
    terminal.on('exit', (code) => {
      console.log(`Terminal ${socket.id} exited with code:`, code);
      delete terminals[socket.id];
      socket.emit('terminal-exit', code);
    });

    // Handle terminal errors
    terminal.on('error', (error) => {
      console.error(`Terminal ${socket.id} error:`, error);
      socket.emit('terminal-output', `\r\nTerminal Error: ${error.message}\r\n`);
    });

    socket.emit('terminal-created');
  });

  // NEW: MySQL terminal connection
  socket.on('create-mysql-terminal', (data) => {
    const { 
      cols = 80, 
      rows = 24, 
      podName,
      userId,
      projectName,
    } = data;
    const connectionType = 'mysql';
    
    console.log(`Creating MySQL terminal session for ${socket.id}`);
    console.log('MySQL Pod:', podName);
    
    const namespace = process.env.K8S_NAMESPACE || 'default';
    let terminal;
    let kubectlArgs;

    if (connectionType === 'mysql') {
      // Direct MySQL connection
      const dbName = `restChecking-db`;
      const dbUser = 'saii112restChecking';
      const dbPassword = "ngw0c873zo";
      
      kubectlArgs = [
        'exec',
        '-it',
        '-n', namespace,
        podName,
        '--', 'mysql', 
        '-u', dbUser,
        `-p${dbPassword}`, 
        dbName
      ];
      
      console.log('Creating MySQL database terminal:', 'kubectl', kubectlArgs.join(' '));
    } else {
      // Bash terminal in MySQL pod
      kubectlArgs = [
        'exec',
        '-it',
        '-n', namespace,
        podName,
        '--', '/bin/bash'
      ];
      
      console.log('Creating MySQL pod bash terminal:', 'kubectl', kubectlArgs.join(' '));
    }
    
    terminal = pty.spawn('kubectl', kubectlArgs, {
      name: 'xterm-color',
      cols: cols,
      rows: rows,
      cwd: process.cwd(),
      env: {
        ...process.env,
        TERM: 'xterm-256color'
      }
    });

    // Store terminal session with a different key for MySQL
    const terminalKey = `mysql_${socket.id}`;
    terminals[terminalKey] = terminal;
    

    // Send terminal output to client
    terminal.on('data', (data) => {
      socket.emit('mysql-terminal-output', data);
    });

    // Handle terminal exit
    terminal.on('exit', (code) => {
      console.log(`MySQL Terminal ${socket.id} exited with code:`, code);
      delete terminals[terminalKey];
      socket.emit('mysql-terminal-exit', code);
    });

    // Handle terminal errors
    terminal.on('error', (error) => {
      console.error(`MySQL Terminal ${socket.id} error:`, error);
      socket.emit('mysql-terminal-output', `\r\nMySQL Terminal Error: ${error.message}\r\n`);
    });

    socket.emit('mysql-terminal-created');
  });


  // Handle input from client for regular terminal
  socket.on('terminal-input', (data) => {
    const terminal = terminals[socket.id];
    if (terminal && !terminal.killed) {
      terminal.write(data);
    }
  });

  // Handle input from client for MySQL terminal
  socket.on('mysql-terminal-input', (data) => {
    const terminalKey = `mysql_${socket.id}`;
    const terminal = terminals[terminalKey];
    if (terminal && !terminal.killed) {
      terminal.write(data);
    }
  });

  // Handle terminal resize for regular terminal
  socket.on('terminal-resize', (data) => {
    const terminal = terminals[socket.id];
    if (terminal && !terminal.killed) {
      try {
        terminal.resize(data.cols, data.rows);
      } catch (error) {
        console.error('Resize error:', error);
      }
    }
  });

  // Handle terminal resize for MySQL terminal
  socket.on('mysql-terminal-resize', (data) => {
    const terminalKey = `mysql_${socket.id}`;
    const terminal = terminals[terminalKey];
    if (terminal && !terminal.killed) {
      try {
        terminal.resize(data.cols, data.rows);
      } catch (error) {
        console.error('MySQL terminal resize error:', error);
      }
    }
  });

  // Get user's MySQL pod information
  socket.on('get-mysql-pod-info', async (data) => {
    const { userId } = data;
    
    try {
      const connection = await pool.getConnection();
      const [results] = await connection.query(
        'SELECT mysql_pod_name, mysql_service_name, project_name, database_name, db_user FROM user_project_mappings WHERE user_id = ?',
        [userId]
      );
      connection.release();
      
      socket.emit('mysql-pod-info', {
        success: true,
        pods: results
      });
    } catch (error) {
      console.error('Error getting MySQL pod info:', error);
      socket.emit('mysql-pod-info', {
        success: false,
        error: error.message
      });
    }
  });

  // Your existing socket events
  socket.on('existing-event', (data) => {
    console.log('Existing event received:', data);
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Clean up regular terminal
    const terminal = terminals[socket.id];
    if (terminal && !terminal.killed) {
      terminal.kill();
      delete terminals[socket.id];
    }
    
    // Clean up MySQL terminal
    const mysqlTerminalKey = `mysql_${socket.id}`;
    const mysqlTerminal = terminals[mysqlTerminalKey];
    if (mysqlTerminal && !mysqlTerminal.killed) {
      mysqlTerminal.kill();
      delete terminals[mysqlTerminalKey];
    }
  });
});

// Socket.IO connection handling
// io.on('connection', (socket) => {
//   console.log('Client connected:', socket.id);

//   // Terminal-specific events
//   socket.on('create-terminal', (data) => {
//     const { cols = 80, rows = 24 } = data;
    
//     console.log(`Creating terminal session for ${socket.id}`);
    
//     // For Kubernetes pod (if you want to use K8s)
//     const useKubernetes = true;
//     const podName = "varun-deployment-7944f7d95f-tdkxr";
//     const namespace = process.env.K8S_NAMESPACE || 'default';
    
//     let terminal;
    
//     if (useKubernetes && podName) {
//       // Kubernetes pod terminal
//       let kubectlArgs = [
//         'exec',
//         '-it',
//         '-n', namespace,
//         podName,
//         '--', '/bin/bash'
//       ];
      
//       console.log('Creating Kubernetes terminal:', 'kubectl', kubectlArgs.join(' '));
      
//       terminal = pty.spawn('kubectl', kubectlArgs, {
//         name: 'xterm-color',
//         cols: cols,
//         rows: rows,
//         cwd: process.cwd(),
//         env: {
//           ...process.env,
//           TERM: 'xterm-256color'
//         }
//       });
//     } else {
//       // Local terminal (default)
//       console.log('Creating local terminal session');
      
//       terminal = pty.spawn('bash', [], {
//         name: 'xterm-color',
//         cols: cols,
//         rows: rows,
//         cwd: process.env.HOME || process.cwd(),
//         env: {
//           ...process.env,
//           TERM: 'xterm-256color'
//         }
//       });
//     }

//     // Store terminal session
//     terminals[socket.id] = terminal;

//     // Send terminal output to client
//     terminal.on('data', (data) => {
//       socket.emit('terminal-output', data);
//     });

//     // Handle terminal exit
//     terminal.on('exit', (code) => {
//       console.log(`Terminal ${socket.id} exited with code:`, code);
//       delete terminals[socket.id];
//       socket.emit('terminal-exit', code);
//     });

//     // Handle terminal errors
//     terminal.on('error', (error) => {
//       console.error(`Terminal ${socket.id} error:`, error);
//       socket.emit('terminal-output', `\r\nTerminal Error: ${error.message}\r\n`);
//     });

//     socket.emit('terminal-created');
//   });

//   // Handle input from client
//   socket.on('terminal-input', (data) => {
//     const terminal = terminals[socket.id];
//     if (terminal && !terminal.killed) {
//       terminal.write(data);
//     }
//   });

//   // Handle terminal resize
//   socket.on('terminal-resize', (data) => {
//     const terminal = terminals[socket.id];
//     if (terminal && !terminal.killed) {
//       try {
//         terminal.resize(data.cols, data.rows);
//       } catch (error) {
//         console.error('Resize error:', error);
//       }
//     }
//   });

//   // Your existing socket events can go here
//   socket.on('existing-event', (data) => {
//     // Handle your existing socket events
//     console.log('Existing event received:', data);
//   });

//   // Clean up on disconnect
//   socket.on('disconnect', () => {
//     console.log('Client disconnected:', socket.id);
//     const terminal = terminals[socket.id];
//     if (terminal && !terminal.killed) {
//       terminal.kill();
//       delete terminals[socket.id];
//     }
//   });
// });


app.post("/api/projectStructure", async(req,res)=>{
  const { language, projectName, userId } = req.body;
  if (!language || !projectName) {
    console.log("name required")
    return res.status(400).json({ error: "Language and project name are required" });
  }

  const templatePrefix = `initialsetup/${language}/`;
  const projectPrefix = `projects/${userId}/${projectName}/`;

  // Check if project already exists in S3
  const existing = await s3.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: projectPrefix,
    MaxKeys: 1
  }));

  if (existing.Contents && existing.Contents.length > 0) {
    console.log("project already exist")
    console.log("Project Content: ", existing);
    return res.json({ error: "Project already exists" });
  }
  res.json({"message":"not exist"});
})

// Handle graceful shutdown
const gracefulShutdown = () => {
  console.log('Shutting down server...');
  
  // Kill all terminal sessions
  Object.keys(terminals).forEach(socketId => {
    const terminal = terminals[socketId];
    if (terminal && !terminal.killed) {
      terminal.kill();
    }
  });
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};
const NODE_PORT = 30006; // NodePort for MySQL

// Utility to wait for pod ready
async function waitForPodReady(podName, namespace = 'default', timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    // Pass namespace explicitly as first argument
    const res = await coreApi.listNamespacedPod(
      namespace,      // must pass namespace
      undefined,      // pretty
      undefined,      // _continue
      undefined,      // fieldSelector
      `app=${podName}` // labelSelector
    );

    if (res.body.items.length > 0) {
      const pod = res.body.items[0];
      if (pod.status.phase === 'Running' && pod.status.containerStatuses[0].ready) {
        return true;
      }
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error(`Pod ${podName} not ready after ${timeout / 1000}s`);
}


app.post('/api/createDB', async (req, res) => {
  let { userId, projectName } = req.body;
  const databaseName = `${projectName}-db`;

  if (!userId || !projectName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let hostConnection, podConnection;

  try {
    hostConnection = await pool.getConnection();

    // Check if user already has a pod
    const [existingMappings] = await hostConnection.query(
      'SELECT mysql_pod_name, mysql_service_name FROM user_project_mappings WHERE user_id = ? LIMIT 1',
      [userId]
    );

    let podName, serviceName;

    if (existingMappings.length === 0) {
      // No pod exists — create one
      const podResult = await createMySQLPod(userId);
      podName = podResult[0];
      serviceName = podResult[1];
    } else {
      podName = existingMappings[0].mysql_pod_name;
      serviceName = existingMappings[0].mysql_service_name;
    }

    // Wait for pod to be ready
    sleep(15000);

    // Get Node IP
    const nodes = await coreApi.listNode();
    console.log(("node: ",nodes));
    
    const nodeIP = nodes.body.items[0].status.addresses.find(a => a.type === 'InternalIP').address;

    // Connect to MySQL via NodePort
    podConnection = await mysql.createConnection({
      host: nodeIP,
      user: 'user',
      password: 'password',
      port: NODE_PORT
    });

    // Create database if not exists
    await podConnection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);

    // Create a new MySQL user for this project
    const projectUser = `${userId}_${projectName}`.replace(/[^a-zA-Z0-9]/g, '');
    const projectPass = Math.random().toString(36).slice(-10);

    await podConnection.query(`CREATE USER IF NOT EXISTS '${projectUser}'@'%' IDENTIFIED BY '${projectPass}'`);
    await podConnection.query(`GRANT ALL PRIVILEGES ON \`${databaseName}\`.* TO '${projectUser}'@'%'`);

    // Insert into mapping table
    await hostConnection.query(
      'INSERT INTO user_project_mappings (user_id, mysql_pod_name, mysql_service_name, project_name, database_name) VALUES (?, ?, ?, ?, ?)',
      [userId, podName, serviceName, projectName, databaseName]
    );

    hostConnection.release();

    return res.json({
      message: 'Database and user created successfully',
      podName,
      serviceName,
      dbUser: projectUser,
      dbPassword: projectPass,
      nodeIP,
      nodePort: NODE_PORT
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  } finally {
    if (podConnection) {
      try { await podConnection.end(); } catch (cleanupErr) { console.error('Error closing pod connection:', cleanupErr); }
    }
    if (hostConnection) {
      try { hostConnection.release(); } catch (cleanupErr) { console.error('Error releasing host connection:', cleanupErr); }
    }
  }
});

// Create MySQL Pod + NodePort Service
const createMySQLPod = async (userId) => {
  const podName = `mysql-pod-${userId}`;
  const serviceName = `mysql-service-${userId}`;

  try {
    // Deployment
    const deploymentManifest = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: { name: podName },
      spec: {
        replicas: 1,
        selector: { matchLabels: { app: podName } },
        template: {
          metadata: { labels: { app: podName } },
          spec: {
            containers: [{
              name: 'mysql',
              image: 'mysql:8.0',
              env: [
                { name: 'MYSQL_ROOT_PASSWORD', value: 'rootpassword' },
                { name: 'MYSQL_USER', value: 'user' },
                { name: 'MYSQL_PASSWORD', value: 'password' }
              ],
              ports: [{ containerPort: 3306 }],
              volumeMounts: [{
                name: 'mysql-storage',
                mountPath: '/var/lib/mysql'
              }]
            }],
            volumes: [{
              name: 'mysql-storage',
              emptyDir: {}
            }]
          }
        }
      }
    };

    await k8sApi.createNamespacedDeployment({ namespace: 'default', body: deploymentManifest });

    // NodePort Service
    const serviceManifest = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: { name: serviceName },
      spec: {
        selector: { app: podName },
        ports: [{
          port: 3306,
          targetPort: 3306,
          nodePort: NODE_PORT
        }],
        type: 'NodePort'
      }
    };

    await coreApi.createNamespacedService({ namespace: 'default', body: serviceManifest });

    console.log(`MySQL pod ${podName} with NodePort service ${serviceName} created successfully`);
    return [podName, serviceName];

  } catch (error) {
    console.error('MySQL Pod Creation Error:', error.body || error);
    throw error;
  }
};
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function getPodNameFromDeployment(deploymentName) {
    return new Promise((resolve, reject) => {
        const cmd = `kubectl get pods -l app=${deploymentName} -o jsonpath='{.items[0].metadata.name}'`;
        
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                reject(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                reject(`Stderr: ${stderr}`);
                return;
            }
            resolve(stdout.trim());
        });
    });
}
app.post("/api/project/create", async (req, res) => {
  try {
    const { language, projectName, userId } = req.body;
    if (!language || !projectName) {
      console.log("name required")
      return res.status(400).json({ error: "Language and project name are required" });
    }

    const templatePrefix = `initialsetup/${language}/`;
    const projectPrefix = `projects/${userId}/${projectName}/`;

    // Check if project already exists in S3
    const existing = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: projectPrefix,
      MaxKeys: 1
    }));

    if (existing.Contents && existing.Contents.length > 0) {
      console.log("project already exist")
      return res.json({ error: "Project already exists" });
    }

    // Copy template files from S3 → project folder in S3
    const templateFiles = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: templatePrefix
    }));

    if (!templateFiles.Contents || templateFiles.Contents.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }

    for (const file of templateFiles.Contents) {
      if (!file.Key.endsWith("/")) {
        const destKey = file.Key.replace(templatePrefix, projectPrefix);
        await s3.send(new CopyObjectCommand({
          CopySource: `${BUCKET}/${file.Key}`,
          Bucket: BUCKET,
          Key: destKey
        }));
      }
    }

    // Check if deployment already exists in Kubernetes
    await k8sApi.readNamespacedDeploymentStatus(projectName, "default")
      .then(async (e) => {
        console.log("inside then");
        
        // Deployment exists → fetch podName from DB
        const [rows] = await db.query(
          "SELECT POD_NAME FROM IDE_PROJECT_TABLE WHERE USER_ID = ? AND PROJECT_NAME = ?",
          [userId, projectName]
        );

        if (rows.length > 0) {
          console.log("prohect already exist");
          
          return res.json({
            message: "Project already exists",
            projectPath: `projects/${userId}/${projectName}/`
          });
        } else {
          return res.status(404).json({ error: "Deployment exists but no DB record found" });
        }
      })
      .catch(async (e) => {
        // Deployment not found → create new pod
        console.log("calling create pod s3");
        
        const podName = await createPodS3(language, projectName, userId);
        if (!podName) {
          return res.status(500).json({ error: "Failed to create pod" });
        }

        // Insert pod info into DB
        await db.query(
          `INSERT INTO IDE_PROJECT_TABLE 
          (USER_ID, PROJECT_NAME, ENVIRONMENT, LAST_MODIFIED_DATE, POD_NAME) 
          VALUES (?, ?, ?, ?, ?)`,
          [userId, projectName, language, new Date(), podName]
        );

        return res.json({
          message: "Project created and pod launched successfully",
          projectPath: `projects/${userId}/${projectName}/`
        });
      });

  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Failed to create project" });
  }
});

function getPodNameFromDeployment(deploymentName) {
    return new Promise((resolve, reject) => {
        const cmd = `kubectl get pods -l app=${deploymentName} -o jsonpath='{.items[0].metadata.name}'`;
        
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                reject(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                reject(`Stderr: ${stderr}`);
                return;
            }
            resolve(stdout.trim());
        });
    });
}
const createPodS3 = async (template, projectName, userId) => {
  if (!template || !projectName) return null;
  console.log("inside create pod s3");
  
  const projectId = projectName.toLowerCase();
  const containerPort = template === 'React' ? 3000 : 5000;
  const mPath = '/app';

  try {
    const deploymentManifest = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: { name: `${projectId}-deployment` },
      spec: {
        replicas: 1,
        selector: { matchLabels: { app: projectId } },
        template: {
          metadata: { labels: { app: projectId } },
          spec: {
            initContainers: [{
              name: 's3-sync',
              image: 'amazon/aws-cli',
              command: ["sh", "-c"],
              args: [
                `aws s3 cp s3://${BUCKET}/projects/${userId}/${projectName}/ /app --recursive`              
              ],
              env: [
                { name: "AWS_ACCESS_KEY_ID", value: ""},
                { name: "AWS_SECRET_ACCESS_KEY", value:""},
                { name: "AWS_DEFAULT_REGION", value: REGION }
              ],
              volumeMounts: [{ name: "user-code", mountPath: mPath }]
            }],
            containers: [{
              name: `${projectId}-container`,
              image: "node:18",
              command: ["sh", "-c"],
              args: [
                `
                # install AWS CLI
                curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
                unzip awscliv2.zip && \
                ./aws/install && \

                # download project from S3
                aws s3 cp s3://${BUCKET}/projects/${userId}/${projectName}/ /app --recursive || echo "S3 download failed" && \

                cd /app && \
                npm install && \
                npm start & \

                # background S3 upload loop
                while true; do \
                  sleep 30; \
                  aws s3 sync /app s3://${BUCKET}/projects/${userId}/${projectName} --exclude "node_modules/*"; \
                done
                `
              ],


              env: [
                { name: "AWS_ACCESS_KEY_ID", value: ""},
                { name: "AWS_SECRET_ACCESS_KEY", value:""},
                { name: "AWS_DEFAULT_REGION", value: REGION }
              ],
              ports: [{ containerPort }],
              volumeMounts: [{ name: "user-code", mountPath: mPath }]
            }],
            volumes: [{ name: "user-code", emptyDir: {} }]
          }
        }
      }
    };

    await k8sApi.createNamespacedDeployment({ namespace: 'default', body: deploymentManifest });

    // Service
    const serviceManifest = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: { name: `${projectId}-service` },
      spec: { selector: { app: projectId }, ports: [{ port: 80, targetPort: containerPort }], type: 'ClusterIP' }
    };
    await coreApi.createNamespacedService({ namespace: 'default', body: serviceManifest });

    // Ingress
    const ingressManifest = {
  apiVersion: 'networking.k8s.io/v1',
  kind: 'Ingress',
  metadata: { 
    name: `${projectId}-ingress`,
    annotations: {
      "nginx.ingress.kubernetes.io/rewrite-target": "/"
    }
  },
  spec: {
    ingressClassName: "nginx",   // <--- REQUIRED
    rules: [{
      host: `${projectId}-${userId}.172.17.0.4.nip.io`,
      http: {
        paths: [{
          path: '/',
          pathType: 'Prefix',
          backend: {
            service: { name: `${projectId}-service`, port: { number: 80 } }
          }
        }]
      }
    }]
  }
};


    await networkingApi.createNamespacedIngress({ namespace: 'default', body: ingressManifest });

    console.log(`Pod created for ${projectName}`);
    return getPodNameFromDeployment(projectId);

  } catch (error) {
    console.error('K8s Creation Error:', error.body || error);
    return null;
  }
 };

// app.post('/api/createDB', async (req, res) => {
//   let { userId, projectName } = req.body;
//   const databaseName = `${projectName}-db`

//   if (!userId || !projectName ) {
//     return res.status(400).json({ error: 'Missing required fields' });
//   }
//   let HostConnection ,podConnection;
//   try {
//     let HostConnection = await pool.getConnection();

//     // Check if user already has a pod
//     const [existingMappings] = await HostConnection.query(
//       'SELECT mysql_pod_name FROM user_project_mappings WHERE user_id = ? LIMIT 1',
//       [userId]
//     );

//     let podName,serviceName;

//     if (existingMappings.length === 0) {
//       // No pod exists — create one
//       const podCreationResult  = await createMySQLPod(userId);
//       podName = podCreationResult[0]
//       serviceName = podCreationResult[1]
//     } else {
//       podName = existingMappings[0].mysql_pod_name;
//       serviceName = existingMappings[0].mysql_service_name;
//     }

//     podConnection = await mysql.createConnection({
//       host: serviceName, // Kubernetes Service name
//       user: 'user',
//       password: 'password',
//       port: 3306
//     });

//     await podConnection.changeUser({ database: databaseName });


//     // Create the database in the pod (replace with actual pod exec logic)
//     await podConnection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);

//     // Create a new MySQL user for this project and grant permissions
//     const projectUser = `${userId}_${projectName}`.replace(/[^a-zA-Z0-9]/g, '');
//     const projectPass = Math.random().toString(36).slice(-10);

//     await podConnection.query(`CREATE USER IF NOT EXISTS '${projectUser}'@'%' IDENTIFIED BY '${projectPass}'`);
//     await podConnection.query(`GRANT ALL PRIVILEGES ON \`${databaseName}\`.* TO '${projectUser}'@'%'`);

//     // Insert into mapping table
//     await HostConnection.query(
//       'INSERT INTO user_project_mappings (user_id, mysql_pod_name, project_name, database_name) VALUES (?, ?, ?, ?)',
//       [userId, podName, projectName, databaseName]
//     );

//     HostConnection.release();

//     return res.json({
//       message: 'Database and user created successfully',
//       podName,
//       dbUser: projectUser,
//       dbPassword: projectPass,
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }finally{
//      if (podConnection) {
//       try {
//         await podConnection.end();
//       } catch (cleanupErr) {
//         console.error('Error closing pod connection:', cleanupErr);
//       }
//     }
//     if (HostConnection) {
//       try {
//         HostConnection.release();
//       } catch (cleanupErr) {
//         console.error('Error releasing host connection:', cleanupErr);
//       }
//     }
//   }
// });

app.put("/api/addTechStack", async (req, res) => {
  try {
    const { language, projectName, userId } = req.body;
    console.log(req.body);
    

    let languageKey ;
    if(language=="React.js"){
      languageKey="react"
    }else if(language=="Node.js"){
      languageKey="nodejs";
    }
    console.log(EDITED_VERSION_DIR, userId, projectName, languageKey);
    

    const projectPath = path.join(EDITED_VERSION_DIR, userId, projectName, languageKey);


    // Check if project already exists
    if (fs.existsSync(projectPath)) {
      return res.status(400).json({ error: 'Project already exists' });
    }

    // Create project directory
    fs.mkdirSync(projectPath, { recursive: true });

    
    // Define the source template path
    const sourcePath = path.join(INITIAL_SETUP_DIR, languageKey);


    // Check if source exists
    if (!fs.existsSync(sourcePath)) {
      return res.json({ error: 'Source template not found' });
    }

    // Copy files and folders from initial setup to the new project directory
    fs.cpSync(sourcePath, projectPath, { recursive: true });

    res.json({
      message: 'Project created and files copied successfully',
      projectPath: `editedversion/${userId}/${projectName}/${languageKey}/`,
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});



app.post("/api/getPodName",async(req,res) => {

  const {userId,projectName} = req.body

  console.log("getpod: ",userId,projectName);
  
  // fetch podName from DB
  const [rows] = await db.query(
    "SELECT POD_NAME FROM IDE_PROJECT_TABLE WHERE USER_ID = ? AND PROJECT_NAME = ?",
    [userId, projectName]
  );

  if (rows.length > 0) {
    const podName = rows[0].POD_NAME;
    console.log("Fetched pod from DB:", podName);

    res.status(200).json({
      message: "success",
      podName:podName
    });
  }else{
   res.status(400).json({ error: 'pod not exist' });
  }
})


// Get list of existing projects for a language
app.post("/api/projects", async(req, res) => {
  try {
    const { userId } = req.body;

    const [rows] = await db.query(
      "SELECT * FROM IDE_PROJECT_TABLE WHERE USER_ID = ?",
      [userId]
    );

    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});



async function getS3FileTree(prefix) {
  const params = {
      Bucket: BUCKET,
      Prefix: prefix.endsWith("/") ? prefix : prefix + "/",
      Delimiter: "/"
    };

    const data = await s3.send(new ListObjectsV2Command(params));

    const tree = [];

    // Add folders
    if (data.CommonPrefixes) {
      data.CommonPrefixes.forEach(folder => {
        tree.push({
          name: folder.Prefix.replace(params.Prefix, "").replace("/", ""),
          type: "folder",
          path: folder.Prefix
        });
      });
    }

    // Add files
    if (data.Contents) {
      data.Contents.forEach(file => {
        if (file.Key !== params.Prefix) {
          tree.push({
            name: file.Key.replace(params.Prefix, ""),
            type: "file",
            path: file.Key
          });
        }
      });
    }

    return tree;
}

// Get S3 file tree
app.get("/api/files", async (req, res) => {
  try {
    const { projectPath } = req.query;
    const prefix = projectPath.endsWith("/") ? projectPath : `${projectPath}/`;

    const tree = await getS3FileTree(prefix);
    res.json(tree);
  } catch (error) {
    console.error("Error fetching S3 file tree:", error);
    res.status(500).json({ error: "Failed to fetch file tree" });
  }
});

// Read file from S3
app.get("/api/file", async (req, res) => {
  try {
    const { projectPath, filePath } = req.query;
    console.log(projectPath, filePath);
    

    if (!projectPath || !filePath) {
      return res.status(400).json({ error: "projectPath and filePath are required" });
    }
    const key = path.join(filePath).replace(/^\/+/, ""); // remove leading slash

    

    const params = {
      Bucket: BUCKET,
      Key: key
    };

    
    const data = await s3.send(new GetObjectCommand(params));
    const fileContent = await data.Body.transformToString();
    console.log(fileContent);
    
    res.send(fileContent);

  } catch (error) {
    console.error("Error reading S3 file:", error);
    res.status(404).json({ error: "File not found" });
  }
});

// Save file to S3
app.put("/api/file", async (req, res) => {
  try {
    const { projectPath, filePath, content } = req.body;
    const key = path.join(filePath).replace(/^\/+/, "");;

    const params = {
      Bucket: BUCKET,
      Key: key,
      Body: content
    };

    await s3.send(new PutObjectCommand(params));
    res.json({ message: "File saved successfully" });
  } catch (error) {
    console.error("Error saving S3 file:", error);
    res.status(500).json({ error: "Failed to save file" });
  }
});


// Updated API to create folder (supports both old and new structure)
app.post("/api/folder", (req, res) => {
  try {
    const { project, projectPath, folderPath } = req.body;
    
    let fullPath;
    if (projectPath && folderPath) {
      // New template system
      fullPath = path.join(BASE_DIR, projectPath, folderPath);
    } else if (project && folderPath) {
      // Old system (backward compatibility)
      fullPath = path.join(PROJECT_DIR, project, folderPath);
    } else {
      return res.status(400).json({ error: 'Required parameters missing' });
    }
    
    fs.mkdirSync(fullPath, { recursive: true });
    res.json({ message: 'Folder created successfully' });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});


server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📁 Workspace directory: ${BASE_DIR}`);
  console.log(`📋 Initial templates: ${INITIAL_SETUP_DIR}`);
  console.log(`✏️  User projects: ${EDITED_VERSION_DIR}`);
});


