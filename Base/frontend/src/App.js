import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import ChooseLab from './pages/ChooseLab';
import DevelopmentLab from './pages/DevelopmentLab';
import DevOpsLab from './pages/DevOpsLab';
import Main from './Main'; // Workspace / IDE view


function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/labs" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/labs" element={<ProtectedRoute><ChooseLab /></ProtectedRoute>} />
          <Route path="/development" element={<ProtectedRoute><DevelopmentLab /></ProtectedRoute>} />
          <Route path="/devops" element={<ProtectedRoute><DevOpsLab /></ProtectedRoute>} />
          <Route path="/workspace/:projectId" element={<ProtectedRoute><Main /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
