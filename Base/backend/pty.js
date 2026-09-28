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

const PORT = 5000;

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

function getFileTree(dir, base = "") {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const relativePath = path.join(base, file).replace(/\\/g, '/');
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results.push({ path: relativePath, isFolder: true });
      results = results.concat(getFileTree(fullPath, relativePath));
    } else {
      results.push({ path: relativePath, isFolder: false });
    }
  });
  return results;
}


console.log(getFileTree("./workspace"))