import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FiHome, FiAward, FiBarChart2, FiLogOut, FiSettings, FiType, FiRadio, FiSun, FiMoon, FiLogIn, FiMenu, FiX, FiUsers, FiPlay } from 'react-icons/fi';

export default function Navbar() {
    const { user, isAdmin, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        setSidebarOpen(false);
        navigate('/');
    };

    const closeSidebar = () => setSidebarOpen(false);

    const links = [
        { to: '/', icon: <FiHome size={18} />, label: 'Home', end: true },
        { to: '/practice', icon: <FiType size={18} />, label: 'Practice' },
        { to: '/playground', icon: <FiPlay size={18} />, label: 'Playground' },
        { to: '/live', icon: <FiRadio size={18} />, label: 'Live' },
        { to: '/leaderboard', icon: <FiAward size={18} />, label: 'Rankings' },
        { to: '/compare', icon: <FiBarChart2 size={18} />, label: 'Compare' },
        { to: '/winners', icon: <FiAward size={18} />, label: 'Winners' },
    ];

    const adminLinks = [
        { to: '/admin', icon: <FiSettings size={18} />, label: 'Dashboard' },
        { to: '/admin/students', icon: <FiUsers size={18} />, label: 'Students' },
        { to: '/admin/playground', icon: <FiPlay size={18} />, label: 'Playground Control' },
    ];

    return (
        <>
            <nav className="navbar">
                <NavLink to="/" className="navbar-brand" onClick={closeSidebar}>
                    <span style={{ fontSize: '24px' }}>⚡</span>
                    <span className="navbar-logo">Z Typers</span>
                </NavLink>

                {/* Desktop Links */}
                <div className="navbar-links navbar-desktop">
                    {links.map(l => (
                        <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            {l.icon}
                            <span className="nav-text">{l.label}</span>
                        </NavLink>
                    ))}

                    {user && isAdmin() && (
                        <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            style={{ borderLeft: '1px solid var(--bg-glass-border)', marginLeft: '4px', paddingLeft: '16px' }}>
                            <FiSettings size={17} />
                            <span className="nav-text">Admin</span>
                        </NavLink>
                    )}

                    <button onClick={toggleTheme} className="theme-toggle" title={isDark ? 'Light Mode' : 'Dark Mode'}>
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

                {/* Mobile Menu Button */}
                <div className="navbar-mobile">
                    <button onClick={toggleTheme} className="theme-toggle">
                        {isDark ? <FiSun size={17} /> : <FiMoon size={17} />}
                    </button>
                    <button onClick={() => setSidebarOpen(true)} className="btn-icon" style={{ border: 'none' }}>
                        <FiMenu size={22} />
                    </button>
                </div>
            </nav>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div className="sidebar-overlay" onClick={closeSidebar} />
            )}

            {/* Mobile Sidebar */}
            <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>⚡</span>
                        <span className="navbar-logo">Z Typers</span>
                    </div>
                    <button onClick={closeSidebar} className="btn-icon" style={{ border: 'none' }}>
                        <FiX size={22} />
                    </button>
                </div>

                <div className="sidebar-content">
                    {links.map(l => (
                        <NavLink key={l.to} to={l.to} end={l.end} onClick={closeSidebar}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                            {l.icon}
                            <span>{l.label}</span>
                        </NavLink>
                    ))}

                    {user && isAdmin() && (
                        <>
                            <div className="sidebar-divider" />
                            <div className="sidebar-section-title">Admin Panel</div>
                            {adminLinks.map(l => (
                                <NavLink key={l.to} to={l.to} onClick={closeSidebar}
                                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                                    {l.icon}
                                    <span>{l.label}</span>
                                </NavLink>
                            ))}
                        </>
                    )}

                    <div className="sidebar-divider" />
                    <NavLink to="/about" onClick={closeSidebar}
                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                        <FiUsers size={18} />
                        <span>About Developer</span>
                    </NavLink>
                    <div className="sidebar-divider" />

                    {user ? (
                        <button onClick={handleLogout} className="sidebar-link" style={{ border: 'none', background: 'none', width: '100%', cursor: 'pointer' }}>
                            <FiLogOut size={18} />
                            <span>Logout</span>
                        </button>
                    ) : (
                        <NavLink to="/login" onClick={closeSidebar} className="sidebar-link">
                            <FiLogIn size={18} />
                            <span>Admin Login</span>
                        </NavLink>
                    )}
                </div>
            </div>
        </>
    );
}
