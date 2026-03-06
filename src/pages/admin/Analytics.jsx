import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { FiArrowLeft, FiClock, FiMapPin, FiUser, FiBarChart2, FiActivity, FiTrendingUp } from 'react-icons/fi';

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

const statCard = (icon, label, value, color, subtext) => (
    <div className="glass-card" style={{ flex: '1', minWidth: '140px', textAlign: 'center', padding: '20px 16px', borderTop: `3px solid ${color}`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '48px', opacity: 0.05, fontWeight: 900 }}>{icon}</div>
        <div style={{ fontSize: '26px', marginBottom: '4px', position: 'relative' }}>{icon}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, color, position: 'relative' }}>{value}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, position: 'relative' }}>{label}</div>
        {subtext && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', position: 'relative' }}>{subtext}</div>}
    </div>
);

// Pure CSS Bar chart component
const BarChart = ({ data, title, color = 'var(--accent-primary)' }) => {
    const maxVal = Math.max(...data.map(d => d.value), 1);
    return (
        <div>
            <h4 style={{ fontWeight: 700, marginBottom: '16px', fontSize: '14px' }}>{title}</h4>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px', padding: '0 4px' }}>
                {data.map((d, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                            {d.value > 0 ? d.value : ''}
                        </div>
                        <div style={{
                            width: '100%', maxWidth: '40px',
                            height: `${Math.max((d.value / maxVal) * 100, 2)}%`,
                            background: color, borderRadius: '4px 4px 0 0',
                            transition: 'height 0.5s ease', minHeight: '2px',
                            opacity: d.value > 0 ? 1 : 0.2,
                        }} />
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center', lineHeight: 1.2 }}>
                            {d.label}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Activity Heatmap (last 4 weeks, 7 days per row)
const ActivityHeatmap = ({ logs }) => {
    const heatData = useMemo(() => {
        const days = {};
        const today = new Date();
        // Build last 28 days
        for (let i = 27; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            days[key] = 0;
        }
        logs.forEach(l => {
            const key = (l.loginAt || '').slice(0, 10);
            if (days[key] !== undefined) days[key]++;
        });
        return Object.entries(days).map(([date, count]) => ({ date, count }));
    }, [logs]);

    const maxCount = Math.max(...heatData.map(d => d.count), 1);
    const getColor = (count) => {
        if (count === 0) return 'var(--bg-input)';
        const intensity = Math.min(count / maxCount, 1);
        if (intensity < 0.25) return 'rgba(0,212,255,0.15)';
        if (intensity < 0.5) return 'rgba(0,212,255,0.35)';
        if (intensity < 0.75) return 'rgba(0,212,255,0.55)';
        return 'rgba(0,212,255,0.8)';
    };

    // Split into 4 weeks (rows of 7)
    const weeks = [];
    for (let i = 0; i < heatData.length; i += 7) {
        weeks.push(heatData.slice(i, i + 7));
    }

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
        <div>
            <h4 style={{ fontWeight: 700, marginBottom: '12px', fontSize: '14px' }}>📅 Activity Heatmap (Last 28 Days)</h4>
            <div style={{ display: 'flex', gap: '2px', flexDirection: 'column' }}>
                {/* Day labels */}
                <div style={{ display: 'flex', gap: '2px', marginBottom: '4px' }}>
                    {dayLabels.map(d => (
                        <div key={d} style={{ flex: 1, fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 600 }}>{d}</div>
                    ))}
                </div>
                {weeks.map((week, wi) => (
                    <div key={wi} style={{ display: 'flex', gap: '2px' }}>
                        {week.map((day, di) => (
                            <div key={di} title={`${day.date}: ${day.count} sessions`}
                                style={{
                                    flex: 1, aspectRatio: '1', borderRadius: '3px',
                                    background: getColor(day.count), cursor: 'pointer',
                                    transition: 'all 0.2s ease', minHeight: '14px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '8px', fontWeight: 700, color: day.count > 0 ? 'rgba(255,255,255,0.8)' : 'transparent',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}>
                                {day.count > 0 ? day.count : ''}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Less</span>
                {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
                    <div key={i} style={{ width: '12px', height: '12px', borderRadius: '2px', background: getColor(v * maxCount) }} />
                ))}
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>More</span>
            </div>
        </div>
    );
};

export default function Analytics() {
    const navigate = useNavigate();
    const { userData } = useAuth();
    const [logs, setLogs] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState('overview'); // overview | sessions | devices | students

    const instituteId = userData?.instituteId || '';

    useEffect(() => {
        if (!instituteId) return;
        let unsub1 = () => { }, unsub2 = () => { };
        let cancelled = false;

        (async () => {
            // Migrate session_logs without instituteId or with orphaned instituteId
            try {
                const [allSessions, instSnap] = await Promise.all([
                    getDocs(collection(db, 'session_logs')),
                    getDocs(collection(db, 'institutes')),
                ]);
                const validIds = new Set(instSnap.docs.map(d => d.id));
                const updates = [];
                allSessions.docs.forEach(d => {
                    const data = d.data();
                    if (!data.instituteId || !validIds.has(data.instituteId)) {
                        updates.push(updateDoc(doc(db, 'session_logs', d.id), { instituteId }));
                    }
                });
                if (updates.length > 0) await Promise.all(updates);
            } catch (err) { console.error('Session migration:', err); }

            if (cancelled) return;

            // Listen — no orderBy to avoid needing composite index, sort client-side
            const q = query(collection(db, 'session_logs'), where('instituteId', '==', instituteId));
            unsub1 = onSnapshot(q, snap => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                data.sort((a, b) => (b.loginAt || '').localeCompare(a.loginAt || ''));
                setLogs(data);
                setLoading(false);
            });
            const q2 = query(collection(db, 'students'), where('instituteId', '==', instituteId));
            unsub2 = onSnapshot(q2, snap => {
                setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });
        })();

        return () => { cancelled = true; unsub1(); unsub2(); };
    }, [instituteId]);

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
    const maxWPM = allWPMs.length ? Math.max(...allWPMs) : 0;
    const desktopCount = logs.filter(l => parseDevice(l.userAgent).type === 'Desktop').length;
    const mobileCount = logs.filter(l => parseDevice(l.userAgent).type === 'Mobile').length;

    // WPM distribution buckets
    const wpmDistribution = useMemo(() => {
        const buckets = [
            { label: '0-20', min: 0, max: 20, value: 0 },
            { label: '20-40', min: 20, max: 40, value: 0 },
            { label: '40-60', min: 40, max: 60, value: 0 },
            { label: '60-80', min: 60, max: 80, value: 0 },
            { label: '80-100', min: 80, max: 100, value: 0 },
            { label: '100+', min: 100, max: Infinity, value: 0 },
        ];
        students.forEach(s => {
            const w = s.bestWPM || 0;
            if (w <= 0) return;
            const bucket = buckets.find(b => w >= b.min && w < b.max);
            if (bucket) bucket.value++;
        });
        return buckets;
    }, [students]);

    // Hourly activity distribution
    const hourlyActivity = useMemo(() => {
        const hours = Array.from({ length: 24 }, (_, i) => ({
            label: `${i.toString().padStart(2, '0')}`,
            value: 0,
        }));
        logs.forEach(l => {
            if (!l.loginAt) return;
            const hour = new Date(l.loginAt).getHours();
            hours[hour].value++;
        });
        return hours;
    }, [logs]);

    // Location breakdown
    const locationMap = {};
    logs.forEach(l => {
        const loc = (l.location || 'Unknown').split(',')[0].trim();
        locationMap[loc] = (locationMap[loc] || 0) + 1;
    });
    const topLocations = Object.entries(locationMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

    // Weekly trend (last 7 days)
    const weeklyTrend = useMemo(() => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
            const count = logs.filter(l => (l.loginAt || '').startsWith(key)).length;
            days.push({ label: dayName, value: count });
        }
        return days;
    }, [logs]);

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
                <p className="page-subtitle">Real-time insights into student activity, performance, and engagement</p>
            </div>

            {/* Overview Stats */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                {statCard('📋', 'Total Sessions', logs.length, 'var(--accent-primary)')}
                {statCard('👨‍🎓', 'Total Students', students.length, '#7c3aed')}
                {statCard('📅', 'Active Today', uniqueToday, 'var(--accent-success)', `${todayLogs.length} sessions`)}
                {statCard('⚡', 'Avg Best WPM', avgWPM, 'var(--rank-gold)', `Max: ${maxWPM}`)}
                {statCard('🖥️', 'Desktop', desktopCount, '#0ea5e9', `${logs.length ? Math.round(desktopCount / logs.length * 100) : 0}%`)}
                {statCard('📱', 'Mobile', mobileCount, '#f97316', `${logs.length ? Math.round(mobileCount / logs.length * 100) : 0}%`)}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--bg-glass)', padding: '4px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--bg-glass-border)', flexWrap: 'wrap' }}>
                {[
                    ['overview', '📈 Overview'],
                    ['sessions', '🕑 Sessions'],
                    ['devices', '📱 Devices & Locations'],
                    ['students', '👨‍🎓 Student Performance'],
                ].map(([key, label]) => (
                    <button key={key} onClick={() => setTab(key)}
                        style={{
                            flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                            fontWeight: 700, fontSize: '12px', transition: 'all 0.2s ease', minWidth: '100px',
                            background: tab === key ? 'var(--accent-gradient)' : 'transparent',
                            color: tab === key ? '#fff' : 'var(--text-secondary)',
                        }}>
                        {label}
                    </button>
                ))}
            </div>

            {/* ── OVERVIEW TAB ── */}
            {tab === 'overview' && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                        {/* WPM Distribution */}
                        <div className="glass-card">
                            <BarChart data={wpmDistribution} title="⚡ WPM Distribution" color="var(--accent-primary)" />
                        </div>

                        {/* Weekly Trend */}
                        <div className="glass-card">
                            <BarChart data={weeklyTrend} title="📈 Weekly Login Trend" color="var(--accent-success)" />
                        </div>

                        {/* Hourly Activity */}
                        <div className="glass-card">
                            <BarChart data={hourlyActivity} title="🕐 Hourly Activity (All Time)" color="#7c3aed" />
                        </div>

                        {/* Activity Heatmap */}
                        <div className="glass-card">
                            <ActivityHeatmap logs={logs} />
                        </div>
                    </div>

                    {/* Top Performers */}
                    <div className="glass-card">
                        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FiTrendingUp /> Top 5 Performers
                        </h3>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            {[...students].sort((a, b) => (b.bestWPM || 0) - (a.bestWPM || 0)).slice(0, 5).map((s, i) => (
                                <div key={s.id} style={{
                                    flex: '1', minWidth: '140px', padding: '16px', borderRadius: 'var(--radius-md)',
                                    background: 'var(--bg-input)', textAlign: 'center',
                                    border: i === 0 ? '2px solid var(--rank-gold)' : '1px solid var(--bg-glass-border)',
                                }}>
                                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>
                                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '2px' }}>{s.name}</div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                                        {s.bestWPM || 0} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>WPM</span>
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        {s.totalCompetitions || 0} competitions
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* ── SESSIONS TAB ── */}
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
                                        {filtered.slice(0, 100).map(l => {
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

            {/* ── DEVICES & LOCATIONS TAB ── */}
            {tab === 'devices' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
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
                                        const pct = logs.length ? Math.round((cnt / logs.length) * 100) : 0;
                                        return (
                                            <div key={b} style={{ marginBottom: '12px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                                                    <span>{b}</span>
                                                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{cnt} ({pct}%)</span>
                                                </div>
                                                <div style={{ height: '6px', background: 'var(--bg-input)', borderRadius: '99px', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent-secondary)', borderRadius: '99px', transition: 'width 0.8s ease' }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    {/* OS breakdown */}
                    <div className="glass-card">
                        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '20px' }}>
                            💻 OS Distribution
                        </h3>
                        {['Windows', 'Mac', 'Android', 'iOS', 'Linux', 'Other'].map(osName => {
                            const cnt = logs.filter(l => parseDevice(l.userAgent).os === osName).length;
                            if (!cnt) return null;
                            const pct = logs.length ? Math.round((cnt / logs.length) * 100) : 0;
                            const colors = { Windows: '#0078d4', Mac: '#333', Android: '#3ddc84', iOS: '#a2aaad', Linux: '#fcc624', Other: '#666' };
                            return (
                                <div key={osName} style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: 600 }}>{osName}</span>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: colors[osName] }}>{cnt} ({pct}%)</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'var(--bg-input)', borderRadius: '99px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${pct}%`, background: colors[osName], borderRadius: '99px', transition: 'width 0.8s ease' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Location breakdown */}
                    <div className="glass-card" style={{ gridColumn: 'span 2' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '20px' }}>
                            📍 Top Locations
                        </h3>
                        {topLocations.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>No location data yet</p>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '8px' }}>
                                {topLocations.map(([city, cnt], i) => {
                                    const pct = logs.length ? Math.round((cnt / logs.length) * 100) : 0;
                                    return (
                                        <div key={i} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px',
                                            background: 'var(--bg-input)', borderRadius: 'var(--radius-md)',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '12px', color: 'var(--accent-primary)' }}>#{i + 1}</span>
                                                <span style={{ fontWeight: 600, fontSize: '13px' }}>{city}</span>
                                            </div>
                                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-success)', fontWeight: 700, fontSize: '13px' }}>
                                                {cnt} ({pct}%)
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── STUDENT PERFORMANCE TAB ── */}
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
                                    <th>WPM Visual</th>
                                    <th>Competitions</th>
                                    <th>Status</th>
                                    <th>Badges</th>
                                    <th>Last Session</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...students].sort((a, b) => (b.bestWPM || 0) - (a.bestWPM || 0)).map((s, i) => {
                                    const lastLog = logs.find(l => l.studentId === s.studentId || l.studentId === s.id);
                                    const wpmPct = maxWPM > 0 ? Math.round(((s.bestWPM || 0) / maxWPM) * 100) : 0;
                                    return (
                                        <tr key={s.id}>
                                            <td style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: i === 0 ? 'var(--rank-gold)' : i === 1 ? 'var(--rank-silver)' : i === 2 ? 'var(--rank-bronze)' : 'var(--text-muted)' }}>
                                                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{s.name}</td>
                                            <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontSize: '12px' }}>{s.studentId}</td>
                                            <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 700 }}>{s.bestWPM || 0}</td>
                                            <td>
                                                <div style={{ width: '80px', height: '6px', background: 'var(--bg-glass-border)', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{
                                                        width: `${wpmPct}%`, height: '100%', borderRadius: '3px',
                                                        background: wpmPct >= 80 ? 'var(--accent-success)' : wpmPct >= 50 ? 'var(--accent-primary)' : 'var(--accent-warning)',
                                                        transition: 'width 0.5s ease',
                                                    }} />
                                                </div>
                                            </td>
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
