import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LABS = [
  {
    key: 'development',
    title: 'Development Lab',
    icon: '💻',
    color: '#238636',
    description: 'Spin up a coding environment with a file explorer, editor and terminal to build React and Node.js apps.',
    path: '/development',
  },
  {
    key: 'devops',
    title: 'DevOps Lab',
    icon: '⚙️',
    color: '#1f6feb',
    description: 'Practice containerization and infrastructure-as-code with ready-to-go Docker and Terraform environments.',
    path: '/devops',
  },
];

const ChooseLab = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.logo}>
          <div style={styles.logoIcon} />
          <span style={styles.logoText}>DevLab</span>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.username}>{user?.name || user?.email}</span>
          <button style={styles.logoutBtn} onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <main style={styles.main}>
        <h1 style={styles.title}>Choose your Lab</h1>
        <p style={styles.subtitle}>Pick the environment you want to work in today.</p>

        <div style={styles.grid}>
          {LABS.map((lab) => (
            <button key={lab.key} style={styles.card} onClick={() => navigate(lab.path)}>
              <div style={{ ...styles.iconCircle, backgroundColor: lab.color }}>{lab.icon}</div>
              <h2 style={styles.cardTitle}>{lab.title}</h2>
              <p style={styles.cardDesc}>{lab.description}</p>
              <span style={styles.enterLink}>Enter lab →</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0d1117',
    color: '#e6edf3',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 32px',
    borderBottom: '1px solid #21262d',
  },
  logo: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoIcon: { width: '28px', height: '28px', backgroundColor: '#238636', borderRadius: '6px' },
  logoText: { fontSize: '18px', fontWeight: 600, color: '#f0f6fc' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  username: { fontSize: '13px', color: '#7d8590' },
  logoutBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #30363d',
    color: '#e6edf3',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  main: { maxWidth: '900px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' },
  title: { fontSize: '32px', fontWeight: 700, color: '#f0f6fc', margin: '0 0 8px' },
  subtitle: { fontSize: '15px', color: '#7d8590', margin: '0 0 48px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
  card: {
    backgroundColor: '#161b22',
    border: '1px solid #21262d',
    borderRadius: '12px',
    padding: '32px 24px',
    textAlign: 'left',
    cursor: 'pointer',
    color: '#e6edf3',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    transition: 'border-color 0.2s, transform 0.2s',
  },
  iconCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
  },
  cardTitle: { fontSize: '18px', fontWeight: 600, color: '#f0f6fc', margin: 0 },
  cardDesc: { fontSize: '13px', color: '#7d8590', margin: 0, lineHeight: 1.5 },
  enterLink: { fontSize: '13px', color: '#58a6ff', fontWeight: 600, marginTop: '8px' },
};

export default ChooseLab;
