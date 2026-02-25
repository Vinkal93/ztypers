import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FiHome, FiAward, FiUser, FiBarChart2, FiLogOut, FiSettings, FiType, FiRadio, FiSun, FiMoon, FiLogIn } from 'react-icons/fi';

export default function Navbar() {
    const { user, isAdmin, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <nav className="navbar">
            <NavLink to="/" className="navbar-brand">
                <span style={{ fontSize: '24px' }}>⚡</span>
                <span className="navbar-logo">Z Typers</span>
            </NavLink>

            <div className="navbar-links">
                <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <FiHome size={17} />
                    <span className="nav-text">Home</span>
                </NavLink>
                <NavLink to="/practice" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <FiType size={17} />
                    <span className="nav-text">Practice</span>
                </NavLink>
                <NavLink to="/live" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <FiRadio size={17} />
                    <span className="nav-text">Live</span>
                </NavLink>
                <NavLink to="/leaderboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <FiAward size={17} />
                    <span className="nav-text">Rankings</span>
                </NavLink>
                <NavLink to="/compare" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <FiBarChart2 size={17} />
                    <span className="nav-text">Compare</span>
                </NavLink>

                {user && isAdmin() && (
                    <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        style={{ borderLeft: '1px solid var(--bg-glass-border)', marginLeft: '4px', paddingLeft: '16px' }}>
                        <FiSettings size={17} />
                        <span className="nav-text">Admin</span>
                    </NavLink>
                )}

                {/* Theme Toggle */}
                <button onClick={toggleTheme} className="theme-toggle" title={isDark ? 'Switch to Light' : 'Switch to Dark'}>
                    {isDark ? <FiSun size={17} /> : <FiMoon size={17} />}
                </button>

                {user ? (
                    <button onClick={handleLogout} className="nav-link" style={{ border: 'none', cursor: 'pointer' }}>
                        <FiLogOut size={17} />
                    </button>
                ) : (
                    <NavLink to="/login" className="nav-link">
                        <FiLogIn size={17} />
                        <span className="nav-text">Admin</span>
                    </NavLink>
                )}
            </div>
        </nav>
    );
}
