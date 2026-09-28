// s3.js
const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, CopyObjectCommand } =
  require("@aws-sdk/client-s3");
const { Readable } = require("stream");
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

const pty = require('node-pty');
const app = express();
app.use(express.json());
app.use(bodyParser.json()); // optional, but fine
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const k8sApi = kc.makeApiClient(k8s.AppsV1Api);
const coreApi = kc.makeApiClient(k8s.CoreV1Api);
const networkingApi = kc.makeApiClient(k8s.NetworkingV1Api);



const PORT = 5000;

const REGION = "us-east-1"; // change region
const BUCKET = "replit-bucket-saiivarun-2025"; // single bucket

const s3 = new S3Client({ region: REGION });

async function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}
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

    if (!projectPath || !filePath) {
      return res.status(400).json({ error: "projectPath and filePath are required" });
    }
    const key = path.join(projectPath, filePath).replace(/^\/+/, ""); // remove leading slash

    

    const params = {
      Bucket: BUCKET,
      Key: key
    };

    
    const data = await s3.send(new GetObjectCommand(params));
    const fileContent = await data.Body.transformToString();
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
    const key = `${projectPath}/${filePath}`;

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
const createPod = async (template, projectName, userId) => {
  console.log("called");
  
  if (  !template || !projectName) {
    return ;
  }

  console.log("hello user: ", userId)

  const projectId = `${projectName}`.toLowerCase();
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
                    imagePullPolicy: "IfNotPresent",
                    command: ["sh", "-c"],
                    args: [
                        `aws s3 cp s3://replit-bucket-saiivarun-2025/projects/${userId}/${projectName}/ /app --recursive`,
                        `while true; do
                          aws s3 sync /app s3://replit-bucket-saiivarun-2025/projects/${userId}/${projectName} --exclude "node_modules/*";
                          sleep 5;
                         done`
                    ],
                    env: [
                      { name: "", value: "" },
                      { name: "AWS_SECRET_ACCESS_KEY", value: "" },
                      { name: "AWS_DEFAULT_REGION", value: "us-east-1" }
                    ],
                    volumeMounts: [{ name: "user-code", mountPath:mPath }]
                    }],
                    containers: [{
                      name: `${projectId}-container`,
                      image: "node:18",
                      command: ["sh", "-c"],
                      args: [
                        "cd /app && npm install && npm start"
                      ],
                      ports: [{ containerPort }],
                      volumeMounts: [{ name: "user-code", mountPath: mPath }]
                    }],

                    volumes: [{ name: "user-code", emptyDir: {} }]
                }
            }
        }
    };


    await k8sApi.createNamespacedDeployment({namespace:'default', body:deploymentManifest});
    

    // 2. Create Service
    const serviceManifest = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: { name: `${projectId}-service` },
      spec: {
        selector: { app: projectId },
        ports: [{ port: 80, targetPort: containerPort }],
        type: 'ClusterIP'
      }
    };

    await coreApi.createNamespacedService({namespace:'default', body:serviceManifest});


    // 3. Create Ingress
    const ingressManifest = {
      apiVersion: 'networking.k8s.io/v1',
      kind: 'Ingress',
      metadata: {
        name: `${projectId}-ingress`,
        annotations: {
          'nginx.ingress.kubernetes.io/rewrite-target': '/',
        }
      },
      spec: {
        rules: [{
          host: `${projectId}-${userId}.192.168.49.2.nip.io`, // You must set DNS or /etc/hosts
          http: {
            paths: [{
              path: '/',
              pathType: 'Prefix',
              backend: {
                service: {
                  name: `${projectId}-service`,
                  port: { number: 80 }
                }
              }
            }]
          }
        }]
      }
    };

    await networkingApi.createNamespacedIngress({namespace:'default',body: ingressManifest});

    console.log({
      message: 'Environment created successfully',
      url: `${projectId}-${userId}.192.168.49.2.nip.io`
    });

  } catch (error) {
    console.error('K8s Creation Error:', error.body || error);
    console.log({ error: 'Failed to create environment' });
    return null;
  }
  return ;
}

app.post("/api/project/create", async (req, res) => {
  try {
    const { language, projectName, userId } = req.body;
    createPod(language, projectName, userId) 
    
    if (!language || !projectName) {
      return res.status(400).json({ error: "Language and project name are required" });
    }

    const templatePrefix = `initialsetup/${language}/`;
    const projectPrefix = `projects/${userId}/${projectName}/`;

    // Check if project already exists
    const existing = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: projectPrefix,
      MaxKeys: 1
    }));
    if (existing.Contents && existing.Contents.length > 0) {
      return res.json({ error: "Project already exists" });
    }

    // List template files
    const templateFiles = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: templatePrefix
    }));
    if (!templateFiles.Contents || templateFiles.Contents.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }

    // Copy files template → project
    for (const file of templateFiles.Contents) {
      const key = file.Key;
      if (!key.endsWith("/")) {
        const destKey = key.replace(templatePrefix, projectPrefix);
        await s3.send(new CopyObjectCommand({
          CopySource: `${BUCKET}/${key}`,
          Bucket: BUCKET,
          Key: destKey
        }));
      }
    }

    

    res.json({
      message: "Project created successfully in S3",
      projectPath: `projects/${userId}/${projectName}/`
    });

  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Failed to create project" });
  }
});

app.listen(PORT)

