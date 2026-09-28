import React, { useState } from 'react';
import { X, Plus, Check, Code, Database, Globe, Cpu, Terminal, Package } from 'lucide-react';

const TechStackModal = ({ isOpen, onClose, onAddStack, language, projectName, userId }) => {
  const [selectedTechs, setSelectedTechs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const techStacks = [
    {
      category: 'Frontend',
      icon: <Globe size={20} />,
      color: '#58a6ff',
      technologies: [
        { name: 'React.js', icon: '⚛️', description: 'JavaScript library for building user interfaces' },
        { name: 'Next.js', icon: '▲', description: 'React framework for production' },
        { name: 'Vue.js', icon: '💚', description: 'Progressive JavaScript framework' },
        { name: 'Angular', icon: '🅰️', description: 'Platform for building mobile and desktop apps' },
        { name: 'Svelte', icon: '🧡', description: 'Cybernetically enhanced web apps' },
        { name: 'HTML/CSS', icon: '🎨', description: 'Standard markup and styling languages' }
      ]
    },
    {
      category: 'Backend',
      icon: <Terminal size={20} />,
      color: '#3fb950',
      technologies: [
        { name: 'Node.js', icon: '🟢', description: 'JavaScript runtime built on Chrome V8 engine' },
        { name: 'Express.js', icon: '🚀', description: 'Fast, unopinionated web framework for Node.js' },
        { name: 'Python', icon: '🐍', description: 'High-level programming language' },
        { name: 'Django', icon: '🎯', description: 'High-level Python web framework' },
        { name: 'Flask', icon: '🔥', description: 'Lightweight Python web framework' },
        { name: 'FastAPI', icon: '⚡', description: 'Modern, fast web framework for Python' }
      ]
    },
    {
      category: 'Database',
      icon: <Database size={20} />,
      color: '#f85149',
      technologies: [
        { name: 'MySQL', icon: '🐬', description: 'Open-source relational database' },
        { name: 'PostgreSQL', icon: '🐘', description: 'Advanced open-source relational database' },
        { name: 'MongoDB', icon: '🍃', description: 'NoSQL document database' },
        { name: 'Redis', icon: '🔴', description: 'In-memory data structure store' },
        { name: 'SQLite', icon: '💾', description: 'Lightweight embedded database' },
        { name: 'Firebase', icon: '🔥', description: 'Google cloud database platform' }
      ]
    },
    {
      category: 'Languages',
      icon: <Code size={20} />,
      color: '#ffa657',
      technologies: [
        { name: 'JavaScript', icon: '🟨', description: 'Dynamic programming language' },
        { name: 'TypeScript', icon: '🔷', description: 'Typed superset of JavaScript' },
        { name: 'Python', icon: '🐍', description: 'High-level programming language' },
        { name: 'C++', icon: '⚙️', description: 'General-purpose programming language' },
        { name: 'Java', icon: '☕', description: 'Object-oriented programming language' },
        { name: 'Go', icon: '🐹', description: 'Open source programming language' }
      ]
    },
    {
      category: 'Tools & Services',
      icon: <Package size={20} />,
      color: '#a5a5a5',
      technologies: [
        { name: 'Docker', icon: '🐳', description: 'Containerization platform' },
        { name: 'AWS', icon: '☁️', description: 'Amazon Web Services cloud platform' },
        { name: 'Vercel', icon: '▲', description: 'Deployment and hosting platform' },
        { name: 'Netlify', icon: '🌐', description: 'Web development platform' },
        { name: 'Git', icon: '📝', description: 'Version control system' },
        { name: 'Webpack', icon: '📦', description: 'Module bundler for JavaScript' }
      ]
    }
  ];

  const toggleTech = (tech) => {
    setSelectedTechs(prev => {
      const isSelected = prev.some(t => t.name === tech.name);
      if (isSelected) {
        return prev.filter(t => t.name !== tech.name);
      } else {
        return [...prev, tech];
      }
    });
  };

  const handleCreate = async () => {
    if (selectedTechs.length === 0) {
      alert('Please select at least one technology');
      return;
    }

    setIsLoading(true);
    try {
      await onAddStack(selectedTechs);
      setSelectedTechs([]);
      onClose();
    } catch (error) {
      console.error('Error adding tech stack:', error);
      alert('Failed to add tech stack. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <div className="modal-title">
            <Code size={20} />
            <span>Add Tech Stack</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="project-info">
            <p>Adding technologies to: <strong>{projectName}</strong></p>
            <p>Primary language: <span className="language-badge">{language}</span></p>
          </div>

          <div className="tech-categories">
            {techStacks.map((category) => (
              <div key={category.category} className="category-section">
                <div className="category-header">
                  <div className="category-icon" style={{ color: category.color }}>
                    {category.icon}
                  </div>
                  <h3>{category.category}</h3>
                </div>
                
                <div className="tech-grid">
                  {category.technologies.map((tech) => {
                    const isSelected = selectedTechs.some(t => t.name === tech.name);
                    return (
                      <div
                        key={tech.name}
                        className={`tech-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleTech(tech)}
                      >
                        <div className="tech-card-header">
                          <span className="tech-icon">{tech.icon}</span>
                          <span className="tech-name">{tech.name}</span>
                          {isSelected && (
                            <Check size={16} className="selected-icon" />
                          )}
                        </div>
                        <p className="tech-description">{tech.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {selectedTechs.length > 0 && (
            <div className="selected-summary">
              <h4>Selected Technologies ({selectedTechs.length})</h4>
              <div className="selected-tags">
                {selectedTechs.map((tech) => (
                  <span key={tech.name} className="selected-tag">
                    {tech.icon} {tech.name}
                    <button 
                      className="remove-tag"
                      onClick={() => toggleTech(tech)}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="create-btn" 
            onClick={handleCreate}
            disabled={selectedTechs.length === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <div className="spinner" />
                Adding...
              </>
            ) : (
              <>
                <Plus size={16} />
                Add {selectedTechs.length} Technology{selectedTechs.length !== 1 ? 'ies' : ''}
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .modal-container {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 12px;
          width: 90vw;
          max-width: 800px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease-out;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px 16px;
          border-bottom: 1px solid #21262d;
        }

        .modal-title {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #f0f6fc;
          font-size: 18px;
          font-weight: 600;
        }

        .close-btn {
          background: transparent;
          border: none;
          color: #7d8590;
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: #21262d;
          color: #f0f6fc;
        }

        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 0 24px 20px;
        }

        .project-info {
          background: #161b22;
          border: 1px solid #21262d;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }

        .project-info p {
          margin: 0 0 8px 0;
          color: #8b949e;
          font-size: 14px;
        }

        .project-info p:last-child {
          margin-bottom: 0;
        }

        .project-info strong {
          color: #f0f6fc;
          font-weight: 600;
        }

        .language-badge {
          background: #58a6ff;
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .tech-categories {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .category-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .category-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .category-header h3 {
          margin: 0;
          color: #f0f6fc;
          font-size: 16px;
          font-weight: 600;
        }

        .tech-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 12px;
        }

        .tech-card {
          background: #161b22;
          border: 1px solid #21262d;
          border-radius: 8px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .tech-card:hover {
          border-color: #58a6ff;
          background: #0d1117;
          transform: translateY(-1px);
        }

        .tech-card.selected {
          border-color: #3fb950;
          background: #0d1721;
          box-shadow: 0 0 0 1px #3fb950;
        }

        .tech-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .tech-icon {
          font-size: 16px;
        }

        .tech-name {
          color: #f0f6fc;
          font-weight: 500;
          font-size: 14px;
          flex: 1;
        }

        .selected-icon {
          color: #3fb950;
        }

        .tech-description {
          margin: 0;
          color: #8b949e;
          font-size: 12px;
          line-height: 1.4;
        }

        .selected-summary {
          margin-top: 24px;
          background: #0d1721;
          border: 1px solid #3fb950;
          border-radius: 8px;
          padding: 16px;
        }

        .selected-summary h4 {
          margin: 0 0 12px 0;
          color: #3fb950;
          font-size: 14px;
          font-weight: 600;
        }

        .selected-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .selected-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #3fb950;
          color: white;
          padding: 4px 8px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 500;
        }

        .remove-tag {
          background: transparent;
          border: none;
          color: white;
          cursor: pointer;
          padding: 0;
          margin-left: 4px;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .remove-tag:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px 20px;
          border-top: 1px solid #21262d;
        }

        .cancel-btn {
          background: transparent;
          border: 1px solid #30363d;
          color: #f0f6fc;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .cancel-btn:hover {
          background: #21262d;
          border-color: #8b949e;
        }

        .create-btn {
          background: #3fb950;
          border: 1px solid #3fb950;
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .create-btn:hover:not(:disabled) {
          background: #2ea043;
          border-color: #2ea043;
        }

        .create-btn:disabled {
          background: #21262d;
          border-color: #30363d;
          color: #7d8590;
          cursor: not-allowed;
        }

        .spinner {
          width: 12px;
          height: 12px;
          border: 2px solid #30363d;
          border-top: 2px solid #3fb950;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Custom scrollbar */
        .modal-body::-webkit-scrollbar {
          width: 8px;
        }

        .modal-body::-webkit-scrollbar-track {
          background: #161b22;
          border-radius: 4px;
        }

        .modal-body::-webkit-scrollbar-thumb {
          background: #30363d;
          border-radius: 4px;
        }

        .modal-body::-webkit-scrollbar-thumb:hover {
          background: #484f58;
        }
      `}</style>
    </div>
  );
};

export default TechStackModal;