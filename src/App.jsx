import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Compete from './pages/Compete';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import Compare from './pages/Compare';
import Results from './pages/Results';
import Practice from './pages/Practice';
import Playground from './pages/Playground';
import LiveViewer from './pages/LiveViewer';
import AdminDashboard from './pages/admin/Dashboard';
import AdminCreate from './pages/admin/CreateCompetition';
import AdminManage from './pages/admin/ManageCompetition';
import AdminPerformance from './pages/admin/Performance';
import AdminDisputes from './pages/admin/Disputes';
import StudentManager from './pages/admin/StudentManager';
import PlaygroundControl from './pages/admin/PlaygroundControl';

function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}><div className="timer">Loading...</div></div>;
  if (!user || !isAdmin()) return <Navigate to="/login" />;
  return children;
}

export default function App() {
  const { user, isAdmin } = useAuth();

  return (
    <>
      <Navbar />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/live" element={<LiveViewer />} />
        <Route path="/live/:compId" element={<LiveViewer />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/leaderboard/:compId" element={<Leaderboard />} />
        <Route path="/results/:compId" element={<Results />} />
        <Route path="/compare" element={<Compare />} />

        {/* Admin auth */}
        <Route path="/login" element={user && isAdmin() ? <Navigate to="/admin" /> : <Login />} />
        <Route path="/register" element={user && isAdmin() ? <Navigate to="/admin" /> : <Register />} />

        {/* Protected routes */}
        <Route path="/compete/:compId" element={<Compete />} />
        <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/create" element={<AdminRoute><AdminCreate /></AdminRoute>} />
        <Route path="/admin/manage/:compId" element={<AdminRoute><AdminManage /></AdminRoute>} />
        <Route path="/admin/performance/:compId" element={<AdminRoute><AdminPerformance /></AdminRoute>} />
        <Route path="/admin/disputes/:compId" element={<AdminRoute><AdminDisputes /></AdminRoute>} />
        <Route path="/admin/students" element={<AdminRoute><StudentManager /></AdminRoute>} />
        <Route path="/admin/playground" element={<AdminRoute><PlaygroundControl /></AdminRoute>} />
      </Routes>
    </>
  );
}
