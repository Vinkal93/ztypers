import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, getDocs, onSnapshot, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { useSuperAdmin } from '../../context/SuperAdminContext';
import {
    FiShield, FiUsers, FiActivity, FiLogOut, FiSun, FiMoon, FiSearch,
    FiUserPlus, FiUserCheck, FiUserX, FiLock, FiUnlock, FiAlertTriangle,
    FiRefreshCw, FiGlobe, FiSmartphone, FiMonitor, FiCalendar, FiSettings,
    FiZap, FiChevronDown, FiChevronRight, FiCopy, FiCheck, FiBell,
    FiTrash2, FiSlash, FiPlusCircle,
} from 'react-icons/fi';

const functions = getFunctions(undefined, 'asia-south1');

// ── Theme ─────────────────────────────────────────────────
const THEMES = {
    dark: {
        bg: 'linear-gradient(145deg, #0a0a0f 0%, #0d1117 50%, #161b22 100%)',
        text: '#ffffff', textMuted: 'rgba(255,255,255,0.6)', textSubtle: 'rgba(255,255,255,0.4)',
        textDim: 'rgba(255,255,255,0.25)',
        card: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.06)',
        rowBorder: 'rgba(255,255,255,0.04)', inputBg: 'rgba(255,255,255,0.05)',
        tagBg: 'rgba(255,255,255,0.05)', tagBorder: 'rgba(255,255,255,0.08)',
    },
    light: {
        bg: 'linear-gradient(145deg, #f0f2f5 0%, #e8ecf0 50%, #f5f7fa 100%)',
        text: '#111827', textMuted: 'rgba(0,0,0,0.55)', textSubtle: 'rgba(0,0,0,0.4)',
        textDim: 'rgba(0,0,0,0.25)',
        card: 'rgba(255,255,255,0.8)', cardBorder: 'rgba(0,0,0,0.08)',
        rowBorder: 'rgba(0,0,0,0.04)', inputBg: 'rgba(0,0,0,0.04)',
        tagBg: 'rgba(0,0,0,0.04)', tagBorder: 'rgba(0,0,0,0.08)',
    },
};

export default function SuperAdminDashboard() {
    const navigate = useNavigate();
    const { isSuperAdmin, superAdminUser, loading: authLoading, logoutSuperAdmin } = useSuperAdmin();
    const [dark, setDark] = useState(true);
    const t = THEMES[dark ? 'dark' : 'light'];

    // Auth state
    const verified = isSuperAdmin;
    const loading = authLoading;
    const currentUser = superAdminUser;

    // Tab
    const [tab, setTab] = useState('overview');

    // Data
    const [allUsers, setAllUsers] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [allEvents, setAllEvents] = useState([]);
    const [institutes, setInstitutes] = useState([]);
    const [adminLogs, setAdminLogs] = useState([]);
    const [sessionLogs, setSessionLogs] = useState([]);

    // UI state
    const [searchQ, setSearchQ] = useState('');
    const [promoting, setPromoting] = useState(false);
    const [promoteUid, setPromoteUid] = useState('');
    const [promoteRole, setPromoteRole] = useState('superadmin');
    const [actionMsg, setActionMsg] = useState({ text: '', type: '' });
    const [expandedUser, setExpandedUser] = useState(null);
    const [copiedUid, setCopiedUid] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    // Admin creation state
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newAdminPassword, setNewAdminPassword] = useState('');
    const [newAdminName, setNewAdminName] = useState('');
    const [newAdminInstitute, setNewAdminInstitute] = useState('');
    const [creatingAdmin, setCreatingAdmin] = useState(false);

    // Data erase state
    const [eraseInstId, setEraseInstId] = useState('');
    const [eraseConfirmName, setEraseConfirmName] = useState('');
    const [eraseStep, setEraseStep] = useState(0); // 0=select, 1=type name, 2=final confirm
    const [erasing, setErasing] = useState(false);

    // ── Verify auth (Supabase) ──
    useEffect(() => {
        if (!authLoading && !isSuperAdmin) {
            navigate('/SU', { replace: true });
        }
    }, [authLoading, isSuperAdmin, navigate]);

    // ── Fetch all data ──
    useEffect(() => {
        if (!verified) return;
        // Users from Firestore
        const unsubUsers = onSnapshot(collection(db, 'users'), snap => {
            setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        // Students
        const unsubStudents = onSnapshot(collection(db, 'students'), snap => {
            setAllStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        // Events
        const unsubEvents = onSnapshot(collection(db, 'events'), snap => {
            setAllEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        // Institutes
        const unsubInst = onSnapshot(collection(db, 'institutes'), snap => {
            setInstitutes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        // Session logs (recent 200)
        getDocs(collection(db, 'session_logs')).then(snap => {
            const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            logs.sort((a, b) => (b.loginAt || '').localeCompare(a.loginAt || ''));
            setSessionLogs(logs.slice(0, 200));
        });

        return () => { unsubUsers(); unsubStudents(); unsubEvents(); unsubInst(); };
    }, [verified]);

    // ── Fetch admin logs via Cloud Function ──
    const fetchAdminLogs = async () => {
        try {
            const fn = httpsCallable(functions, 'getAdminLogs');
            const result = await fn({ limit: 50 });
            setAdminLogs(result.data.logs || []);
        } catch (e) {
            console.error('Failed to fetch admin logs:', e);
        }
    };

    useEffect(() => {
        if (verified && tab === 'security') fetchAdminLogs();
    }, [verified, tab]);

    // ── Actions ──
    const handlePromote = async () => {
        if (!promoteUid.trim()) return;
        setPromoting(true);
        setActionMsg({ text: '', type: '' });
        try {
            const fn = promoteRole === 'superadmin'
                ? httpsCallable(functions, 'promoteSuperAdmin')
                : httpsCallable(functions, 'setUserRole');
            const payload = promoteRole === 'superadmin'
                ? { targetUid: promoteUid.trim() }
                : { targetUid: promoteUid.trim(), newRole: promoteRole };
            const result = await fn(payload);
            setActionMsg({ text: result.data.message, type: 'success' });
            setPromoteUid('');
        } catch (e) {
            setActionMsg({ text: e.message || 'Failed', type: 'error' });
        }
        setPromoting(false);
    };

    const handleToggleUser = async (uid, disable) => {
        try {
            const fn = httpsCallable(functions, 'toggleUserAccess');
            await fn({ targetUid: uid, disabled: disable });
            setActionMsg({ text: disable ? 'User disabled' : 'User enabled', type: 'success' });
        } catch (e) {
            setActionMsg({ text: e.message || 'Failed', type: 'error' });
        }
    };

    const handleSetRole = async (uid, role) => {
        try {
            const fn = httpsCallable(functions, 'setUserRole');
            await fn({ targetUid: uid, newRole: role });
            setActionMsg({ text: `Role set to ${role}`, type: 'success' });
        } catch (e) {
            setActionMsg({ text: e.message || 'Failed', type: 'error' });
        }
    };

    const handleForceLogout = async () => {
        if (!confirm('This will force logout ALL users. Continue?')) return;
        try {
            const fn = httpsCallable(functions, 'forceLogoutAll');
            const result = await fn({});
            setActionMsg({ text: `Logged out ${result.data.usersAffected} users`, type: 'success' });
        } catch (e) {
            setActionMsg({ text: e.message || 'Failed', type: 'error' });
        }
    };

    const handleMaintenanceToggle = async (enabled) => {
        try {
            const fn = httpsCallable(functions, 'setMaintenanceMode');
            await fn({ enabled, message: 'System under maintenance. Please try again later.' });
            setActionMsg({ text: enabled ? 'Maintenance ON' : 'Maintenance OFF', type: 'success' });
        } catch (e) {
            setActionMsg({ text: e.message || 'Failed', type: 'error' });
        }
    };

    const handleRefreshUsers = async () => {
        setRefreshing(true);
        try {
            const fn = httpsCallable(functions, 'listAllUsers');
            const result = await fn({ maxResults: 100 });
            // Merge with Firestore data
            const authUsers = result.data.users;
            setAllUsers(prev => {
                const merged = [...prev];
                authUsers.forEach(au => {
                    const idx = merged.findIndex(u => u.id === au.uid);
                    if (idx >= 0) {
                        merged[idx] = { ...merged[idx], ...au, authRole: au.role };
                    } else {
                        merged.push({ id: au.uid, ...au, authRole: au.role });
                    }
                });
                return merged;
            });
        } catch (e) {
            console.error(e);
        }
        setRefreshing(false);
    };

    const copyUid = (uid) => {
        navigator.clipboard.writeText(uid);
        setCopiedUid(uid);
        setTimeout(() => setCopiedUid(''), 1500);
    };

    const handleLogout = async () => {
        await logoutSuperAdmin();
        navigate('/SU', { replace: true });
    };

    // Create Admin
    const handleCreateAdmin = async () => {
        if (!newAdminEmail || !newAdminPassword) return;
        setCreatingAdmin(true);
        setActionMsg({ text: '', type: '' });
        try {
            const fn = httpsCallable(functions, 'createAdmin');
            const result = await fn({
                email: newAdminEmail.trim(),
                password: newAdminPassword,
                displayName: newAdminName.trim() || undefined,
                instituteName: newAdminInstitute.trim() || undefined,
            });
            setActionMsg({ text: result.data.message, type: 'success' });
            setNewAdminEmail(''); setNewAdminPassword(''); setNewAdminName(''); setNewAdminInstitute('');
        } catch (e) {
            setActionMsg({ text: e.message || 'Failed to create admin', type: 'error' });
        }
        setCreatingAdmin(false);
    };

    // Delete/Suspend/Terminate Admin
    const handleAdminAction = async (uid, action) => {
        const labels = { suspend: 'Suspend', terminate: 'Terminate', delete: 'Delete' };
        if (!confirm(`Are you sure you want to ${labels[action]} this admin?`)) return;
        try {
            const fn = httpsCallable(functions, 'deleteAdmin');
            const result = await fn({ targetUid: uid, action });
            setActionMsg({ text: result.data.message, type: 'success' });
        } catch (e) {
            setActionMsg({ text: e.message || 'Failed', type: 'error' });
        }
    };

    // Erase Institute Data
    const handleEraseInstitute = async () => {
        setErasing(true);
        try {
            const fn = httpsCallable(functions, 'eraseInstituteData');
            const result = await fn({
                instituteId: eraseInstId,
                confirmName: eraseConfirmName,
                confirmCode: 'ERASE-CONFIRM',
            });
            setActionMsg({ text: result.data.message, type: 'success' });
            setEraseStep(0); setEraseInstId(''); setEraseConfirmName('');
        } catch (e) {
            setActionMsg({ text: e.message || 'Erase failed', type: 'error' });
        }
        setErasing(false);
    };

    // ── Computed ──
    const totalAdmins = allUsers.filter(u => u.role === 'admin' || u.role === 'superadmin').length;
    const totalSuperAdmins = allUsers.filter(u => u.role === 'superadmin').length;
    const filteredUsers = allUsers.filter(u => {
        const q = searchQ.toLowerCase();
        if (!q) return true;
        return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.id || '').toLowerCase().includes(q);
    });

    // Analytics
    const locationCounts = {};
    const deviceCounts = { Desktop: 0, Mobile: 0 };
    const browserCounts = {};
    sessionLogs.forEach(s => {
        if (s.location) locationCounts[s.location] = (locationCounts[s.location] || 0) + 1;
        const dev = /mobile|android|iphone/i.test(s.userAgent || '') ? 'Mobile' : 'Desktop';
        deviceCounts[dev]++;
        const br = (s.userAgent || '').match(/(Chrome|Firefox|Safari|Edge|Opera)/i)?.[1] || 'Other';
        browserCounts[br] = (browserCounts[br] || 0) + 1;
    });
    const topLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f', color: '#fff' }}>
            <div style={{ textAlign: 'center' }}>
                <FiShield size={40} style={{ color: '#7c3aed', marginBottom: '16px' }} />
                <div style={{ fontSize: '14px', opacity: 0.5 }}>Verifying Super Admin...</div>
            </div>
        </div>
    );

    if (!verified) return null;

    const TABS = [
        { id: 'overview', label: '📊 Overview', icon: FiActivity },
        { id: 'users', label: '👥 Users', icon: FiUsers },
        { id: 'admins', label: '👔 Admins', icon: FiUserPlus },
        { id: 'promote', label: '🛡 Promote', icon: FiUserCheck },
        { id: 'institutes', label: '🏫 Institutes', icon: FiGlobe },
        { id: 'security', label: '🔒 Security', icon: FiLock },
        { id: 'control', label: '⚙ Control', icon: FiSettings },
    ];

    return (
        <div style={{
            minHeight: '100vh', background: t.bg, color: t.text,
            fontFamily: "'Inter', system-ui, sans-serif",
            transition: 'all 0.3s ease',
        }}>
            {/* ═══ TOP BAR ═══ */}
            <div style={{
                padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: `1px solid ${t.cardBorder}`,
                background: t.card, backdropFilter: 'blur(12px)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <FiShield size={18} color="#fff" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '16px' }}>Super Admin Panel</div>
                        <div style={{ fontSize: '11px', color: t.textSubtle }}>
                            {currentUser?.email} — Supabase Auth
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={() => setDark(!dark)} style={{
                        padding: '8px 12px', borderRadius: '10px', border: `1px solid ${t.cardBorder}`,
                        background: t.card, color: t.text, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600,
                    }}>
                        {dark ? <FiSun size={14} /> : <FiMoon size={14} />}
                        {dark ? 'Light' : 'Dark'}
                    </button>
                    <button onClick={handleLogout} style={{
                        padding: '8px 16px', borderRadius: '10px', border: 'none',
                        background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                        cursor: 'pointer', fontWeight: 700, fontSize: '12px',
                        display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                        <FiLogOut size={14} /> Logout
                    </button>
                </div>
            </div>

            {/* ═══ TABS ═══ */}
            <div style={{
                padding: '12px 28px', display: 'flex', gap: '6px', overflowX: 'auto',
                borderBottom: `1px solid ${t.cardBorder}`,
            }}>
                {TABS.map(tb => (
                    <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                        padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                        background: tab === tb.id ? 'linear-gradient(135deg, #7c3aed, #3b82f6)' : t.card,
                        color: tab === tb.id ? '#fff' : t.textMuted,
                        fontWeight: 700, fontSize: '12px', whiteSpace: 'nowrap',
                        transition: 'all 0.2s',
                    }}>
                        {tb.label}
                    </button>
                ))}
            </div>

            {/* ═══ ACTION MSG ═══ */}
            {actionMsg.text && (
                <div style={{
                    margin: '12px 28px 0', padding: '12px 16px', borderRadius: '10px',
                    background: actionMsg.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${actionMsg.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    color: actionMsg.type === 'success' ? '#10b981' : '#ef4444',
                    fontSize: '13px', fontWeight: 600, display: 'flex', justifyContent: 'space-between',
                }}>
                    {actionMsg.text}
                    <button onClick={() => setActionMsg({ text: '', type: '' })} style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700,
                    }}>✕</button>
                </div>
            )}

            {/* ═══ CONTENT ═══ */}
            <div style={{ padding: '24px 28px', maxWidth: '1200px', margin: '0 auto' }}>

                {/* ════════ OVERVIEW ════════ */}
                {tab === 'overview' && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px', marginBottom: '28px' }}>
                            {[
                                { label: 'Total Users', value: allUsers.length, icon: '👥', color: '#3b82f6' },
                                { label: 'Admins', value: totalAdmins, icon: '🛡', color: '#7c3aed' },
                                { label: 'Super Admins', value: totalSuperAdmins, icon: '⚡', color: '#f59e0b' },
                                { label: 'Total Students', value: allStudents.length, icon: '🎓', color: '#10b981' },
                                { label: 'Institutes', value: institutes.length, icon: '🏫', color: '#ec4899' },
                                { label: 'Events', value: allEvents.length, icon: '📅', color: '#06b6d4' },
                            ].map(s => (
                                <div key={s.label} style={{
                                    background: t.card, border: `1px solid ${t.cardBorder}`,
                                    borderRadius: '14px', padding: '20px', transition: 'all 0.2s',
                                }}>
                                    <div style={{ fontSize: '10px', fontWeight: 700, color: t.textSubtle, textTransform: 'uppercase', marginBottom: '8px' }}>
                                        {s.icon} {s.label}
                                    </div>
                                    <div style={{ fontSize: '28px', fontWeight: 900, color: s.color }}>{s.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Recent Sessions */}
                        <div style={{
                            background: t.card, border: `1px solid ${t.cardBorder}`,
                            borderRadius: '16px', padding: '20px',
                        }}>
                            <h3 style={{ fontWeight: 800, fontSize: '15px', marginBottom: '14px' }}>🕐 Recent Sessions</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: `1px solid ${t.cardBorder}` }}>
                                            {['Student', 'Location', 'Device', 'Time'].map(h => (
                                                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: t.textSubtle, fontSize: '10px', textTransform: 'uppercase' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sessionLogs.slice(0, 10).map(s => (
                                            <tr key={s.id} style={{ borderBottom: `1px solid ${t.rowBorder}` }}>
                                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{s.studentName || '-'}</td>
                                                <td style={{ padding: '8px 12px', color: t.textMuted }}>{s.location || '-'}</td>
                                                <td style={{ padding: '8px 12px', color: t.textMuted }}>
                                                    {/mobile|android|iphone/i.test(s.userAgent || '') ? '📱' : '💻'}
                                                </td>
                                                <td style={{ padding: '8px 12px', color: t.textMuted }}>
                                                    {s.loginAt ? new Date(s.loginAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* ════════ USERS ════════ */}
                {tab === 'users' && (
                    <div>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                                <FiSearch size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: t.textSubtle }} />
                                <input placeholder="Search by name, email, or UID..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px 14px 10px 38px', borderRadius: '10px',
                                        border: `1px solid ${t.cardBorder}`, background: t.inputBg,
                                        color: t.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                                    }} />
                            </div>
                            <button onClick={handleRefreshUsers} disabled={refreshing} style={{
                                padding: '10px 16px', borderRadius: '10px', border: `1px solid ${t.cardBorder}`,
                                background: t.card, color: t.text, cursor: 'pointer', fontWeight: 600, fontSize: '12px',
                                display: 'flex', alignItems: 'center', gap: '6px',
                            }}>
                                <FiRefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                                Sync Auth Users
                            </button>
                        </div>

                        <div style={{ fontSize: '11px', color: t.textSubtle, marginBottom: '12px' }}>
                            {filteredUsers.length} users found
                        </div>

                        <div style={{ display: 'grid', gap: '8px' }}>
                            {filteredUsers.map(u => (
                                <div key={u.id} style={{
                                    background: t.card, border: `1px solid ${t.cardBorder}`,
                                    borderRadius: '12px', overflow: 'hidden', transition: 'all 0.2s',
                                }}>
                                    <div onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                                        style={{
                                            padding: '14px 18px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '36px', height: '36px', borderRadius: '10px',
                                                background: u.role === 'superadmin' ? 'linear-gradient(135deg,#7c3aed,#3b82f6)' : u.role === 'admin' ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                                            }}>
                                                {u.role === 'superadmin' ? '⚡' : u.role === 'admin' ? '🛡' : '👤'}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '13px' }}>{u.name || u.displayName || 'Unnamed'}</div>
                                                <div style={{ fontSize: '11px', color: t.textSubtle }}>{u.email || '-'}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{
                                                padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                                                background: u.role === 'superadmin' ? 'rgba(124,58,237,0.1)' : u.role === 'admin' ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)',
                                                color: u.role === 'superadmin' ? '#7c3aed' : u.role === 'admin' ? '#3b82f6' : t.textMuted,
                                            }}>{u.role || 'user'}</span>
                                            {expandedUser === u.id ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
                                        </div>
                                    </div>

                                    {expandedUser === u.id && (
                                        <div style={{ padding: '0 18px 16px', borderTop: `1px solid ${t.rowBorder}` }}>
                                            <div style={{ paddingTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                                                <div style={{ fontSize: '11px' }}>
                                                    <span style={{ color: t.textSubtle }}>UID: </span>
                                                    <span style={{ fontFamily: 'monospace', color: '#7c3aed', fontWeight: 600 }}>{u.id.slice(0, 12)}...</span>
                                                    <button onClick={() => copyUid(u.id)} style={{
                                                        background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, marginLeft: '4px',
                                                    }}>
                                                        {copiedUid === u.id ? <FiCheck size={12} color="#10b981" /> : <FiCopy size={12} />}
                                                    </button>
                                                </div>
                                                <div style={{ fontSize: '11px' }}>
                                                    <span style={{ color: t.textSubtle }}>Institute: </span>
                                                    <span style={{ color: t.textMuted }}>{u.instituteId ? institutes.find(i => i.id === u.instituteId)?.name || u.instituteId.slice(0, 10) : '-'}</span>
                                                </div>
                                                <div style={{ fontSize: '11px' }}>
                                                    <span style={{ color: t.textSubtle }}>Created: </span>
                                                    <span style={{ color: t.textMuted }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '-'}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                {u.role !== 'admin' && (
                                                    <button onClick={() => handleSetRole(u.id, 'admin')} style={{
                                                        padding: '6px 12px', borderRadius: '8px', border: 'none',
                                                        background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
                                                        cursor: 'pointer', fontWeight: 600, fontSize: '11px',
                                                    }}>Make Admin</button>
                                                )}
                                                {u.role !== 'user' && u.role !== 'superadmin' && (
                                                    <button onClick={() => handleSetRole(u.id, 'user')} style={{
                                                        padding: '6px 12px', borderRadius: '8px', border: 'none',
                                                        background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
                                                        cursor: 'pointer', fontWeight: 600, fontSize: '11px',
                                                    }}>Demote to User</button>
                                                )}
                                                <button onClick={() => handleToggleUser(u.id, true)} style={{
                                                    padding: '6px 12px', borderRadius: '8px', border: 'none',
                                                    background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                                    cursor: 'pointer', fontWeight: 600, fontSize: '11px',
                                                }}>
                                                    <FiUserX size={11} /> Block
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ════════ PROMOTE ════════ */}
                {tab === 'promote' && (
                    <div>
                        <div style={{
                            background: t.card, border: `1px solid ${t.cardBorder}`,
                            borderRadius: '16px', padding: '28px', maxWidth: '500px',
                        }}>
                            <h3 style={{ fontWeight: 800, fontSize: '16px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FiUserPlus size={18} /> Promote User
                            </h3>
                            <p style={{ fontSize: '12px', color: t.textSubtle, marginBottom: '20px' }}>
                                Enter the target user's UID to change their role via Firebase Custom Claims.
                            </p>

                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: t.textSubtle, display: 'block', marginBottom: '6px' }}>
                                    Target UID
                                </label>
                                <input value={promoteUid} onChange={e => setPromoteUid(e.target.value)}
                                    placeholder="Paste user UID here..."
                                    style={{
                                        width: '100%', padding: '10px 14px', borderRadius: '10px',
                                        border: `1px solid ${t.cardBorder}`, background: t.inputBg,
                                        color: t.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                                        fontFamily: 'monospace',
                                    }} />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: t.textSubtle, display: 'block', marginBottom: '6px' }}>
                                    New Role
                                </label>
                                <select value={promoteRole} onChange={e => setPromoteRole(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px 14px', borderRadius: '10px',
                                        border: `1px solid ${t.cardBorder}`, background: t.inputBg,
                                        color: t.text, fontSize: '13px', outline: 'none',
                                    }}>
                                    <option value="superadmin">⚡ Super Admin</option>
                                    <option value="admin">🛡 Admin</option>
                                    <option value="user">👤 User</option>
                                </select>
                            </div>

                            <button onClick={handlePromote} disabled={promoting || !promoteUid.trim()} style={{
                                width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                                background: promoting ? t.inputBg : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                                color: '#fff', fontWeight: 700, fontSize: '13px',
                                cursor: promoting ? 'not-allowed' : 'pointer',
                            }}>
                                {promoting ? '⏳ Processing...' : '🔐 Set Custom Claims'}
                            </button>

                            <div style={{
                                marginTop: '16px', padding: '12px', borderRadius: '10px',
                                background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)',
                                fontSize: '11px', color: '#f59e0b',
                            }}>
                                ⚠ After promotion, the user must re-login or call <code style={{ background: t.inputBg, padding: '2px 6px', borderRadius: '4px' }}>getIdToken(true)</code> for the claims to take effect.
                            </div>
                        </div>
                    </div>
                )}

                {/* ════════ INSTITUTES ════════ */}
                {tab === 'institutes' && (
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {institutes.map(inst => {
                            const instStudents = allStudents.filter(s => s.instituteId === inst.id);
                            const instEvents = allEvents.filter(e => e.instituteId === inst.id);
                            const instAdmin = allUsers.find(u => u.instituteId === inst.id && (u.role === 'admin' || u.role === 'superadmin'));
                            return (
                                <div key={inst.id} style={{
                                    background: t.card, border: `1px solid ${t.cardBorder}`,
                                    borderRadius: '14px', padding: '20px',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: '15px' }}>🏫 {inst.name || 'Unnamed'}</div>
                                            <div style={{ fontSize: '11px', color: t.textSubtle }}>
                                                Admin: {instAdmin?.name || inst.ownerEmail || '-'}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: t.textMuted }}>
                                            <span>👨‍🎓 {instStudents.length}</span>
                                            <span>📅 {instEvents.length}</span>
                                        </div>
                                    </div>
                                    {instStudents.length > 0 && (
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: `1px solid ${t.rowBorder}` }}>
                                                        {['Name', 'ID', 'WPM', 'Status'].map(h => (
                                                            <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: t.textDim, fontSize: '9px', textTransform: 'uppercase' }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {instStudents.slice(0, 5).map(st => (
                                                        <tr key={st.id} style={{ borderBottom: `1px solid ${t.rowBorder}` }}>
                                                            <td style={{ padding: '6px 10px', fontWeight: 600 }}>{st.name}</td>
                                                            <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: '#7c3aed' }}>{st.studentId}</td>
                                                            <td style={{ padding: '6px 10px', color: '#3b82f6' }}>{st.bestWPM || 0}</td>
                                                            <td style={{ padding: '6px 10px' }}>
                                                                <span style={{
                                                                    padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 700,
                                                                    background: (st.status || 'active') === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                                    color: (st.status || 'active') === 'active' ? '#10b981' : '#ef4444',
                                                                }}>{st.status || 'active'}</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {instStudents.length > 5 && <div style={{ fontSize: '10px', color: t.textDim, padding: '6px 10px' }}>+{instStudents.length - 5} more</div>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ════════ SECURITY ════════ */}
                {tab === 'security' && (
                    <div style={{ display: 'grid', gap: '16px' }}>
                        {/* Activity Logs */}
                        <div style={{
                            background: t.card, border: `1px solid ${t.cardBorder}`,
                            borderRadius: '16px', padding: '20px',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <h3 style={{ fontWeight: 800, fontSize: '15px', margin: 0 }}>📋 Admin Activity Logs</h3>
                                <button onClick={fetchAdminLogs} style={{
                                    padding: '6px 12px', borderRadius: '8px', border: `1px solid ${t.cardBorder}`,
                                    background: t.card, color: t.text, cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                                }}>
                                    <FiRefreshCw size={12} /> Refresh
                                </button>
                            </div>
                            {adminLogs.length === 0 ? (
                                <div style={{ color: t.textDim, fontSize: '13px', padding: '20px 0', textAlign: 'center' }}>
                                    No activity logs yet. Deploy Cloud Functions to enable logging.
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gap: '6px' }}>
                                    {adminLogs.map(log => (
                                        <div key={log.id} style={{
                                            padding: '10px 14px', borderRadius: '8px',
                                            background: t.inputBg, border: `1px solid ${t.rowBorder}`,
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        }}>
                                            <div>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, marginRight: '8px',
                                                    background: log.action?.includes('PROMOTE') ? 'rgba(124,58,237,0.1)' : log.action?.includes('DISABLE') ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
                                                    color: log.action?.includes('PROMOTE') ? '#7c3aed' : log.action?.includes('DISABLE') ? '#ef4444' : '#3b82f6',
                                                }}>{log.action}</span>
                                                <span style={{ fontSize: '11px', color: t.textMuted }}>
                                                    {log.targetEmail || log.targetUid?.slice(0, 10) || '-'}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '10px', color: t.textDim }}>
                                                {log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : '-'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Analytics */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                            {/* Locations */}
                            <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: '16px', padding: '20px' }}>
                                <h4 style={{ fontWeight: 800, fontSize: '14px', marginBottom: '12px' }}><FiGlobe size={14} /> Top Locations</h4>
                                {topLocations.length === 0 ? (
                                    <div style={{ fontSize: '12px', color: t.textDim }}>No data yet</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {topLocations.map(([loc, count], i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 600, minWidth: '100px', color: t.textMuted }}>{loc}</span>
                                                <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: t.inputBg }}>
                                                    <div style={{
                                                        height: '100%', borderRadius: '3px',
                                                        background: 'linear-gradient(90deg, #7c3aed, #3b82f6)',
                                                        width: `${(count / topLocations[0][1]) * 100}%`,
                                                    }} />
                                                </div>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', minWidth: '24px', textAlign: 'right' }}>{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Devices */}
                            <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: '16px', padding: '20px' }}>
                                <h4 style={{ fontWeight: 800, fontSize: '14px', marginBottom: '12px' }}><FiMonitor size={14} /> Devices & Browsers</h4>
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                                    {Object.entries(deviceCounts).map(([d, v]) => (
                                        <div key={d} style={{
                                            flex: 1, padding: '12px', borderRadius: '10px', textAlign: 'center',
                                            background: d === 'Desktop' ? 'rgba(59,130,246,0.06)' : 'rgba(236,72,153,0.06)',
                                            border: `1px solid ${d === 'Desktop' ? 'rgba(59,130,246,0.12)' : 'rgba(236,72,153,0.12)'}`,
                                        }}>
                                            {d === 'Desktop' ? <FiMonitor size={16} style={{ color: '#3b82f6' }} /> : <FiSmartphone size={16} style={{ color: '#ec4899' }} />}
                                            <div style={{ fontSize: '18px', fontWeight: 900, color: d === 'Desktop' ? '#3b82f6' : '#ec4899', marginTop: '4px' }}>{v}</div>
                                            <div style={{ fontSize: '10px', color: t.textSubtle, fontWeight: 600 }}>{d}</div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: t.textMuted, marginBottom: '6px' }}>Browsers</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {Object.entries(browserCounts).sort((a, b) => b[1] - a[1]).map(([br, v], i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 600, minWidth: '60px', color: t.textMuted }}>{br}</span>
                                            <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: t.inputBg }}>
                                                <div style={{
                                                    height: '100%', borderRadius: '2px',
                                                    background: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#7c3aed'][i % 5],
                                                    width: `${(v / Math.max(...Object.values(browserCounts))) * 100}%`,
                                                }} />
                                            </div>
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: t.textMuted, minWidth: '20px', textAlign: 'right' }}>{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ════════ APP CONTROL ════════ */}
                {tab === 'control' && (
                    <div style={{ display: 'grid', gap: '16px', maxWidth: '500px' }}>
                        {/* Maintenance Mode */}
                        <div style={{
                            background: t.card, border: `1px solid ${t.cardBorder}`,
                            borderRadius: '16px', padding: '24px',
                        }}>
                            <h3 style={{ fontWeight: 800, fontSize: '15px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FiSettings size={16} /> Maintenance Mode
                            </h3>
                            <p style={{ fontSize: '12px', color: t.textSubtle, marginBottom: '16px' }}>
                                Enable maintenance mode to block all user access.
                            </p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => handleMaintenanceToggle(true)} style={{
                                    padding: '10px 20px', borderRadius: '10px', border: 'none',
                                    background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                    cursor: 'pointer', fontWeight: 700, fontSize: '12px',
                                }}>🚧 Enable</button>
                                <button onClick={() => handleMaintenanceToggle(false)} style={{
                                    padding: '10px 20px', borderRadius: '10px', border: 'none',
                                    background: 'rgba(16,185,129,0.1)', color: '#10b981',
                                    cursor: 'pointer', fontWeight: 700, fontSize: '12px',
                                }}>✅ Disable</button>
                            </div>
                        </div>

                        {/* Force Logout */}
                        <div style={{
                            background: t.card, border: `1px solid ${t.cardBorder}`,
                            borderRadius: '16px', padding: '24px',
                        }}>
                            <h3 style={{ fontWeight: 800, fontSize: '15px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FiZap size={16} /> Force Logout All Users
                            </h3>
                            <p style={{ fontSize: '12px', color: t.textSubtle, marginBottom: '16px' }}>
                                Revoke all user refresh tokens. Everyone will be forced to re-login.
                            </p>
                            <button onClick={handleForceLogout} style={{
                                padding: '10px 20px', borderRadius: '10px', border: 'none',
                                background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                cursor: 'pointer', fontWeight: 700, fontSize: '12px',
                            }}>⚡ Force Logout All</button>
                        </div>

                        {/* Init Super Admin Info */}
                        <div style={{
                            background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.12)',
                            borderRadius: '16px', padding: '24px',
                        }}>
                            <h3 style={{ fontWeight: 800, fontSize: '15px', marginBottom: '12px', color: '#7c3aed' }}>
                                🔑 First-time Setup
                            </h3>
                            <p style={{ fontSize: '12px', color: t.textMuted, marginBottom: '10px' }}>
                                After deploying Cloud Functions, run the init command:
                            </p>
                            <code style={{
                                display: 'block', padding: '12px', borderRadius: '8px',
                                background: t.inputBg, fontSize: '11px', fontFamily: 'monospace',
                                color: '#7c3aed', wordBreak: 'break-all',
                            }}>
                                firebase functions:shell → initSuperAdmin(&#123;data: &#123;targetEmail: "vinkal93041@gmail.com"&#125;&#125;)
                            </code>
                        </div>
                    </div>
                )}

                {/* ════════ ADMIN MANAGER ════════ */}
                {tab === 'admins' && (
                    <div style={{ display: 'grid', gap: '20px', maxWidth: '700px' }}>
                        {/* Create Admin */}
                        <div style={{
                            background: t.card, border: `1px solid ${t.cardBorder}`,
                            borderRadius: '16px', padding: '24px',
                        }}>
                            <h3 style={{ fontWeight: 800, fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FiPlusCircle size={18} /> Create New Admin
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: t.textMuted, marginBottom: '4px' }}>Email *</label>
                                    <input type="email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)}
                                        placeholder="admin@example.com" style={{
                                            width: '100%', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${t.cardBorder}`,
                                            background: t.inputBg, color: t.text, fontSize: '13px', outline: 'none',
                                        }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: t.textMuted, marginBottom: '4px' }}>Password *</label>
                                    <input type="password" value={newAdminPassword} onChange={e => setNewAdminPassword(e.target.value)}
                                        placeholder="Min 6 characters" style={{
                                            width: '100%', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${t.cardBorder}`,
                                            background: t.inputBg, color: t.text, fontSize: '13px', outline: 'none',
                                        }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: t.textMuted, marginBottom: '4px' }}>Display Name</label>
                                    <input type="text" value={newAdminName} onChange={e => setNewAdminName(e.target.value)}
                                        placeholder="Admin Name" style={{
                                            width: '100%', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${t.cardBorder}`,
                                            background: t.inputBg, color: t.text, fontSize: '13px', outline: 'none',
                                        }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: t.textMuted, marginBottom: '4px' }}>Institute Name</label>
                                    <input type="text" value={newAdminInstitute} onChange={e => setNewAdminInstitute(e.target.value)}
                                        placeholder="Institute Name" style={{
                                            width: '100%', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${t.cardBorder}`,
                                            background: t.inputBg, color: t.text, fontSize: '13px', outline: 'none',
                                        }} />
                                </div>
                            </div>
                            <button onClick={handleCreateAdmin} disabled={creatingAdmin || !newAdminEmail || !newAdminPassword}
                                style={{
                                    padding: '10px 24px', borderRadius: '10px', border: 'none',
                                    background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                                    color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '13px',
                                    opacity: creatingAdmin || !newAdminEmail || !newAdminPassword ? 0.5 : 1,
                                }}>
                                {creatingAdmin ? '⏳ Creating...' : '➕ Create Admin'}
                            </button>
                        </div>

                        {/* Admin List */}
                        <div style={{
                            background: t.card, border: `1px solid ${t.cardBorder}`,
                            borderRadius: '16px', padding: '24px',
                        }}>
                            <h3 style={{ fontWeight: 800, fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FiUsers size={18} /> All Admins ({allUsers.filter(u => u.role === 'admin').length})
                            </h3>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                {allUsers.filter(u => u.role === 'admin').map(u => (
                                    <div key={u.id} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '14px 16px', borderRadius: '12px',
                                        background: t.inputBg, border: `1px solid ${t.rowBorder}`,
                                    }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: '14px' }}>{u.name || u.email}</div>
                                            <div style={{ fontSize: '11px', color: t.textMuted }}>
                                                {u.email} • {u.instituteName || 'No Institute'}
                                                {u.status && u.status !== 'active' && (
                                                    <span style={{
                                                        marginLeft: '8px', padding: '2px 8px', borderRadius: '100px',
                                                        background: u.status === 'suspended' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                                                        color: u.status === 'suspended' ? '#f59e0b' : '#ef4444',
                                                        fontSize: '10px', fontWeight: 700,
                                                    }}>
                                                        {u.status.toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                            <button onClick={() => handleAdminAction(u.id, 'suspend')}
                                                title="Suspend" style={{
                                                    padding: '6px 10px', borderRadius: '8px', border: 'none',
                                                    background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
                                                    cursor: 'pointer', fontSize: '11px', fontWeight: 700,
                                                    display: 'flex', alignItems: 'center', gap: '4px',
                                                }}>
                                                <FiSlash size={12} /> Suspend
                                            </button>
                                            <button onClick={() => handleAdminAction(u.id, 'terminate')}
                                                title="Terminate" style={{
                                                    padding: '6px 10px', borderRadius: '8px', border: 'none',
                                                    background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                                    cursor: 'pointer', fontSize: '11px', fontWeight: 700,
                                                    display: 'flex', alignItems: 'center', gap: '4px',
                                                }}>
                                                <FiUserX size={12} /> Terminate
                                            </button>
                                            <button onClick={() => handleAdminAction(u.id, 'delete')}
                                                title="Delete" style={{
                                                    padding: '6px 10px', borderRadius: '8px', border: 'none',
                                                    background: 'rgba(239,68,68,0.15)', color: '#dc2626',
                                                    cursor: 'pointer', fontSize: '11px', fontWeight: 700,
                                                    display: 'flex', alignItems: 'center', gap: '4px',
                                                }}>
                                                <FiTrash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {allUsers.filter(u => u.role === 'admin').length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '24px', color: t.textMuted, fontSize: '13px' }}>
                                        No admins found. Create one above.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Data Erase */}
                        <div style={{
                            background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.12)',
                            borderRadius: '16px', padding: '24px',
                        }}>
                            <h3 style={{ fontWeight: 800, fontSize: '16px', marginBottom: '8px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FiAlertTriangle size={18} /> Erase Institute Data
                            </h3>
                            <p style={{ fontSize: '12px', color: t.textMuted, marginBottom: '16px' }}>
                                ⚠️ This will permanently delete all students, batches, and settings for an institute. This cannot be undone.
                            </p>

                            {eraseStep === 0 && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: t.textMuted, marginBottom: '4px' }}>Select Institute</label>
                                    <select value={eraseInstId} onChange={e => setEraseInstId(e.target.value)} style={{
                                        width: '100%', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${t.cardBorder}`,
                                        background: t.inputBg, color: t.text, fontSize: '13px', marginBottom: '12px',
                                    }}>
                                        <option value="">Select...</option>
                                        {institutes.filter(i => i.status !== 'erased').map(i => (
                                            <option key={i.id} value={i.id}>{i.name} ({i.id.substring(0, 8)}...)</option>
                                        ))}
                                    </select>
                                    <button onClick={() => eraseInstId && setEraseStep(1)} disabled={!eraseInstId}
                                        style={{
                                            padding: '10px 20px', borderRadius: '10px', border: 'none',
                                            background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                            cursor: 'pointer', fontWeight: 700, fontSize: '12px',
                                            opacity: !eraseInstId ? 0.5 : 1,
                                        }}>
                                        Next → Confirm
                                    </button>
                                </div>
                            )}

                            {eraseStep === 1 && (
                                <div>
                                    <p style={{ fontSize: '12px', color: '#ef4444', fontWeight: 700, marginBottom: '8px' }}>
                                        Type the institute name exactly to confirm:
                                        <strong style={{ display: 'block', marginTop: '4px', fontSize: '14px' }}>
                                            "{institutes.find(i => i.id === eraseInstId)?.name}"
                                        </strong>
                                    </p>
                                    <input type="text" value={eraseConfirmName} onChange={e => setEraseConfirmName(e.target.value)}
                                        placeholder="Type institute name here..." style={{
                                            width: '100%', padding: '10px 14px', borderRadius: '10px',
                                            border: '1px solid rgba(239,68,68,0.2)',
                                            background: t.inputBg, color: t.text, fontSize: '13px', marginBottom: '12px',
                                        }} />
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => {
                                            if (eraseConfirmName === institutes.find(i => i.id === eraseInstId)?.name) {
                                                setEraseStep(2);
                                            } else {
                                                setActionMsg({ text: 'Institute name does not match!', type: 'error' });
                                            }
                                        }} style={{
                                            padding: '10px 20px', borderRadius: '10px', border: 'none',
                                            background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                                            cursor: 'pointer', fontWeight: 700, fontSize: '12px',
                                        }}>
                                            Confirm Name
                                        </button>
                                        <button onClick={() => { setEraseStep(0); setEraseConfirmName(''); }} style={{
                                            padding: '10px 20px', borderRadius: '10px', border: `1px solid ${t.cardBorder}`,
                                            background: 'transparent', color: t.textMuted,
                                            cursor: 'pointer', fontWeight: 700, fontSize: '12px',
                                        }}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {eraseStep === 2 && (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
                                    <p style={{ fontSize: '14px', fontWeight: 800, color: '#ef4444', marginBottom: '4px' }}>
                                        FINAL CONFIRMATION
                                    </p>
                                    <p style={{ fontSize: '12px', color: t.textMuted, marginBottom: '16px' }}>
                                        All students, batches, and settings for <strong>"{eraseConfirmName}"</strong> will be permanently deleted.
                                    </p>
                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                        <button onClick={handleEraseInstitute} disabled={erasing} style={{
                                            padding: '12px 28px', borderRadius: '10px', border: 'none',
                                            background: '#ef4444', color: '#fff',
                                            cursor: 'pointer', fontWeight: 700, fontSize: '13px',
                                        }}>
                                            {erasing ? '⏳ Erasing...' : '🗑 YES, ERASE ALL DATA'}
                                        </button>
                                        <button onClick={() => { setEraseStep(0); setEraseConfirmName(''); }} style={{
                                            padding: '12px 28px', borderRadius: '10px', border: `1px solid ${t.cardBorder}`,
                                            background: 'transparent', color: t.textMuted,
                                            cursor: 'pointer', fontWeight: 700, fontSize: '13px',
                                        }}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
