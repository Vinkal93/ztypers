import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { FiArrowLeft, FiClock, FiMapPin, FiUser, FiMonitor, FiSmartphone, FiZap, FiUsers, FiActivity, FiBarChart2 } from 'react-icons/fi';

// Detect device type from userAgent
function parseDevice(ua = '') {
    if (!ua) return { type: 'Unknown', icon: '❓', browser: 'Unknown', os: 'Unknown' };
    const isMobile = /android|iphone|ipad|ipod|blackberry|windows phone/i.test(ua);
    let browser = 'Other';
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
    else if (/Firefox/i.test(ua)) browser = 'Firefox';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
    else if (/Edg/i.test(ua)) browser = 'Edge';
    let os = 'Other';
    if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Mac/i.test(ua)) os = 'Mac';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/iPhone|iPad/i.test(ua)) os = 'iOS';
    else if (/Linux/i.test(ua)) os = 'Linux';
    return { type: isMobile ? 'Mobile' : 'Desktop', icon: isMobile ? '📱' : '🖥️', browser, os };
}

const statCard = (icon, label, value, color) => (
    <div className="glass-card" style={{ flex: '1', minWidth: '150px', textAlign: 'center', padding: '20px 16px', borderTop: `3px solid ${color}` }}>
        <div style={{ fontSize: '26px', marginBottom: '4px' }}>{icon}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, color }}>{value}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
    </div>
);

export default function Analytics() {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState('sessions'); // sessions | devices | students

    useEffect(() => {
        const q = query(collection(db, 'session_logs'), orderBy('loginAt', 'desc'));
        const unsub1 = onSnapshot(q, snap => {
            setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        const unsub2 = onSnapshot(collection(db, 'students'), snap => {
            setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => { unsub1(); unsub2(); };
    }, []);

    const formatDate = (iso) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) +
            ' ' + new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayLogs = logs.filter(l => (l.loginAt || '').startsWith(todayStr));
    const uniqueToday = new Set(todayLogs.map(l => l.studentId)).size;
    const allWPMs = students.map(s => s.bestWPM || 0).filter(w => w > 0);
    const avgWPM = allWPMs.length ? Math.round(allWPMs.reduce((a, b) => a + b, 0) / allWPMs.length) : 0;
    const desktopCount = logs.filter(l => parseDevice(l.userAgent).type === 'Desktop').length;
    const mobileCount = logs.filter(l => parseDevice(l.userAgent).type === 'Mobile').length;

    // Location breakdown
    const locationMap = {};
    logs.forEach(l => {
        const loc = (l.location || 'Unknown').split(',')[0].trim();
        locationMap[loc] = (locationMap[loc] || 0) + 1;
    });
    const topLocations = Object.entries(locationMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

    const filtered = logs.filter(l =>
        (l.studentName || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.studentId || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.location || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="page-container fade-in">
            <button onClick={() => navigate('/admin')} className="btn btn-secondary" style={{ marginBottom: '24px' }}>
                <FiArrowLeft /> Back to Dashboard
            </button>

            <div className="page-header">
                <h1 className="page-title">📊 Analytics Dashboard</h1>
                <p className="page-subtitle">Real-time insights into student activity, devices, and performance</p>
            </div>

            {/* Overview Stats */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                {statCard('📋', 'Total Sessions', logs.length, 'var(--accent-primary)')}
                {statCard('👨‍🎓', 'Total Students', students.length, '#7c3aed')}
                {statCard('📅', 'Active Today', uniqueToday, 'var(--accent-success)')}
                {statCard('⚡', 'Avg Best WPM', avgWPM, 'var(--rank-gold)')}
                {statCard('🖥️', 'Desktop Users', desktopCount, '#0ea5e9')}
                {statCard('📱', 'Mobile Users', mobileCount, '#f97316')}
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: '20px' }}>
                {[['sessions', '🕑 Sessions'], ['devices', '📱 Devices & Locations'], ['students', '👨‍🎓 Student Performance']].map(([key, label]) => (
                    <button key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</button>
                ))}
            </div>

            {/* Sessions Tab */}
            {tab === 'sessions' && (
                <>
                    <div className="glass-card" style={{ marginBottom: '16px' }}>
                        <input type="text" className="input" placeholder="🔍 Search by name, ID or location..."
                            value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--bg-glass-border)' }}>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                                <FiClock style={{ marginRight: '8px' }} /> Login Sessions ({filtered.length})
                            </h3>
                        </div>
                        {filtered.length === 0 ? (
                            <div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">No sessions yet</div></div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>ID</th>
                                            <th>Login Time</th>
                                            <th>Device</th>
                                            <th>Browser / OS</th>
                                            <th>Location</th>
                                            <th>IP</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(l => {
                                            const dev = parseDevice(l.userAgent);
                                            return (
                                                <tr key={l.id}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: '#fff' }}>
                                                                {(l.studentName || '?')[0].toUpperCase()}
                                                            </div>
                                                            <span style={{ fontWeight: 600 }}>{l.studentName || '—'}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 600 }}>{l.studentId || '—'}</td>
                                                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{formatDate(l.loginAt)}</td>
                                                    <td>
                                                        <span style={{ fontSize: '13px' }}>{dev.icon} {dev.type}</span>
                                                    </td>
                                                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{dev.browser} / {dev.os}</td>
                                                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                        <FiMapPin size={11} style={{ marginRight: '4px' }} />{(l.location || 'Unknown').split('(')[0].trim()}
                                                    </td>
                                                    <td style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                                                        {l.ip || (l.location || '').match(/\((.+?)\)/)?.[1] || '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Devices & Locations Tab */}
            {tab === 'devices' && (
                <div className="grid-2">
                    {/* Device breakdown */}
                    <div className="glass-card">
                        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '20px' }}>
                            📱 Device Breakdown
                        </h3>
                        {logs.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>No data yet</p>
                        ) : (
                            <>
                                {[
                                    { label: 'Desktop', count: desktopCount, icon: '🖥️', color: '#0ea5e9' },
                                    { label: 'Mobile', count: mobileCount, icon: '📱', color: '#f97316' },
                                ].map((d, i) => {
                                    const pct = logs.length ? Math.round((d.count / logs.length) * 100) : 0;
                                    return (
                                        <div key={i} style={{ marginBottom: '20px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <span style={{ fontWeight: 600 }}>{d.icon} {d.label}</span>
                                                <span style={{ fontFamily: 'var(--font-mono)', color: d.color, fontWeight: 700 }}>{d.count} ({pct}%)</span>
                                            </div>
                                            <div style={{ height: '8px', background: 'var(--bg-input)', borderRadius: '99px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${pct}%`, background: d.color, borderRadius: '99px', transition: 'width 1s ease' }} />
                                            </div>
                                        </div>
                                    );
                                })}
                                <div style={{ marginTop: '16px' }}>
                                    <h4 style={{ fontWeight: 700, marginBottom: '12px', fontSize: '13px' }}>Browser Usage</h4>
                                    {['Chrome', 'Firefox', 'Edge', 'Safari', 'Other'].map(b => {
                                        const cnt = logs.filter(l => parseDevice(l.userAgent).browser === b).length;
                                        if (!cnt) return null;
                                        return (
                                            <div key={b} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bg-glass-border)', fontSize: '13px' }}>
                                                <span>{b}</span>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{cnt}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Location breakdown */}
                    <div className="glass-card">
                        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '20px' }}>
                            📍 Top Locations
                        </h3>
                        {topLocations.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>No location data yet</p>
                        ) : topLocations.map(([city, cnt], i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--bg-glass-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '12px', color: 'var(--accent-primary)' }}>#{i + 1}</span>
                                    <span style={{ fontWeight: 600 }}>{city}</span>
                                </div>
                                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-success)', fontWeight: 700 }}>{cnt} sessions</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Student Performance Tab */}
            {tab === 'students' && (
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--bg-glass-border)' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                            <FiBarChart2 style={{ marginRight: '8px' }} /> Student Performance
                        </h3>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Name</th>
                                    <th>ID</th>
                                    <th>Best WPM</th>
                                    <th>Competitions</th>
                                    <th>Status</th>
                                    <th>Badges</th>
                                    <th>Last Session</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...students].sort((a, b) => (b.bestWPM || 0) - (a.bestWPM || 0)).map((s, i) => {
                                    const lastLog = logs.find(l => l.studentId === s.studentId || l.studentId === s.id);
                                    return (
                                        <tr key={s.id}>
                                            <td style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: i === 0 ? 'var(--rank-gold)' : i === 1 ? 'var(--rank-silver)' : i === 2 ? 'var(--rank-bronze)' : 'var(--text-muted)' }}>
                                                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{s.name}</td>
                                            <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontSize: '12px' }}>{s.studentId}</td>
                                            <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 700 }}>{s.bestWPM || 0}</td>
                                            <td>{s.totalCompetitions || 0}</td>
                                            <td>
                                                <span style={{
                                                    padding: '3px 8px', borderRadius: 'var(--radius-full)', fontSize: '11px', fontWeight: 700,
                                                    background: s.status === 'disabled' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                                    color: s.status === 'disabled' ? '#ef4444' : '#10b981',
                                                    border: `1px solid ${s.status === 'disabled' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                                                }}>
                                                    {s.status === 'disabled' ? '🔒 Disabled' : '✓ Active'}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '15px', letterSpacing: '2px' }}>
                                                {(s.badges || []).map(b => ({ first_login: '👋', speedster_50: '⚡', speedster_100: '🚀', speedster_150: '🔥', accuracy_100: '🎯', winner: '🏆', competitor_5: '🎮', competitor_10: '💪' })[b] || '').join('')}
                                            </td>
                                            <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{lastLog ? formatDate(lastLog.loginAt) : 'Never'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
