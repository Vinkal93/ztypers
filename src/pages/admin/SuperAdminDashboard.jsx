import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
    FiShield, FiUsers, FiHome, FiActivity, FiBarChart2, FiLogOut,
    FiChevronDown, FiChevronUp, FiSearch, FiGlobe, FiMonitor, FiSmartphone,
    FiCalendar, FiAward, FiZap, FiSun, FiMoon,
} from 'react-icons/fi';

const THEMES = {
    dark: {
        bg: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d0d1f 100%)',
        text: '#fff', textMuted: 'rgba(255,255,255,0.5)', textDim: 'rgba(255,255,255,0.3)',
        textSubtle: 'rgba(255,255,255,0.4)', card: 'rgba(255,255,255,0.04)',
        cardBorder: 'rgba(255,255,255,0.08)', barBg: 'rgba(255,255,255,0.8)',
        inputBg: 'rgba(255,255,255,0.05)', topBar: 'rgba(15,15,35,0.8)',
        topBarBorder: 'rgba(255,255,255,0.06)', rowBorder: 'rgba(255,255,255,0.03)',
        tagBg: 'rgba(255,255,255,0.05)', tagBorder: 'rgba(255,255,255,0.06)',
    },
    light: {
        bg: 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 50%, #f8fafc 100%)',
        text: '#1e293b', textMuted: '#64748b', textDim: '#94a3b8',
        textSubtle: '#475569', card: 'rgba(255,255,255,0.7)',
        cardBorder: 'rgba(0,0,0,0.08)', barBg: 'rgba(0,0,0,0.8)',
        inputBg: 'rgba(0,0,0,0.04)', topBar: 'rgba(255,255,255,0.85)',
        topBarBorder: 'rgba(0,0,0,0.08)', rowBorder: 'rgba(0,0,0,0.04)',
        tagBg: 'rgba(0,0,0,0.04)', tagBorder: 'rgba(0,0,0,0.08)',
    },
};

function parseUA(ua) {
    if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };
    let browser = 'Other', os = 'Unknown', device = 'Desktop';
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
    else if (/Firefox/i.test(ua)) browser = 'Firefox';
    else if (/Edg/i.test(ua)) browser = 'Edge';
    if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Mac/i.test(ua)) os = 'macOS';
    else if (/Android/i.test(ua)) { os = 'Android'; device = 'Mobile'; }
    else if (/iPhone|iPad/i.test(ua)) { os = 'iOS'; device = 'Mobile'; }
    else if (/Linux/i.test(ua)) os = 'Linux';
    return { browser, os, device };
}

export default function SuperAdminDashboard() {
    const navigate = useNavigate();
    const [suSession, setSuSession] = useState(null);
    const [tab, setTab] = useState('overview');
    const [dark, setDark] = useState(true);
    const t = THEMES[dark ? 'dark' : 'light'];

    // Data
    const [institutes, setInstitutes] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [allEvents, setAllEvents] = useState([]);
    const [allSessions, setAllSessions] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedInst, setExpandedInst] = useState(null);
    const [searchQ, setSearchQ] = useState('');

    // Auth check
    useEffect(() => {
        const sess = sessionStorage.getItem('su_session');
        if (!sess) { navigate('/SU'); return; }
        try { setSuSession(JSON.parse(sess)); } catch { navigate('/SU'); }
    }, [navigate]);

    // Fetch all data
    useEffect(() => {
        if (!suSession) return;
        (async () => {
            try {
                const [instSnap, studSnap, evtSnap, sessSnap, usrSnap] = await Promise.all([
                    getDocs(collection(db, 'institutes')),
                    getDocs(collection(db, 'students')),
                    getDocs(collection(db, 'events')),
                    getDocs(query(collection(db, 'session_logs'), orderBy('loginAt', 'desc'), limit(500))),
                    getDocs(collection(db, 'users')),
                ]);
                setInstitutes(instSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setAllStudents(studSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setAllEvents(evtSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setAllSessions(sessSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setAllUsers(usrSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) { console.error('SU Data Error:', err); }
            setLoading(false);
        })();
    }, [suSession]);

    const handleLogout = () => {
        sessionStorage.removeItem('su_session');
        navigate('/SU');
    };

    if (!suSession) return null;

    // Stats
    const totalInstitutes = institutes.length;
    const totalAdmins = allUsers.filter(u => u.role === 'admin').length;
    const totalStudents = allStudents.length;
    const totalEvents = allEvents.length;
    const liveEvents = allEvents.filter(e => e.status === 'live').length;
    const totalSessions = allSessions.length;

    // Location stats
    const locationMap = {};
    allSessions.forEach(s => {
        const loc = s.location || 'Unknown';
        locationMap[loc] = (locationMap[loc] || 0) + 1;
    });
    const topLocations = Object.entries(locationMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

    // Device stats
    const deviceStats = { Desktop: 0, Mobile: 0 };
    const browserStats = {};
    const osStats = {};
    allSessions.forEach(s => {
        const p = parseUA(s.userAgent || s.device);
        deviceStats[p.device] = (deviceStats[p.device] || 0) + 1;
        browserStats[p.browser] = (browserStats[p.browser] || 0) + 1;
        osStats[p.os] = (osStats[p.os] || 0) + 1;
    });

    // Filter institutes
    const filteredInstitutes = institutes.filter(inst =>
        (inst.name || '').toLowerCase().includes(searchQ.toLowerCase()) ||
        (inst.ownerEmail || '').toLowerCase().includes(searchQ.toLowerCase())
    );

    const tabs = [
        { id: 'overview', label: 'Overview', icon: <FiBarChart2 size={15} /> },
        { id: 'institutes', label: 'Institutes', icon: <FiHome size={15} /> },
        { id: 'analytics', label: 'Analytics', icon: <FiActivity size={15} /> },
    ];

    const StatCard = ({ icon, label, value, color, sub }) => (
        <div style={{
            flex: '1', minWidth: '160px', padding: '20px', borderRadius: '16px',
            background: t.card, border: `1px solid ${t.cardBorder}`,
            borderTop: `3px solid ${color}`,
            transition: 'transform 0.2s', cursor: 'default',
        }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: '22px', marginBottom: '8px' }}>{icon}</div>
            <div style={{ fontFamily: 'var(--font-display, Inter)', fontSize: '28px', fontWeight: 900, color }}>{value}</div>
            <div style={{ fontSize: '12px', color: t.textMuted, fontWeight: 600 }}>{label}</div>
            {sub && <div style={{ fontSize: '11px', color: t.textDim, marginTop: '4px' }}>{sub}</div>}
        </div>
    );

    return (
        <div style={{
            minHeight: '100vh',
            background: t.bg, color: t.text,
            transition: 'background 0.3s ease, color 0.3s ease',
        }}>
            {/* Top bar */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 32px', borderBottom: `1px solid ${t.topBarBorder}`,
                background: t.topBar, backdropFilter: 'blur(12px)',
                position: 'sticky', top: 0, zIndex: 100,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                    }}>
                        <FiShield size={18} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '15px' }}>Super Admin</div>
                        <div style={{ fontSize: '11px', color: t.textSubtle }}>{suSession.email}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Theme toggle */}
                    <button onClick={() => setDark(!dark)} title={dark ? 'Light mode' : 'Dark mode'} style={{
                        width: '36px', height: '36px', borderRadius: '10px', border: `1px solid ${t.cardBorder}`,
                        background: t.card, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: t.text, transition: 'all 0.2s ease',
                    }}>
                        {dark ? <FiSun size={16} /> : <FiMoon size={16} />}
                    </button>
                    <button onClick={handleLogout} style={{
                        padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)',
                        background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer',
                        fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                        <FiLogOut size={14} /> Logout
                    </button>
                </div>
            </div>

            <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
                {/* Tabs */}
                <div style={{
                    display: 'flex', gap: '4px', marginBottom: '32px',
                    background: t.card, padding: '4px', borderRadius: '14px',
                    border: `1px solid ${t.cardBorder}`, maxWidth: '450px',
                }}>
                    {tabs.map(tb => (
                        <button key={tb.id} onClick={() => setTab(tb.id)}
                            style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                padding: '10px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                fontWeight: 700, fontSize: '13px', transition: 'all 0.2s ease',
                                background: tab === tb.id ? 'linear-gradient(135deg, #7c3aed, #3b82f6)' : 'transparent',
                                color: tab === tb.id ? '#fff' : t.textSubtle,
                            }}>
                            {tb.icon} {tb.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '80px', color: t.textSubtle }}>
                        Loading platform data...
                    </div>
                ) : (
                    <>
                        {/* ══════════ OVERVIEW ══════════ */}
                        {tab === 'overview' && (
                            <>
                                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
                                    <StatCard icon="🏫" label="Institutes" value={totalInstitutes} color="#7c3aed" />
                                    <StatCard icon="👑" label="Admins" value={totalAdmins} color="#3b82f6" />
                                    <StatCard icon="👨‍🎓" label="Students" value={totalStudents} color="#10b981" />
                                    <StatCard icon="📅" label="Events" value={totalEvents} color="#f59e0b" sub={`${liveEvents} live now`} />
                                    <StatCard icon="📊" label="Sessions" value={totalSessions} color="#ec4899" />
                                </div>

                                {/* Recent sessions */}
                                <div style={{
                                    background: t.card, border: `1px solid ${t.cardBorder}`,
                                    borderRadius: '16px', overflow: 'hidden',
                                }}>
                                    <div style={{ padding: '18px 24px', borderBottom: `1px solid ${t.cardBorder}`, fontWeight: 800, fontSize: '15px' }}>
                                        📊 Recent Sessions
                                    </div>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                            <thead>
                                                <tr style={{ borderBottom: `1px solid ${t.cardBorder}` }}>
                                                    {['Student', 'Login', 'Device', 'Location'].map(h => (
                                                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: t.textSubtle, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '10px' }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {allSessions.slice(0, 15).map((s, i) => {
                                                    const p = parseUA(s.userAgent || s.device);
                                                    return (
                                                        <tr key={i} style={{ borderBottom: `1px solid ${t.rowBorder}` }}>
                                                            <td style={{ padding: '10px 16px', fontWeight: 600 }}>{s.studentName || s.studentId || '-'}</td>
                                                            <td style={{ padding: '10px 16px', color: t.textMuted }}>{s.loginAt ? new Date(s.loginAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                            <td style={{ padding: '10px 16px' }}>
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                    {p.device === 'Mobile' ? <FiSmartphone size={11} /> : <FiMonitor size={11} />}
                                                                    {p.browser} / {p.os}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '10px 16px', color: t.textMuted }}>{s.location || '-'}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ══════════ INSTITUTES ══════════ */}
                        {tab === 'institutes' && (
                            <>
                                <div style={{ marginBottom: '20px', position: 'relative', maxWidth: '400px' }}>
                                    <FiSearch size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: t.textDim }} />
                                    <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
                                        placeholder="Search institutes or admins..."
                                        style={{
                                            width: '100%', padding: '12px 14px 12px 40px', borderRadius: '12px',
                                            background: t.inputBg, border: `1px solid ${t.cardBorder}`,
                                            color: t.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                                        }} />
                                </div>

                                <div style={{ display: 'grid', gap: '12px' }}>
                                    {filteredInstitutes.map(inst => {
                                        const instStudents = allStudents.filter(s => s.instituteId === inst.id);
                                        const instEvents = allEvents.filter(e => e.instituteId === inst.id);
                                        const instAdmin = allUsers.find(u => u.instituteId === inst.id && u.role === 'admin');
                                        const isExpanded = expandedInst === inst.id;

                                        return (
                                            <div key={inst.id} style={{
                                                background: t.card, border: `1px solid ${t.cardBorder}`,
                                                borderRadius: '16px', overflow: 'hidden',
                                                transition: 'all 0.2s ease',
                                            }}>
                                                <div onClick={() => setExpandedInst(isExpanded ? null : inst.id)}
                                                    style={{
                                                        padding: '18px 24px', cursor: 'pointer',
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    }}>
                                                    <div>
                                                        <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '4px' }}>
                                                            🏫 {inst.name || 'Unnamed Institute'}
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: t.textSubtle }}>
                                                            Admin: {instAdmin?.name || inst.ownerEmail || '-'} • {inst.ownerEmail || '-'}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: t.textMuted }}>
                                                            <span>👨‍🎓 {instStudents.length}</span>
                                                            <span>📅 {instEvents.length}</span>
                                                        </div>
                                                        {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div style={{ padding: '0 24px 20px', borderTop: `1px solid ${t.rowBorder}` }}>
                                                        <div style={{ paddingTop: '16px' }}>
                                                            {/* Institute details */}
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                                                                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
                                                                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#7c3aed' }}>{instStudents.length}</div>
                                                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Students</div>
                                                                </div>
                                                                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
                                                                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#3b82f6' }}>{instEvents.length}</div>
                                                                    <div style={{ fontSize: '10px', color: t.textSubtle, fontWeight: 600 }}>Events</div>
                                                                </div>
                                                                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                                                                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#10b981' }}>{instStudents.filter(s => (s.status || 'active') === 'active').length}</div>
                                                                    <div style={{ fontSize: '10px', color: t.textSubtle, fontWeight: 600 }}>Active</div>
                                                                </div>
                                                                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                                                                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#f59e0b' }}>{instEvents.filter(e => e.status === 'live').length}</div>
                                                                    <div style={{ fontSize: '10px', color: t.textSubtle, fontWeight: 600 }}>Live Events</div>
                                                                </div>
                                                            </div>

                                                            {/* Student list */}
                                                            {instStudents.length > 0 && (
                                                                <div style={{ marginTop: '8px' }}>
                                                                    <div style={{ fontSize: '12px', fontWeight: 700, color: t.textMuted, marginBottom: '8px' }}>Students</div>
                                                                    <div style={{ overflowX: 'auto' }}>
                                                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                                            <thead>
                                                                                <tr style={{ borderBottom: `1px solid ${t.rowBorder}` }}>
                                                                                    {['Name', 'ID', 'WPM', 'Status'].map(h => (
                                                                                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: t.textDim, fontSize: '10px', textTransform: 'uppercase' }}>{h}</th>
                                                                                    ))}
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {instStudents.slice(0, 10).map(st => (
                                                                                    <tr key={st.id} style={{ borderBottom: `1px solid ${t.rowBorder}` }}>
                                                                                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{st.name}</td>
                                                                                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#7c3aed' }}>{st.studentId}</td>
                                                                                        <td style={{ padding: '8px 12px', color: '#3b82f6' }}>{st.bestWPM || 0}</td>
                                                                                        <td style={{ padding: '8px 12px' }}>
                                                                                            <span style={{
                                                                                                padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                                                                                                background: (st.status || 'active') === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                                                                color: (st.status || 'active') === 'active' ? '#10b981' : '#ef4444',
                                                                                            }}>{st.status || 'active'}</span>
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                        {instStudents.length > 10 && <div style={{ fontSize: '11px', color: t.textDim, padding: '8px 12px' }}>+{instStudents.length - 10} more...</div>}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {/* ══════════ ANALYTICS ══════════ */}
                        {tab === 'analytics' && (
                            <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
                                {/* Location breakdown */}
                                <div style={{
                                    background: t.card, border: `1px solid ${t.cardBorder}`,
                                    borderRadius: '16px', padding: '24px',
                                }}>
                                    <h3 style={{ fontWeight: 800, fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <FiGlobe size={16} /> Top Locations
                                    </h3>
                                    {topLocations.length === 0 ? (
                                        <div style={{ fontSize: '13px', color: t.textDim }}>No location data yet</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {topLocations.map(([loc, count], i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 600, minWidth: '140px', color: t.textMuted }}>{loc}</span>
                                                    <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: t.inputBg }}>
                                                        <div style={{
                                                            height: '100%', borderRadius: '4px',
                                                            background: 'linear-gradient(90deg, #7c3aed, #3b82f6)',
                                                            width: `${(count / topLocations[0][1]) * 100}%`,
                                                            transition: 'width 0.5s ease',
                                                        }} />
                                                    </div>
                                                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#7c3aed', minWidth: '30px', textAlign: 'right' }}>{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Device breakdown */}
                                <div style={{
                                    background: t.card, border: `1px solid ${t.cardBorder}`,
                                    borderRadius: '16px', padding: '24px',
                                }}>
                                    <h3 style={{ fontWeight: 800, fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <FiMonitor size={16} /> Devices & Browsers
                                    </h3>

                                    {/* Device ratio */}
                                    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                                        {Object.entries(deviceStats).map(([d, v]) => (
                                            <div key={d} style={{
                                                flex: 1, padding: '14px', borderRadius: '12px', textAlign: 'center',
                                                background: d === 'Desktop' ? 'rgba(59,130,246,0.08)' : 'rgba(236,72,153,0.08)',
                                                border: `1px solid ${d === 'Desktop' ? 'rgba(59,130,246,0.15)' : 'rgba(236,72,153,0.15)'}`,
                                            }}>
                                                {d === 'Desktop' ? <FiMonitor size={18} style={{ color: '#3b82f6' }} /> : <FiSmartphone size={18} style={{ color: '#ec4899' }} />}
                                                <div style={{ fontSize: '20px', fontWeight: 900, color: d === 'Desktop' ? '#3b82f6' : '#ec4899', marginTop: '4px' }}>{v}</div>
                                                <div style={{ fontSize: '10px', color: t.textSubtle, fontWeight: 600 }}>{d}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Browser breakdown */}
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: t.textMuted, marginBottom: '8px' }}>Browsers</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {Object.entries(browserStats).sort((a, b) => b[1] - a[1]).map(([br, v], i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 600, minWidth: '80px', color: t.textMuted }}>{br}</span>
                                                <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: t.inputBg }}>
                                                    <div style={{
                                                        height: '100%', borderRadius: '3px',
                                                        background: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#7c3aed'][i % 5],
                                                        width: `${(v / Math.max(...Object.values(browserStats))) * 100}%`,
                                                    }} />
                                                </div>
                                                <span style={{ fontSize: '11px', fontWeight: 700, minWidth: '24px', textAlign: 'right', color: t.textMuted }}>{v}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* OS breakdown */}
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: t.textMuted, marginBottom: '8px', marginTop: '16px' }}>Operating Systems</div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {Object.entries(osStats).sort((a, b) => b[1] - a[1]).map(([os, v], i) => (
                                            <span key={i} style={{
                                                padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                                                background: t.tagBg, border: `1px solid ${t.tagBorder}`,
                                                color: t.textMuted,
                                            }}>{os}: {v}</span>
                                        ))}
                                    </div>
                                </div>

                                {/* All Events overview */}
                                <div style={{
                                    background: t.card, border: `1px solid ${t.cardBorder}`,
                                    borderRadius: '16px', padding: '24px', gridColumn: '1 / -1',
                                }}>
                                    <h3 style={{ fontWeight: 800, fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <FiCalendar size={16} /> All Events Across Platform
                                    </h3>
                                    {allEvents.length === 0 ? (
                                        <div style={{ color: t.textDim, fontSize: '13px' }}>No events yet</div>
                                    ) : (
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: `1px solid ${t.cardBorder}` }}>
                                                        {['Event', 'Institute', 'Date', 'Prize', 'Status'].map(h => (
                                                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: t.textSubtle, fontSize: '10px', textTransform: 'uppercase' }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {allEvents.slice(0, 20).map(ev => {
                                                        const inst = institutes.find(i => i.id === ev.instituteId);
                                                        return (
                                                            <tr key={ev.id} style={{ borderBottom: `1px solid ${t.rowBorder}` }}>
                                                                <td style={{ padding: '10px 14px', fontWeight: 600 }}>{ev.title}</td>
                                                                <td style={{ padding: '10px 14px', color: t.textMuted }}>{inst?.name || '-'}</td>
                                                                <td style={{ padding: '10px 14px', color: t.textMuted }}>{ev.eventDate ? new Date(ev.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'}</td>
                                                                <td style={{ padding: '10px 14px', color: '#f59e0b', fontWeight: 700 }}>{ev.prize > 0 ? `₹${ev.prize}` : '-'}</td>
                                                                <td style={{ padding: '10px 14px' }}>
                                                                    <span style={{
                                                                        padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                                                                        background: ev.status === 'live' ? 'rgba(239,68,68,0.1)' : ev.status === 'ended' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
                                                                        color: ev.status === 'live' ? '#ef4444' : ev.status === 'ended' ? '#10b981' : '#3b82f6',
                                                                    }}>{ev.status || 'upcoming'}</span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
