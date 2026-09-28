import React, { useState, useEffect } from "react";
import FileTree from "./components/FileTree";
import CodeEditor from "./components/CodeEditor";
import Terminal from "./components/Terminal";
import io from "socket.io-client";
import { useParams, useNavigate } from 'react-router-dom';
import { projectApi } from './api';
import { useAuth } from './context/AuthContext';
import "./App.css";
import TerminalController from './components/TerminalController';
import AIAssistant from './components/AIAssistant';

import Output from './components/Output';
import { 
  Code, 
  GitBranch, 
  Settings,
  Terminal as TerminalIcon,
  Database,
  Monitor
} from "lucide-react"
import XTerminal from "./components/XTerminal";
import MySQLTerminal from "./components/DBTerminal"



const socket = io("http://localhost:5000");

function Main() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [activeRightTab, setActiveRightTab] = useState("terminal"); // New state for active tab
  const [project, setProject] = useState(null);
  const [loadError, setLoadError] = useState('');
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const userId = user?.id;
  const language = project?.language;
  const projectName = project?.name;

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const loadProject = async () => {
    try {
      const p = await projectApi.get(projectId);
      setProject(p);
    } catch (error) {
      console.error('Error loading project:', error);
      setLoadError('Could not load this project.');
    }
  };

  if (loadError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d1117', color: '#e6edf3', gap: 12 }}>
        <p>{loadError}</p>
        <button onClick={() => navigate(-1)} style={{ background: '#238636', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}>Go back</button>
      </div>
    );
  }

  const renderActiveTabContent = () => {
  return (
    <div className="tab-content-container" style={{height:"80%"}} >
      {/* Always render all terminals, but hide inactive ones */}
      {/* <div 
        className="terminal-container" 
        style={{ display: activeRightTab === "terminal" ? "block" : "none" }}
      >
        <XTerminal socket={socket} userId={userId} projectName={projectName}  />;
      </div> */}
      <AIAssistant userId={userId} projectName={projectName} language={language}/>
      
      <div 
        className="terminal-container" 
        style={{ display: activeRightTab === "sqlterminal" ? "block" : "none" }}
      >
        <MySQLTerminal socket={socket} userId={userId} projectName={projectName} />
      </div>
      
      <div 
        className="terminal-container" 
        style={{ display: activeRightTab === "output" ? "block" : "none" , height:"100%"}}
      >
         <Output userId={userId} projectName={projectName} refreshKey={refreshKey} />
      </div>
    </div>
  );
};

  return (
    <div className="modern-ide">
      {/* Top Header */}
      <div className="ide-header">
        <div className="header-left">
          <div className="logo">
            <Code size={20} className="logo-icon" />
            <span className="logo-text">IDE</span>
          </div>
          <div className="project-info">
            <span className="project-name">{projectName}</span>
            <span className="project-type">{language}</span>
          </div>
        </div>
        <div className="header-right">
          <button className="header-btn">
            <GitBranch size={16} />
            main
          </button>
          <button className="header-btn">
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ide-content">
        {/* Left Sidebar - File Explorer */}
        <div className="sidebar">
          <FileTree
            projectId={projectId}
            setSelectedFile={setSelectedFile}
            setFileContent={setFileContent}
          />
        </div>

        {/* Center - Code Editor */}
        <div className="main-editor">
          <CodeEditor
            projectId={projectId}
            selectedFile={selectedFile}
            fileContent={fileContent}
            setFileContent={setFileContent}
            onFileSave={() => setRefreshKey(prev => prev + 1)}
          />
        </div>

        {/* Right Panel - Tabbed Interface */}
        <div className="right-panel">
          {/* Tab Navigation */}
          <div className="panel-header">
            <div className="panel-tabs">
              <button
                className={`panel-tab ${activeRightTab === "terminal" ? "active" : ""}`}
                onClick={() => setActiveRightTab("terminal")}
              >
                <TerminalIcon size={14} />
                Terminal
              </button>
              <button
                className={`panel-tab ${activeRightTab === "sqlterminal" ? "active" : ""}`}
                onClick={() => setActiveRightTab("sqlterminal")}
              >
                <Database size={14} />
                SQL Terminal
              </button>
              <button
                className={`panel-tab ${activeRightTab === "output" ? "active" : ""}`}
                onClick={() => setActiveRightTab("output")}
              >
                <Monitor size={14} />
                Output
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="panel-content">
            {renderActiveTabContent()}
          </div>
        </div>
      </div>

      <style jsx>{`
        .modern-ide {
          height: 100vh;
          background: #0d1117;
          color: #e6edf3;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .ide-header {
          height: 48px;
          background: #010409;
          border-bottom: 1px solid #21262d;
          display: flex;
          align-items: center;
          padding: 0 16px;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
        }

        .logo-icon {
          color: #58a6ff;
        }

        .project-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .project-name {
          font-weight: 600;
          color: #f0f6fc;
        }

        .project-type {
          font-size: 12px;
          color: #7d8590;
          background: #21262d;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-btn {
          background: transparent;
          border: 1px solid #30363d;
          color: #f0f6fc;
          padding: 6px 12px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .header-btn:hover {
          background: #21262d;
          border-color: #58a6ff;
        }

        .ide-content {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .sidebar {
          width: 280px;
          background: #0d1117;
          border-right: 1px solid #21262d;
          flex-shrink: 0;
        }

        .main-editor {
          flex: 1;
          background: #0d1117;
          border-right: 1px solid #21262d;
        }

        .right-panel {
          width: 600px;
          display: flex;
          flex-direction: column;
          background: #0d1117;
        }

        .panel-header {
          height: 48px;
          background: #161b22;
          border-bottom: 1px solid #21262d;
          display: flex;
          align-items: center;
          padding: 0;
          flex-shrink: 0;
        }

        .panel-tabs {
          display: flex;
          align-items: center;
          height: 100%;
          width: 100%;
        }

        .panel-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 16px;
          height: 100%;
          background: transparent;
          border: none;
          color: #7d8590;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          border-bottom: 2px solid transparent;
          white-space: nowrap;
        }

        .panel-tab:hover {
          background: #21262d;
          color: #e6edf3;
        }

        .panel-tab.active {
          color: #58a6ff;
          border-bottom-color: #58a6ff;
          background: #0d1117;
        }

        .panel-content {
          flex: 1;
          overflow: hidden;
          background: #0d1117;
        }

        .panel-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #f0f6fc;
        }

        .panel-icon {
          color: #7d8590;
        }

        .panel-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .panel-action-btn {
          background: transparent;
          border: none;
          color: #7d8590;
          padding: 4px;
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
        }

        .panel-action-btn:hover {
          background: #21262d;
          color: #f0f6fc;
        }

        /* File Tree Styles */
        .file-tree-panel {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .file-tree-content {
          flex: 1;
          overflow-y: auto;
          padding: 8px 0;
        }

        .tree-item {
          display: flex;
          align-items: center;
          height: 28px;
          cursor: pointer;
          transition: background-color 0.2s;
          border-radius: 4px;
          margin: 1px 8px;
        }

        .tree-item:hover {
          background: #21262d;
        }

        .tree-item-content {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
        }

        .tree-icon {
          color: #7d8590;
          flex-shrink: 0;
        }

        .tree-item-name {
          font-size: 13px;
          color: #e6edf3;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Code Editor Styles */
        .code-editor-panel {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .editor-tabs {
          display: flex;
          align-items: center;
          flex: 1;
          overflow-x: auto;
        }

        .editor-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #161b22;
          border-right: 1px solid #21262d;
          cursor: pointer;
          font-size: 13px;
          color: #7d8590;
          border: none;
          height: 40px;
          min-width: 120px;
          justify-content: space-between;
        }

        .editor-tab.active {
          background: #0d1117;
          color: #f0f6fc;
        }

        .tab-icon {
          color: #7d8590;
        }

        .tab-name {
          flex: 1;
          text-align: left;
        }

        .tab-close {
          background: transparent;
          border: none;
          color: #7d8590;
          cursor: pointer;
          padding: 2px;
          border-radius: 2px;
          opacity: 0;
          transition: all 0.2s;
        }

        .editor-tab:hover .tab-close {
          opacity: 1;
        }

        .tab-close:hover {
          background: #21262d;
          color: #f0f6fc;
        }

        .editor-content {
          flex: 1;
          display: flex;
          background: #0d1117;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        }

        .line-numbers {
          width: 50px;
          background: #0d1117;
          border-right: 1px solid #21262d;
          padding: 16px 8px;
          font-size: 12px;
          color: #7d8590;
          text-align: right;
          line-height: 20px;
          user-select: none;
        }

        .code-textarea {
          flex: 1;
          background: transparent;
          border: none;
          color: #e6edf3;
          font-size: 14px;
          font-family: inherit;
          line-height: 20px;
          padding: 16px;
          resize: none;
          outline: none;
          white-space: pre;
          overflow-wrap: normal;
          overflow-x: scroll;
        }

        .code-textarea::placeholder {
          color: #7d8590;
        }

        /* Terminal Styles */
        .terminal-panel {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .terminal-content {
          flex: 1;
          background: #0d1117;
          padding: 12px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
          display: flex;
          flex-direction: column;
        }

        .terminal-output {
          flex: 1;
          overflow-y: auto;
        }

        .terminal-line {
          color: #e6edf3;
          font-size: 13px;
          line-height: 18px;
          margin-bottom: 2px;
        }

        .terminal-input-line {
          display: flex;
          align-items: center;
          margin-top: 8px;
        }

        .terminal-prompt {
          color: #58a6ff;
          font-weight: 600;
          margin-right: 8px;
        }

        .terminal-input {
          flex: 1;
          background: transparent;
          border: none;
          color: #e6edf3;
          font-family: inherit;
          font-size: 13px;
          outline: none;
        }

        .terminal-input::placeholder {
          color: #7d8590;
        }

        /* Scrollbar Styles */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #0d1117;
        }

        ::-webkit-scrollbar-thumb {
          background: #30363d;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #484f58;
        }

        /* Responsive Design */
        @media (max-width: 1200px) {
          .sidebar {
            width: 240px;
          }
          .right-panel {
            width: 450px;
          }
        }

        @media (max-width: 768px) {
          .sidebar {
            width: 200px;
          }
          .right-panel {
            width: 350px;
          }
          .project-info {
            display: none;
          }
          .panel-tab {
            padding: 0 12px;
            font-size: 12px;
          }

        }
          .tab-content {
  flex: 1;
  overflow: hidden;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.panel-content {
  flex: 1;
  overflow: hidden;
  background: #0d1117;
  display: flex;
  flex-direction: column;
}
  .terminal-container{
  height:100%}

      `}</style>
    </div>
  );
}

export default Main;