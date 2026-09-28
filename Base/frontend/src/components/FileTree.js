import React, { useState, useEffect } from "react";
import { File, Folder, FolderOpen, Search } from "lucide-react";
import { fileApi } from "../api";

const FileTree = ({ projectId, setSelectedFile, setFileContent }) => {
  const [tree, setTree] = useState({});  // Changed to object to store by path
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState({});

  // Fetch the file tree for a specific relative path ("" = project root)
  const fetchTree = async (relPath) => {
    try {
      setLoading(prev => ({ ...prev, [relPath]: true }));

      const items = await fileApi.tree(projectId, relPath);

      // Store items by their parent path
      setTree(prev => ({
        ...prev,
        [relPath]: items
      }));
    } catch (error) {
      console.error("Error fetching tree:", error);
    } finally {
      setLoading(prev => ({ ...prev, [relPath]: false }));
    }
  };

  // Initial fetch
  useEffect(() => {
    if (projectId) {
      fetchTree("");
    }
  }, [projectId]);

  // Handle click on a folder or file
  const handleClick = async (item) => {
    if (item.type === "folder") {
      const isCurrentlyExpanded = expanded[item.path];
      
      // Toggle expansion
      setExpanded(prev => ({ ...prev, [item.path]: !isCurrentlyExpanded }));
      
      // Fetch folder contents if not already fetched and we're expanding
      if (!isCurrentlyExpanded && !tree[item.path]) {
        await fetchTree(item.path);
      }
    } else {
      setSelectedFile(item.path);
      try {
        const content = await fileApi.read(projectId, item.path);
        setFileContent(content);
      } catch (error) {
        console.error("Error fetching file:", error);
        setFileContent("");
      }
    }
  };

  // Recursive rendering of the tree
  const renderTree = (parentPath, depth = 0) => {
    const items = tree[parentPath] || [];
    
    if (loading[parentPath] && items.length === 0) {
      return (
        <div style={{ paddingLeft: `${depth * 16 + 12}px`, color: '#888' }}>
          Loading...
        </div>
      );
    }
    
    return items.map(item => {
      const isFolder = item.type === "folder";
      const isExpanded = expanded[item.path];
      
      return (
        <div key={item.path}>
          <div
            className="tree-item"
            onClick={(e) => {
              e.stopPropagation();
              handleClick(item);
            }}
            style={{ paddingLeft: `${depth * 16 + 12}px` }}
          >
            <div className="tree-item-content">
              {isFolder ? (
                isExpanded ? 
                  <FolderOpen size={16} className="tree-icon" /> : 
                  <Folder size={16} className="tree-icon" />
              ) : (
                <File size={16} className="tree-icon" />
              )}
              <span className="tree-item-name">{item.name}</span>
            </div>
          </div>
          {isFolder && isExpanded && renderTree(item.path, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="file-tree-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Search size={16} className="panel-icon" />
          <span>Explorer</span>
        </div>
      </div>
      <div className="file-tree-content">
        {tree[""] && tree[""].length > 0 ? (
          renderTree("")
        ) : loading[""] ? (
          <div style={{padding: '12px', color: '#888'}}>Loading...</div>
        ) : (
          <div style={{padding: '12px', color: '#888'}}>No files found</div>
        )}
      </div>
    </div>
  );
};

export default FileTree;