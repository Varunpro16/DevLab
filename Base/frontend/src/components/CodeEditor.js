
import React from "react";
import Editor from "@monaco-editor/react";
import { fileApi } from "../api";

const CodeEditor = ({ projectId, selectedFile, fileContent, setFileContent, onFileSave }) => {
  const handleSave = async () => {
    if (!selectedFile || !projectId) return;
    
    try {
      await fileApi.write(projectId, selectedFile, fileContent);
      onFileSave && onFileSave();
    } catch (error) {
      console.error('Error saving file:', error);
      alert("Error saving file");
    }
  };

  const getLanguageFromFile = (filename) => {
    if (!filename) return "javascript";
    
    const extension = filename.split('.').pop().toLowerCase();
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'cpp': 'cpp',
      'c': 'c',
      'h': 'c',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown'
    };
    
    return languageMap[extension] || 'javascript';
  };

  return (
    <div className="editor-container">
      <div className="toolbar" style={{ 
        padding: "10px", 
        borderBottom: "1px solid #ccc",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <span>{selectedFile || "No file selected"}</span>
        <button 
          onClick={handleSave}
          disabled={!selectedFile}
          style={{
            padding: "5px 15px",
            backgroundColor: selectedFile ? "#007acc" : "#ccc",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: selectedFile ? "pointer" : "not-allowed"
          }}
        >
          Save
        </button>
      </div>
      <Editor
        height="90vh"
        language={getLanguageFromFile(selectedFile)}
        theme="vs-dark"
        value={fileContent}
        onChange={(value) => setFileContent(value || "")}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: "on"
        }}
      />
    </div>
  );
};

export default CodeEditor;
