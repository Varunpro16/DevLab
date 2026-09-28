// components/XTerminal.js
import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { 
  Terminal as TerminalIcon, 
  Square, 
  Maximize2,
  RefreshCw 
} from "lucide-react";
import axios from 'axios';

const XTerminal = ({ socket, userId, projectName }) => {
  const terminalRef = useRef(null);
  const terminal = useRef(null);
  const fitAddon = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTerminalReady, setIsTerminalReady] = useState(false);
  const [podName,setPodName]=useState(null);

  useEffect(() => {
    if (!socket) {
      console.error('Socket not provided to XTerminal');
      return;
    }

    // Define createTerminalSession function FIRST
    const createTerminalSession = async () => {

      const response = await axios.post("http://localhost:5000/api/getPodName",{
        userId,projectName
      })
      if(response.status===200){
        console.log("200 success",response.data.podName);
        
        setPodName(response.data.podName);
      }
      if (socket.connected && terminal.current && terminal.current._core) {
        console.log({
          cols: terminal.current.cols || 80,
          rows: terminal.current.rows || 24,
          userId:userId,
          projectName:projectName,
          podName:response.data.podName
        });
        
        socket.emit('create-terminal', {
          cols: terminal.current.cols || 80,
          rows: terminal.current.rows || 24,
          userId:userId,
          projectName:projectName,
          podName:response.data.podName
        });
      }
    };

    // Initialize terminal
    terminal.current = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#0d1117',
        foreground: '#e6edf3',
        cursor: '#58a6ff',
        selection: '#58a6ff40',
        black: '#484f58',
        red: '#ff7b72',
        green: '#7ee787',
        yellow: '#f2cc60',
        blue: '#79c0ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#b1bac4',
        brightBlack: '#6e7681',
        brightRed: '#ffa198',
        brightGreen: '#56d364',
        brightYellow: '#e3b341',
        brightBlue: '#58a6ff',
        brightMagenta: '#bc8cff',
        brightCyan: '#39c5cf',
        brightWhite: '#f0f6fc'
      },
      fontSize: 13,
      fontFamily: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
      rows: 25,
      cols: 80,
      lineHeight: 1.2
    });

    // Initialize addons
    fitAddon.current = new FitAddon();
    terminal.current.loadAddon(fitAddon.current);
    terminal.current.loadAddon(new WebLinksAddon());

    // Open terminal in DOM with proper timing
    if (terminalRef.current) {
      terminal.current.open(terminalRef.current);
      
      // Wait for terminal to be fully rendered before fitting
      setTimeout(() => {
        if (fitAddon.current && terminal.current._core) {
          try {
            fitAddon.current.fit();
          } catch (error) {
            console.warn('Initial fit failed, retrying...', error);
            setTimeout(() => {
              try {
                fitAddon.current.fit();
              } catch (retryError) {
                console.error('Fit retry failed:', retryError);
              }
            }, 100);
          }
        }
        setIsTerminalReady(true);
        
        // Check if socket is already connected after terminal is ready
        if (socket.connected) {
          setIsConnected(true);
          createTerminalSession();
        }
      }, 50);
    }

    // Socket event listeners
    const handleConnect = () => {
      console.log('Terminal: Connected to server');
      setIsConnected(true);
      createTerminalSession();
    };

    const handleDisconnect = () => {
      console.log('Terminal: Disconnected from server');
      setIsConnected(false);
      if (terminal.current) {
        terminal.current.writeln('\r\n\x1b[31mConnection lost. Reconnecting...\x1b[0m');
      }
    };

    const handleTerminalCreated = () => {
      console.log('Terminal: Session created');
      if (terminal.current) {
        terminal.current.writeln('\x1b[32mTerminal session established.\x1b[0m');
      }
    };

    const handleTerminalOutput = (data) => {
      if (terminal.current) {
        terminal.current.write(data);
      }
    };

    const handleTerminalExit = (code) => {
      if (terminal.current) {
        terminal.current.writeln(`\r\n\x1b[33mTerminal exited with code: ${code}\x1b[0m`);
        terminal.current.writeln('\x1b[36mReconnecting...\x1b[0m');
        // Auto-reconnect after 2 seconds
        setTimeout(() => {
          if (socket.connected) {
            createTerminalSession();
          }
        }, 2000);
      }
    };

    // Add event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('terminal-created', handleTerminalCreated);
    socket.on('terminal-output', handleTerminalOutput);
    socket.on('terminal-exit', handleTerminalExit);

    // Handle terminal input
    const handleTerminalData = (data) => {
      if (socket.connected) {
        socket.emit('terminal-input', data);
      }
    };

    if (terminal.current) {
      terminal.current.onData(handleTerminalData);
    }

    // Handle window resize with better error handling
    const handleResize = () => {
      if (fitAddon.current && terminal.current && terminal.current._core) {
        setTimeout(() => {
          try {
            fitAddon.current.fit();
            if (socket.connected) {
              socket.emit('terminal-resize', {
                cols: terminal.current.cols,
                rows: terminal.current.rows
              });
            }
          } catch (error) {
            console.warn('Resize fit failed:', error);
          }
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      
      // Remove socket event listeners
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('terminal-created', handleTerminalCreated);
      socket.off('terminal-output', handleTerminalOutput);
      socket.off('terminal-exit', handleTerminalExit);
      
      if (terminal.current) {
        terminal.current.dispose();
      }
    };
  }, [socket]);

  const clearTerminal = () => {
    if (terminal.current) {
      terminal.current.clear();
    }
  };

  const fitTerminal = () => {
    if (fitAddon.current && terminal.current && terminal.current._core) {
      try {
        fitAddon.current.fit();
        if (socket && socket.connected) {
          socket.emit('terminal-resize', {
            cols: terminal.current.cols,
            rows: terminal.current.rows
          });
        }
      } catch (error) {
        console.warn('Manual fit failed:', error);
      }
    }
  };

  const restartTerminal = () => {
    if (socket && socket.connected && terminal.current && terminal.current._core) {
      terminal.current.clear();
      socket.emit('create-terminal', {
        cols: terminal.current.cols || 80,
        rows: terminal.current.rows || 24
      });
    }
  };

  return (
    <div className="terminal-panel">
      {/* Terminal Header */}
      <div className="panel-header">
        <div className="panel-title">
          <TerminalIcon size={14} className="panel-icon" />
          Terminal
          <div className="connection-status">
            <div 
              className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}
              title={isConnected ? 'Connected' : 'Disconnected'}
            />
          </div>
        </div>
        <div className="panel-actions">
          <button 
            className="panel-action-btn" 
            onClick={clearTerminal}
            title="Clear terminal"
          >
            <Square size={12} />
          </button>
          <button 
            className="panel-action-btn" 
            onClick={fitTerminal}
            title="Fit terminal"
          >
            <Maximize2 size={12} />
          </button>
          <button 
            className="panel-action-btn" 
            onClick={restartTerminal}
            title="Restart terminal"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="terminal-content">
        <div 
          ref={terminalRef} 
          className="xterm-container"
        />
        {!isTerminalReady && (
          <div className="terminal-loading">
            <div className="loading-spinner" />
            <span>Initializing terminal...</span>
          </div>
        )}
      </div>

      <style jsx>{`
        .terminal-panel {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #0d1117;
        }

        .panel-header {
          height: 40px;
          background: #161b22;
          border-bottom: 1px solid #21262d;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px;
          flex-shrink: 0;
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

        .connection-status {
          margin-left: 8px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .status-dot.connected {
          background: #7ee787;
          box-shadow: 0 0 6px #7ee787;
        }

        .status-dot.disconnected {
          background: #f85149;
          box-shadow: 0 0 6px #f85149;
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

        .terminal-content {
          flex: 1;
          position: relative;
          background: #0d1117;
        }

        .xterm-container {
          height: 100%;
          width: 100%;
        }

        .terminal-loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          gap: 12px;
          color: #7d8590;
          font-size: 14px;
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #21262d;
          border-top-color: #58a6ff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* XTerm specific styles */
        :global(.xterm) {
          height: 100% !important;
          width: 100% !important;
        }

        :global(.xterm .xterm-viewport) {
          overflow-y: auto;
        }

        :global(.xterm .xterm-screen) {
          height: 100%;
        }

        :global(.xterm .xterm-helper-textarea) {
          position: absolute;
          opacity: 0;
          left: -9999em;
          top: 0;
          width: 0;
          height: 0;
          z-index: -10;
          white-space: nowrap;
          overflow: hidden;
          resize: none;
        }
      `}</style>
    </div>
  );
};

export default XTerminal;





