import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { FiPlus, FiUsers, FiAward, FiActivity, FiBarChart2, FiSettings } from 'react-icons/fi';

export default function AdminDashboard() {
    const [competitions, setCompetitions] = useState([]);
    const [totalParticipants, setTotalParticipants] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'competitions'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, async (snap) => {
            const comps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
        return () => unsub();
    }, []);

    const activeCount = competitions.filter(c => c.status === 'active').length;
    const endedCount = competitions.filter(c => c.status === 'ended').length;

    return (
        <div className="page-container fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 className="page-title">⚙️ Admin Dashboard</h1>
                    <p className="page-subtitle">Manage competitions and view analytics</p>
                </div>
                <Link to="/admin/create" className="btn btn-primary btn-lg">
                    <FiPlus /> Create Competition
                </Link>
            </div>

            {/* Stats */}
            <div className="grid-4" style={{ marginBottom: '32px' }}>
                {[
                    { icon: <FiAward size={22} />, value: competitions.length, label: 'Total Competitions', color: '#00d4ff' },
                    { icon: <FiActivity size={22} />, value: activeCount, label: 'Active Now', color: '#10b981' },
                    { icon: <FiUsers size={22} />, value: totalParticipants, label: 'Total Participants', color: '#7c3aed' },
                    { icon: <FiBarChart2 size={22} />, value: endedCount, label: 'Completed', color: '#f59e0b' },
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

            {/* Competition List */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>All Competitions</h2>
                </div>
                {competitions.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🏆</div>
                        <div className="empty-state-title">No competitions yet</div>
                        <div className="empty-state-text">Create your first competition to get started</div>
                    </div>
                ) : (
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
                                            <Link to={`/admin/disputes/${c.id}`} className="btn btn-sm btn-secondary">
                                                <FiActivity size={14} />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
