import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { FiPlus, FiUsers, FiAward, FiActivity, FiBarChart2, FiSettings, FiPlay, FiPackage, FiClipboard, FiClock, FiCalendar, FiUser, FiArrowRight } from 'react-icons/fi';

export default function AdminDashboard() {
    const { userData, institute } = useAuth();
    const [competitions, setCompetitions] = useState([]);
    const [totalParticipants, setTotalParticipants] = useState(0);
    const [eventCount, setEventCount] = useState(0);
    const [enrollmentCount, setEnrollmentCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'competitions'));
        const unsub = onSnapshot(q, async (snap) => {
            const comps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            comps.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            setCompetitions(comps);

            let total = 0;
            for (const comp of comps) {
                try {
                    const partSnap = await getDocs(collection(db, 'competitions', comp.id, 'participants'));
                    total += partSnap.size;
                } catch (e) { }
            }
            setTotalParticipants(total);
            setLoading(false);
        });

        // Count events
        const unsub2 = onSnapshot(collection(db, 'events'), snap => setEventCount(snap.size));
        // Count event enrollments
        const unsub3 = onSnapshot(collection(db, 'event_enrollments'), snap => setEnrollmentCount(snap.size));

        return () => { unsub(); unsub2(); unsub3(); };
    }, []);

    const activeCount = competitions.filter(c => c.status === 'active').length;
    const endedCount = competitions.filter(c => c.status === 'ended').length;

    const quickLinks = [
        { to: '/admin/students', icon: <FiUsers size={20} />, label: 'Students', desc: 'Manage student accounts', color: '#7c3aed' },
        { to: '/admin/batches', icon: <FiPackage size={20} />, label: 'Batches', desc: 'Organize student batches', color: '#0891b2' },
        { to: '/admin/playground', icon: <FiPlay size={20} />, label: 'Playground', desc: 'Control live competitions', color: '#059669' },
        { to: '/admin/events', icon: <FiCalendar size={20} />, label: 'Event Manager', desc: 'Create & manage events', color: '#d97706' },
        { to: '/admin/enrollments', icon: <FiClipboard size={20} />, label: 'Enrollments', desc: 'View form submissions', color: '#2563eb' },
        { to: '/admin/analytics', icon: <FiBarChart2 size={20} />, label: 'Analytics', desc: 'View performance data', color: '#e11d48' },
        { to: '/admin/batch-history', icon: <FiClock size={20} />, label: 'Batch History', desc: 'Past batch records', color: '#64748b' },
        { to: '/admin/session-history', icon: <FiActivity size={20} />, label: 'Sessions', desc: 'Student session logs', color: '#c026d3' },
        { to: '/admin/profile', icon: <FiUser size={20} />, label: 'Profile', desc: 'Account & branding', color: '#0d9488' },
    ];

    return (
        <div className="page-container fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 className="page-title">⚙️ Admin Dashboard</h1>
                    <p className="page-subtitle">
                        Welcome, <strong>{userData?.name || 'Admin'}</strong>
                        {institute?.name && <> — {institute.name}</>}
                    </p>
                </div>
                <Link to="/admin/create" className="btn btn-primary">
                    <FiPlus /> Create Competition
                </Link>
            </div>

            {/* Stats */}
            <div className="grid-4" style={{ marginBottom: '28px' }}>
                {[
                    { icon: <FiAward size={22} />, value: competitions.length, label: 'Competitions', color: '#00d4ff' },
                    { icon: <FiActivity size={22} />, value: activeCount, label: 'Active Now', color: '#10b981' },
                    { icon: <FiCalendar size={22} />, value: eventCount, label: 'Events', color: '#d97706' },
                    { icon: <FiUsers size={22} />, value: enrollmentCount, label: 'Event Enrollments', color: '#7c3aed' },
                ].map((s, i) => (
                    <div key={i} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '50px', height: '50px', borderRadius: 'var(--radius-md)',
                            background: `${s.color}15`, color: s.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{s.icon}</div>
                        <div>
                            <div className="stat-value" style={{ fontSize: '28px' }}>{s.value}</div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Links Grid */}
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '16px', fontSize: '18px' }}>🔗 Quick Links</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '32px' }}>
                {quickLinks.map(link => (
                    <Link key={link.to} to={link.to} className="glass-card" style={{
                        padding: '18px', textDecoration: 'none', color: 'inherit',
                        display: 'flex', alignItems: 'center', gap: '14px',
                        transition: 'all 0.2s ease',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                        <div style={{
                            width: '42px', height: '42px', borderRadius: 'var(--radius-md)',
                            background: `${link.color}15`, color: link.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>{link.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>{link.label}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{link.desc}</div>
                        </div>
                        <FiArrowRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    </Link>
                ))}
            </div>

            {/* Competition List */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>All Competitions</h2>
                    <span className="badge badge-upcoming" style={{ fontSize: '12px' }}>{competitions.length} total</span>
                </div>
                {competitions.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🏆</div>
                        <div className="empty-state-title">No competitions yet</div>
                        <div className="empty-state-text">Create your first competition to get started</div>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Duration</th>
                                    <th>Prize</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {competitions.map(c => (
                                    <tr key={c.id}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{c.title || 'Untitled'}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-'}
                                            </div>
                                        </td>
                                        <td style={{ fontFamily: 'var(--font-mono)' }}>{c.duration || 60}s</td>
                                        <td style={{ color: 'var(--rank-gold)', fontWeight: 600 }}>{c.prize ? `₹${c.prize}` : '-'}</td>
                                        <td>
                                            <span className={`badge badge-${c.status || 'upcoming'}`}>{c.status || 'upcoming'}</span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <Link to={`/admin/manage/${c.id}`} className="btn btn-sm btn-secondary">
                                                    <FiSettings size={14} /> Manage
                                                </Link>
                                                <Link to={`/admin/performance/${c.id}`} className="btn btn-sm btn-secondary">
                                                    <FiBarChart2 size={14} />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
