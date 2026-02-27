import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { FiArrowLeft, FiClock, FiMapPin, FiUser, FiTrash2, FiRefreshCw } from 'react-icons/fi';

export default function SessionHistory() {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const q = query(collection(db, 'session_logs'), orderBy('loginAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleDeleteLog = async (id) => {
        try {
            await deleteDoc(doc(db, 'session_logs', id));
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    };

    const filtered = logs.filter(l =>
        (l.studentName || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.studentId || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.location || '').toLowerCase().includes(search.toLowerCase())
    );

    const formatDate = (iso) => {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="page-container fade-in">
            <button onClick={() => navigate('/admin')} className="btn btn-secondary" style={{ marginBottom: '24px' }}>
                <FiArrowLeft /> Back to Dashboard
            </button>

            <div className="page-header">
                <h1 className="page-title">🕑 Session History</h1>
                <p className="page-subtitle">Track which students logged in, when, and from where</p>
            </div>

            {/* Search */}
            <div className="glass-card" style={{ marginBottom: '20px' }}>
                <input
                    type="text"
                    className="input"
                    placeholder="🔍 Search by name, ID, or location..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {[
                    { label: 'Total Sessions', value: logs.length, color: 'var(--accent-primary)', icon: '📋' },
                    { label: 'Unique Students', value: new Set(logs.map(l => l.studentId)).size, color: 'var(--accent-success)', icon: '👨‍🎓' },
                    { label: 'Today', value: logs.filter(l => l.loginAt?.startsWith(new Date().toISOString().slice(0, 10))).length, color: 'var(--rank-gold)', icon: '📅' },
                ].map((s, i) => (
                    <div key={i} className="glass-card" style={{
                        flex: '1', minWidth: '140px', textAlign: 'center', padding: '20px 16px',
                        borderTop: `3px solid ${s.color}`
                    }}>
                        <div style={{ fontSize: '28px', marginBottom: '4px' }}>{s.icon}</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{
                    padding: '14px 20px', borderBottom: '1px solid var(--bg-glass-border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                        <FiClock style={{ marginRight: '8px' }} /> Login Logs ({filtered.length})
                    </h3>
                </div>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state" style={{ padding: '60px' }}>
                        <div className="empty-state-icon">🕑</div>
                        <div className="empty-state-title">No sessions logged yet</div>
                        <div className="empty-state-text">Session logs will appear here when students log in to the Playground</div>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th><FiUser size={13} style={{ marginRight: '4px' }} />Student</th>
                                    <th>Student ID</th>
                                    <th><FiClock size={13} style={{ marginRight: '4px' }} />Login Time</th>
                                    <th><FiMapPin size={13} style={{ marginRight: '4px' }} />Location</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(l => (
                                    <tr key={l.id}>
                                        <td style={{ fontWeight: 700 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{
                                                    width: '32px', height: '32px', borderRadius: '50%',
                                                    background: 'var(--accent-gradient)', display: 'flex',
                                                    alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '14px', fontWeight: 800, color: '#fff', flexShrink: 0,
                                                }}>
                                                    {(l.studentName || '?')[0].toUpperCase()}
                                                </span>
                                                {l.studentName || '—'}
                                            </div>
                                        </td>
                                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 600 }}>
                                            {l.studentId || '—'}
                                        </td>
                                        <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                            {formatDate(l.loginAt)}
                                        </td>
                                        <td style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '200px' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <FiMapPin size={11} />
                                                {l.location || 'Unknown'}
                                            </span>
                                        </td>
                                        <td>
                                            <button onClick={() => handleDeleteLog(l.id)} className="btn btn-sm btn-danger" title="Delete log">
                                                <FiTrash2 size={13} />
                                            </button>
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
