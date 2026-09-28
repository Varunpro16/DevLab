import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectApi } from '../api';
import { useAuth } from '../context/AuthContext';

// Shared project list + create UI used by both the Development Lab and the
// DevOps Lab. `languages` scopes which backend templates are offered when
// creating a new project, so each lab only shows templates that actually work.
const LabProjectList = ({ labTitle, labIcon, languages, backPath }) => {
  const [selectedLang, setSelectedLang] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const list = await projectApi.list();
      setProjects(list.filter((p) => languages.some((l) => l.id === p.language)));
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = (project) => {
    navigate(`/workspace/${project.id}`);
  };

  const handleCreateNew = async () => {
    if (!selectedLang || !projectName.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const project = await projectApi.create(projectName.trim(), selectedLang);
      setShowCreateForm(false);
      setSelectedLang('');
      setProjectName('');
      navigate(`/workspace/${project.id}`);
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const langMeta = (id) => languages.find((l) => l.id === id) || { label: id, color: '#6b7280', icon: id?.slice(0, 2) };

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const diffDays = Math.floor((Date.now() - date) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={styles.app}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <button style={styles.backBtn} onClick={() => navigate(backPath)}>← Labs</button>
          <div style={styles.logo}>
            <span style={{ fontSize: 20 }}>{labIcon}</span>
            <span style={styles.logoText}>{labTitle}</span>
          </div>
        </div>

        <nav style={styles.nav}>
          <div style={styles.navItem}>
            <span style={styles.navIcon}>📁</span>
            <span style={styles.navText}>My Projects</span>
            <span style={styles.navBadge}>{projects.length}</span>
          </div>
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userProfile}>
            <div style={styles.avatar}>{(user?.name || user?.email || '?').charAt(0).toUpperCase()}</div>
            <span style={styles.username}>{user?.name || user?.email}</span>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogout}>Log out</button>
        </div>
      </div>

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
          <button style={styles.createBtn} onClick={() => setShowCreateForm(true)}>
            <span style={styles.createIcon}>+</span>
            Create Project
          </button>
        </header>

        <div style={styles.content}>
          {loading ? (
            <div style={styles.loadingContainer}>
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
                  <div style={styles.emptyIcon}>{labIcon}</div>
                  <h3 style={styles.emptyTitle}>Ready to build something amazing?</h3>
                  <p style={styles.emptyDesc}>Create your first project and start coding</p>
                  <button style={styles.emptyButton} onClick={() => setShowCreateForm(true)}>
                    Create your first project
                  </button>
                </>
              )}
            </div>
          ) : (
            <div style={styles.projectsGrid}>
              {filteredProjects.map((project) => {
                const meta = langMeta(project.language);
                return (
                  <div key={project.id} style={styles.projectCard} onClick={() => handleProjectClick(project)}>
                    <div style={styles.cardHeader}>
                      <div style={styles.projectMeta}>
                        <div style={{ ...styles.langIndicator, backgroundColor: meta.color }}>{meta.icon}</div>
                        <div style={styles.projectDetails}>
                          <h3 style={styles.projectName}>{project.name}</h3>
                          <p style={styles.projectDesc}>{meta.label} project</p>
                        </div>
                      </div>
                    </div>
                    <div style={styles.cardFooter}>
                      <span style={styles.language}>{meta.label}</span>
                      <span style={styles.status}>{project.status}</span>
                      <span style={styles.lastModified}>{formatDate(project.updated_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showCreateForm && (
        <div style={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setShowCreateForm(false)}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Create new project</h2>
              <button style={styles.modalClose} onClick={() => setShowCreateForm(false)}>✕</button>
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
                  {languages.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => setSelectedLang(lang.id)}
                      style={{
                        ...styles.templateCard,
                        ...(selectedLang === lang.id ? styles.templateCardSelected : {}),
                      }}
                    >
                      <div style={{ ...styles.templateIcon, backgroundColor: lang.color }}>{lang.icon}</div>
                      <span style={styles.templateName}>{lang.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {createError && <div style={styles.errorBox}>{createError}</div>}
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.cancelBtn} onClick={() => setShowCreateForm(false)}>Cancel</button>
              <button
                style={{
                  ...styles.submitBtn,
                  ...((!selectedLang || !projectName.trim() || creating) ? styles.submitBtnDisabled : {}),
                }}
                onClick={handleCreateNew}
                disabled={!selectedLang || !projectName.trim() || creating}
              >
                {creating ? 'Creating…' : 'Create project'}
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
    overflow: 'hidden',
  },
  sidebar: {
    width: '260px',
    backgroundColor: '#161b22',
    borderRight: '1px solid #21262d',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  sidebarHeader: { padding: '20px', borderBottom: '1px solid #21262d' },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#7d8590',
    fontSize: '12px',
    cursor: 'pointer',
    padding: 0,
    marginBottom: '12px',
  },
  logo: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoText: { fontSize: '16px', fontWeight: 600, color: '#f0f6fc' },
  nav: { padding: '12px 0', flex: 1 },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 20px',
    color: '#e6edf3',
    fontSize: '14px',
  },
  navIcon: { fontSize: '14px' },
  navText: { flex: 1 },
  navBadge: {
    backgroundColor: '#21262d',
    borderRadius: '10px',
    padding: '1px 8px',
    fontSize: '12px',
    color: '#7d8590',
  },
  sidebarFooter: { padding: '16px 20px', borderTop: '1px solid #21262d' },
  userProfile: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#238636',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 600,
  },
  username: { fontSize: '13px', color: '#e6edf3', overflow: 'hidden', textOverflow: 'ellipsis' },
  logoutBtn: {
    width: '100%',
    backgroundColor: 'transparent',
    border: '1px solid #30363d',
    color: '#e6edf3',
    borderRadius: '6px',
    padding: '6px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 32px',
    borderBottom: '1px solid #21262d',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '24px' },
  pageTitle: { fontSize: '20px', fontWeight: 600, margin: 0, color: '#f0f6fc' },
  searchContainer: { position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: '10px', fontSize: '13px' },
  searchInput: {
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '6px 12px 6px 30px',
    color: '#e6edf3',
    fontSize: '13px',
    width: '220px',
  },
  createBtn: {
    backgroundColor: '#238636',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  createIcon: { fontSize: '15px' },
  content: { flex: 1, overflowY: 'auto', padding: '32px' },
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '80px' },
  loadingText: { color: '#7d8590', fontSize: '14px' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '80px', textAlign: 'center' },
  emptyIcon: { fontSize: '40px', marginBottom: '16px' },
  emptyTitle: { fontSize: '18px', color: '#f0f6fc', margin: '0 0 8px' },
  emptyDesc: { fontSize: '13px', color: '#7d8590', margin: '0 0 20px' },
  emptyButton: {
    backgroundColor: '#238636',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 18px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  projectsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' },
  projectCard: {
    backgroundColor: '#161b22',
    border: '1px solid #21262d',
    borderRadius: '8px',
    padding: '16px',
    cursor: 'pointer',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px' },
  projectMeta: { display: 'flex', gap: '10px' },
  langIndicator: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  projectDetails: {},
  projectName: { fontSize: '14px', fontWeight: 600, margin: 0, color: '#f0f6fc' },
  projectDesc: { fontSize: '12px', color: '#7d8590', margin: '2px 0 0' },
  cardFooter: { display: 'flex', gap: '10px', fontSize: '12px', color: '#7d8590' },
  language: { backgroundColor: '#21262d', borderRadius: '10px', padding: '2px 8px' },
  status: { backgroundColor: '#21262d', borderRadius: '10px', padding: '2px 8px', textTransform: 'capitalize' },
  lastModified: { marginLeft: 'auto' },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    width: '440px',
    backgroundColor: '#161b22',
    border: '1px solid #21262d',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #21262d',
  },
  modalTitle: { fontSize: '15px', fontWeight: 600, margin: 0, color: '#f0f6fc' },
  modalClose: { background: 'none', border: 'none', color: '#7d8590', fontSize: '16px', cursor: 'pointer' },
  modalBody: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', color: '#7d8590', fontWeight: 600 },
  textInput: {
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '10px 12px',
    color: '#e6edf3',
    fontSize: '14px',
  },
  templateGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' },
  templateCard: {
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '8px',
    padding: '10px 6px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
  },
  templateCardSelected: { borderColor: '#58a6ff', backgroundColor: '#0d2340' },
  templateIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 700,
    color: '#fff',
  },
  templateName: { fontSize: '11px', color: '#e6edf3' },
  errorBox: {
    backgroundColor: '#3d1418',
    border: '1px solid #f85149',
    color: '#ffa198',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '13px',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: '16px 20px',
    borderTop: '1px solid #21262d',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #30363d',
    color: '#e6edf3',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  submitBtn: {
    backgroundColor: '#238636',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
};

export default LabProjectList;
