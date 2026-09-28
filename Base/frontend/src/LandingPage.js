import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const [selectedLang, setSelectedLang] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate()

  const userId = "saii112";

  // Mock navigation function - replace with your routing logic
  const navigateToMain = (state) => {
    console.log('Navigating to main with state:', state);
    // For demo purposes, you can replace this with your actual navigation
    navigate('/main', { state });
  };

  useEffect(() => {
    fetchProjects();
  }, []);

   const fetchProjects = async () => {
    try {
      

      const res = await axios.post("http://localhost:5000/api/projects",{
        userId
      })
      
      setTimeout(() => {
        setProjects(res.data);
        console.log(res.data);
        
        setLoading(false);
      }, 800);
      
    } catch (error) {
      console.error('Error fetching projects:', error);
      setLoading(false);
    }
  };

  const handleProjectClick = (project) => {
    navigateToMain({ 
      language: project.ENVIRONMENT,
      projectName: project.PROJECT_NAME,
      isNew: false,
      userId:userId
    });
  };

  const handleCreateNew = async () => {
    if (selectedLang && projectName.trim()) {

      try{
        const res = await axios.post("http://localhost:5000/api/project/create",{
          language:selectedLang, projectName, userId
        })
        if(res.status === 200){
          console.log("lang: ",selectedLang);
          navigateToMain({ 
            language: selectedLang,
            projectName: projectName.trim(),
            isNew: true,
            userId:userId
          });
          setShowCreateForm(false);
          setSelectedLang('');
          setProjectName('');
        }
      }catch(err){
        
      }
     
    }
  };

  const getLanguageColor = (language) => {
    const colors = {
      'Python': '#3776ab',
      'React': '#61dafb',
      'C++': '#00599c',
      'JavaScript': '#f7df1e',
      'Java': '#ed8b00',
      'Go': '#00add8',
      'TypeScript': '#3178c6',
      'Rust': '#dea584',
      'Node.js': '#68a063',
      'PHP': '#777bb4',
      'Ruby': '#cc342d'
    };
    return colors[language] || '#6b7280';
  };

  const getLanguageIcon = (language) => {
    const icons = {
      'Python': 'py',
      'React': 'jsx',
      'C++': 'cpp',
      'JavaScript': 'js',
      'Java': 'java',
      'Go': 'go',
      'TypeScript': 'ts',
      'Rust': 'rs',
      'Node.js': 'js',
      'PHP': 'php',
      'Ruby': 'rb'
    };
    return icons[language] || 'code';
  };

  const filteredProjects = projects.filter(project => 
    project.PROJECT_NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.ENVIRONMENT.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const generateProjectDescription = (projectName, environment) => {
    const descriptions = {
      'Python': 'Python development project',
      'React': 'React web application',
      'Node.js': 'Node.js backend service',
      'JavaScript': 'JavaScript application',
      'Java': 'Java enterprise application',
      'Go': 'Go microservice',
      'TypeScript': 'TypeScript application',
      'C++': 'C++ system application',
      'PHP': 'PHP web application',
      'Ruby': 'Ruby on Rails application'
    };
    return descriptions[environment] || `${environment} project`;
  };

  return (
    <div style={styles.app}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}></div>
            <span style={styles.logoText}>DevSpace</span>
          </div>
        </div>
        
        <nav style={styles.nav}>
          <div style={styles.navItem}>
            <span style={styles.navIcon}>📁</span>
            <span style={styles.navText}>My Projects</span>
            <span style={styles.navBadge}>{projects.length}</span>
          </div>
          <div style={styles.navItem}>
            <span style={styles.navIcon}>🌟</span>
            <span style={styles.navText}>Templates</span>
          </div>
          <div style={styles.navItem}>
            <span style={styles.navIcon}>👥</span>
            <span style={styles.navText}>Teams</span>
          </div>
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userProfile}>
            <div style={styles.avatar}>{userId.charAt(0).toUpperCase()}</div>
            <span style={styles.username}>{userId}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 style={styles.pageTitle}>My Projects</h1>
            <div style={styles.searchContainer}>
              <span style={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>
          </div>
          <button 
            style={styles.createBtn}
            onClick={() => setShowCreateForm(true)}
          >
            <span style={styles.createIcon}>+</span>
            Create Project
          </button>
        </header>

        <div style={styles.content}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingSpinner}></div>
              <p style={styles.loadingText}>Loading your projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div style={styles.emptyState}>
              {searchTerm ? (
                <>
                  <div style={styles.emptyIcon}>🔍</div>
                  <h3 style={styles.emptyTitle}>No projects found</h3>
                  <p style={styles.emptyDesc}>Try adjusting your search terms</p>
                </>
              ) : (
                <>
                  <div style={styles.emptyIcon}>⚡</div>
                  <h3 style={styles.emptyTitle}>Ready to build something amazing?</h3>
                  <p style={styles.emptyDesc}>Create your first project and start coding</p>
                  <button 
                    style={styles.emptyButton}
                    onClick={() => setShowCreateForm(true)}
                  >
                    Create your first project
                  </button>
                </>
              )}
            </div>
          ) : (
            <div style={styles.projectsGrid}>
              {filteredProjects.map((project) => (
                <div 
                  key={project.PROJECT_ID}
                  style={styles.projectCard}
                  onClick={() => handleProjectClick(project)}
                >
                  <div style={styles.cardHeader}>
                    <div style={styles.projectMeta}>
                      <div 
                        style={{
                          ...styles.langIndicator,
                          backgroundColor: getLanguageColor(project.ENVIRONMENT)
                        }}
                      >
                        {getLanguageIcon(project.ENVIRONMENT)}
                      </div>
                      <div style={styles.projectDetails}>
                        <h3 style={styles.projectName}>{project.PROJECT_NAME}</h3>
                        <p style={styles.projectDesc}>
                          {generateProjectDescription(project.PROJECT_NAME, project.ENVIRONMENT)}
                        </p>
                      </div>
                    </div>
                    <div style={styles.projectActions}>
                      <button style={styles.actionBtn}>⋯</button>
                    </div>
                  </div>
                  
                  <div style={styles.cardFooter}>
                    <span style={styles.language}>{project.ENVIRONMENT}</span>
                    <span style={styles.lastModified}>
                      {formatDate(project.LAST_MODIFIED_DATE)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateForm && (
        <div style={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setShowCreateForm(false)}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Create new project</h2>
              <button 
                style={styles.modalClose}
                onClick={() => setShowCreateForm(false)}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Project name</label>
                <input
                  type="text"
                  placeholder="my-awesome-project"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  style={styles.textInput}
                  autoFocus
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Template</label>
                <div style={styles.templateGrid}>
                  {['Python', 'React', 'C++', 'JavaScript', 'Go', 'TypeScript', 'Node.js', 'Java'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLang(lang)}
                      style={{
                        ...styles.templateCard,
                        ...(selectedLang === lang ? styles.templateCardSelected : {})
                      }}
                    >
                      <div 
                        style={{
                          ...styles.templateIcon,
                          backgroundColor: getLanguageColor(lang)
                        }}
                      >
                        {getLanguageIcon(lang)}
                      </div>
                      <span style={styles.templateName}>{lang}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                style={styles.cancelBtn}
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
              <button
                style={{
                  ...styles.submitBtn,
                  ...((!selectedLang || !projectName.trim()) ? styles.submitBtnDisabled : {})
                }}
                onClick={handleCreateNew}
                disabled={!selectedLang || !projectName.trim()}
              >
                Create project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  app: {
    display: 'flex',
    height: '100vh',
    backgroundColor: '#0d1117',
    color: '#e6edf3',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    overflow: 'hidden'
  },
  
  // Sidebar
  sidebar: {
    width: '280px',
    backgroundColor: '#161b22',
    borderRight: '1px solid #21262d',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0
  },
  sidebarHeader: {
    padding: '20px',
    borderBottom: '1px solid #21262d'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logoIcon: {
    width: '32px',
    height: '32px',
    backgroundColor: '#238636',
    borderRadius: '6px'
  },
  logoText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#f0f6fc'
  },
  nav: {
    padding: '20px 0',
    flex: 1
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 20px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    fontSize: '14px',
    fontWeight: '500'
  },
  navIcon: {
    fontSize: '16px',
    width: '20px'
  },
  navText: {
    flex: 1
  },
  navBadge: {
    backgroundColor: '#21262d',
    color: '#7d8590',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: '500'
  },
  sidebarFooter: {
    padding: '20px',
    borderTop: '1px solid #21262d'
  },
  userProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  avatar: {
    width: '32px',
    height: '32px',
    backgroundColor: '#238636',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff'
  },
  username: {
    fontSize: '14px',
    fontWeight: '500'
  },

  // Main Content
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 32px',
    borderBottom: '1px solid #21262d',
    backgroundColor: '#0d1117'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px'
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: '600',
    margin: '0',
    color: '#f0f6fc'
  },
  searchContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    fontSize: '14px',
    color: '#7d8590'
  },
  searchInput: {
    backgroundColor: '#21262d',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '8px 12px 8px 36px',
    fontSize: '14px',
    color: '#e6edf3',
    width: '320px',
    transition: 'all 0.2s'
  },
  createBtn: {
    backgroundColor: '#238636',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background-color 0.2s'
  },
  createIcon: {
    fontSize: '16px',
    fontWeight: '400'
  },

  // Content
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '32px'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px'
  },
  loadingSpinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #21262d',
    borderTop: '3px solid #238636',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '16px',
    color: '#7d8590',
    fontSize: '14px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '80px 20px',
    maxWidth: '480px',
    margin: '0 auto'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '24px'
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: '600',
    margin: '0 0 8px 0',
    color: '#f0f6fc'
  },
  emptyDesc: {
    fontSize: '16px',
    color: '#7d8590',
    margin: '0 0 32px 0',
    lineHeight: '1.5'
  },
  emptyButton: {
    backgroundColor: '#238636',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  
  // Projects Grid
  projectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
    gap: '16px'
  },
  projectCard: {
    backgroundColor: '#161b22',
    border: '1px solid #21262d',
    borderRadius: '8px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px'
  },
  projectMeta: {
    display: 'flex',
    gap: '12px',
    flex: 1
  },
  langIndicator: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600',
    color: '#ffffff',
    flexShrink: 0
  },
  projectDetails: {
    flex: 1,
    minWidth: 0
  },
  projectName: {
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 4px 0',
    color: '#f0f6fc',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  projectDesc: {
    fontSize: '14px',
    color: '#7d8590',
    margin: '0',
    lineHeight: '1.4',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  projectActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  publicBadge: {
    backgroundColor: '#1f2937',
    color: '#6b7280',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500'
  },
  actionBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#7d8590',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    fontSize: '14px'
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  language: {
    fontSize: '13px',
    color: '#7d8590',
    fontWeight: '500'
  },
  lastModified: {
    fontSize: '13px',
    color: '#7d8590'
  },

  // Modal
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(1, 4, 9, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '80vh',
    overflow: 'auto'
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #21262d'
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    margin: '0',
    color: '#f0f6fc'
  },
  modalClose: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#7d8590',
    cursor: 'pointer',
    padding: '4px',
    fontSize: '16px'
  },
  modalBody: {
    padding: '24px'
  },
  inputGroup: {
    marginBottom: '24px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
    color: '#f0f6fc'
  },
  textInput: {
    width: '100%',
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '12px',
    fontSize: '14px',
    color: '#e6edf3',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  },
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '12px'
  },
  templateCard: {
    backgroundColor: '#0d1117',
    border: '1px solid #21262d',
    borderRadius: '8px',
    padding: '16px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s'
  },
  templateCardSelected: {
    backgroundColor: '#1f2937',
    borderColor: '#238636'
  },
  templateIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600',
    color: '#ffffff'
  },
  templateName: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#e6edf3',
    textAlign: 'center'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '20px 24px',
    borderTop: '1px solid #21262d'
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #30363d',
    color: '#f0f6fc',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  submitBtn: {
    backgroundColor: '#238636',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  submitBtnDisabled: {
    backgroundColor: '#21262d',
    color: '#7d8590',
    cursor: 'not-allowed'
  }
};

// Add CSS animations
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .nav-item:hover {
    background-color: rgba(177, 186, 196, 0.12) !important;
  }
  
  .project-card:hover {
    background-color: #1c2128 !important;
    border-color: #30363d !important;
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(1, 4, 9, 0.15) !important;
  }
  
  .create-btn:hover {
    background-color: #2ea043 !important;
  }
  
  .search-input:focus {
    outline: none;
    border-color: #238636 !important;
    box-shadow: 0 0 0 3px rgba(35, 134, 54, 0.15) !important;
  }
  
  .text-input:focus {
    outline: none;
    border-color: #238636 !important;
    box-shadow: 0 0 0 3px rgba(35, 134, 54, 0.15) !important;
  }
  
  .template-card:hover {
    background-color: #1c2128 !important;
    border-color: #30363d !important;
  }
  
  .action-btn:hover {
    background-color: #21262d !important;
    color: #e6edf3 !important;
  }
  
  .empty-button:hover {
    background-color: #2ea043 !important;
  }
  
  .cancel-btn:hover {
    background-color: #21262d !important;
  }
  
  .submit-btn:hover:not(.submit-btn-disabled) {
    background-color: #2ea043 !important;
  }
  
  .modal-close:hover {
    background-color: #21262d !important;
  }
`;
document.head.appendChild(styleSheet);

export default LandingPage;


// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';

// const LandingPage = () => {
//   const [selectedLang, setSelectedLang] = useState('');
//   const [projectName, setProjectName] = useState('');
//   const [isCreatingNew, setIsCreatingNew] = useState(true);
//   const navigate = useNavigate();

//   const userId="saii112";

//   const handleCreate = () => {
//     if (selectedLang && projectName.trim()) {
//       navigate('/main', { 
//         state: { 
//           language: selectedLang,
//           projectName: projectName.trim(),
//           isNew: isCreatingNew
        
//         } 
//       });
//     } else {
//       alert('Please select a language and enter a project name!');
//     }
//   };

//   const handleLoadExisting = () => {
//     if (selectedLang && projectName.trim()) {
//       navigate('/main', { 
//         state: { 
//           language: selectedLang,
//           projectName: projectName.trim(),
//           isNew: false
//         } 
//       });
//     } else {
//       alert('Please select a language and enter a project name!');
//     }
//   };

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
//       <h1 className="text-3xl font-bold mb-6">Choose a Language Template</h1>
      
//       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
//         {['Python', 'React', 'C++'].map((lang) => (
//           <button
//             key={lang}
//             onClick={() => setSelectedLang(lang)}
//             className={`px-6 py-3 rounded-xl text-white text-lg shadow-md ${
//               selectedLang === lang ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'
//             }`}
//           >
//             {lang}
//           </button>
//         ))}
//       </div>

//       <div className="mb-6">
//         <input
//           type="text"
//           placeholder="Enter project name"
//           value={projectName}
//           onChange={(e) => setProjectName(e.target.value)}
//           className="px-4 py-2 rounded-lg border border-gray-300 text-lg min-w-64"
//         />
//       </div>

//       <div className="flex gap-4">
//         <button
//           onClick={handleCreate}
//           className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl text-lg"
//         >
//           Create New Project
//         </button>
//         <button
//           onClick={handleLoadExisting}
//           className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-lg"
//         >
//           Load Existing Project
//         </button>
//       </div>
//     </div>
//   );
// };

// export default LandingPage;
