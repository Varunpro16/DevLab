import React, { useState } from 'react';
import { 
  Globe, 
  Code, 
  Play, 
  ExternalLink, 
  RefreshCw 
} from "lucide-react";

// Fixed Output component - removed duplicate header/tabs
const Output = ({ userId, projectName, refreshKey }) => {
  const [activeTab, setActiveTab] = useState('browser');
  const INSTANCE_URI = `http://${projectName}-${userId}.172.17.0.4.nip.io/`;
  const [iframeKey, setIframeKey] = useState(0);

  return (
    <>
      {/* Secondary tabs for Browser/Console within Output */}
      <div className="output-subtabs">
        <button 
          className={`output-subtab ${activeTab === 'browser' ? 'active' : ''}`}
          onClick={() => setActiveTab('browser')}
        >
          <Globe size={14} />
          Browser
        </button>
        <button 
          className={`output-subtab ${activeTab === 'console' ? 'active' : ''}`}
          onClick={() => setActiveTab('console')}
        >
          <Code size={14} />
          Console
        </button>
        <div className="output-actions">
          <button className="run-button">
            <Play size={14} />
            Run
          </button>
          <button 
            className="icon-button"
            onClick={() => window.open(INSTANCE_URI, '_blank')}
            title="Open in new tab"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="output-display">
        {activeTab === 'browser' ? (
          <div className="browser-preview">
            <div className="browser-bar">
              <div className="browser-controls">
                <div className="browser-dot red"></div>
                <div className="browser-dot yellow"></div>
                <div className="browser-dot green"></div>
              </div>
              <div className="browser-url">{INSTANCE_URI}</div>
              <button 
                className="browser-refresh"
                onClick={() => setIframeKey(prev => prev + 1)}
                title="Refresh preview"
              >
                <RefreshCw size={14} />
              </button>
            </div>
            
            <iframe
              key={iframeKey}
              className="preview-iframe"
              src={INSTANCE_URI}
              title="Preview"
            />
          </div>
        ) : (
          <div className="console-output">
            <div className="console-line">✓ Compiled successfully!</div>
            <div className="console-line">Local: http://localhost:3000</div>
            <div className="console-line">Network: {INSTANCE_URI}</div>
          </div>
        )}
      </div>

      <style jsx>{`
        .output-subtabs {
          height: 40px;
          background: #161b22;
          border-bottom: 1px solid #21262d;
          display: flex;
          align-items: center;
          padding: 0 12px;
          gap: 4px;
        }

        .output-subtab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: transparent;
          border: none;
          color: #7d8590;
          font-size: 12px;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .output-subtab:hover {
          background: #21262d;
          color: #e6edf3;
        }

        .output-subtab.active {
          background: #238636;
          color: white;
        }

        .output-actions {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .run-button {
          background: #238636;
          border: none;
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: background-color 0.2s;
        }

        .run-button:hover {
          background: #2ea043;
        }

        .icon-button {
          background: transparent;
          border: 1px solid #30363d;
          color: #7d8590;
          padding: 6px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: all 0.2s;
        }

        .icon-button:hover {
          background: #21262d;
          color: #f0f6fc;
          border-color: #58a6ff;
        }

        .output-display {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background: #0d1117;
          height:100%;
        }

        .browser-preview {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .browser-bar {
          height: 36px;
          background: #161b22;
          border-bottom: 1px solid #21262d;
          display: flex;
          align-items: center;
          padding: 0 12px;
          gap: 12px;
          flex-shrink: 0;
        }

        .browser-controls {
          display: flex;
          gap: 6px;
        }

        .browser-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .red { background: #ff5f56; }
        .yellow { background: #ffbd2e; }
        .green { background: #27ca3f; }

        .browser-url {
          flex: 1;
          background: #21262d;
          border: 1px solid #30363d;
          border-radius: 4px;
          padding: 6px 10px;
          font-size: 11px;
          color: #7d8590;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family: 'SF Mono', Monaco, monospace;
        }

        .browser-refresh {
          background: transparent;
          border: none;
          color: #7d8590;
          cursor: pointer;
          padding: 4px;
          border-radius: 3px;
          display: flex;
          align-items: center;
          transition: all 0.2s;
        }

        .browser-refresh:hover {
          background: #21262d;
          color: #f0f6fc;
        }

        .preview-iframe {
          flex: 1;
          border: none;
          background: white;
          width: 100%;
          height: 100%;
        }

        .console-output {
          padding: 16px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
          font-size: 13px;
          line-height: 20px;
          overflow-y: auto;
        }

        .console-line {
          color: #7d8590;
          margin-bottom: 4px;
        }

        .console-line:first-child {
          color: #3fb950;
        }
      `}</style>
    </>
  );
};

export default Output;

// import React, { useState } from 'react';
// import { 
//   Globe, 
//   Code, 
//   Play, 
//   ExternalLink, 
//   RefreshCw 
// } from "lucide-react";
// // Enhanced Output component
// const Output = ({ userId, projectName }) => {
//   const [activeTab, setActiveTab] = useState('browser');
//   const [refreshKey, setRefreshKey] = useState(0);
//   const INSTANCE_URI = `http://${projectName}-${userId}.172.17.0.4.nip.io/`;

//   return (
//     <div className="output-panel">
//       <div className="panel-header">
//         <div className="output-tabs">
//           <button 
//             className={`output-tab ${activeTab === 'browser' ? 'active' : ''}`}
//             onClick={() => setActiveTab('browser')}
//           >
//             <Globe size={14} />
//             Browser
//           </button>
//           <button 
//             className={`output-tab ${activeTab === 'console' ? 'active' : ''}`}
//             onClick={() => setActiveTab('console')}
//           >
//             <Code size={14} />
//             Console
//           </button>
//         </div>
//         <div className="panel-actions">
//           <button className="run-button">
//             <Play size={14} />
//             Run
//           </button>
//           <button className="panel-action-btn">
//             <ExternalLink size={14} />
//           </button>
//         </div>
//       </div>
//       <div className="output-content">
//         {activeTab === 'browser' ? (
//           <div className="browser-preview">
//             <div className="browser-bar">
//               <div className="browser-controls">
//                 <div className="browser-dot red"></div>
//                 <div className="browser-dot yellow"></div>
//                 <div className="browser-dot green"></div>
//               </div>
//               <div className="browser-url">{INSTANCE_URI}</div>
//               <button className="browser-refresh">
//                   <RefreshCw size={14} onClick={() => setRefreshKey((prev) => !prev)}/>
//               </button>
//             </div>
            
//             <iframe
//               key={refreshKey} // ⬅️ this causes iframe to reload on key change
//               className="preview-iframe"
//               src={INSTANCE_URI}
//               title="Preview"
//             />
//           </div>
//         ) : (
//           <div className="console-output">
//             <div className="console-line">✓ Compiled successfully!</div>
//             <div className="console-line">Local: http://localhost:3000</div>
//             <div className="console-line">Network: {INSTANCE_URI}</div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Output;


