import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { FiZap, FiTarget, FiAward, FiTrendingUp, FiClock, FiBarChart2 } from 'react-icons/fi';

export default function Profile() {
    const { user, userData } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, [user]);

    const loadHistory = async () => {
        if (!user) return;
        try {
            const compsSnap = await getDocs(query(collection(db, 'competitions'), orderBy('createdAt', 'desc')));
            const results = [];
            for (const compDoc of compsSnap.docs) {
                try {
                    const partRef = collection(db, 'competitions', compDoc.id, 'participants');
                    const partSnap = await getDocs(partRef);
                    const myResult = partSnap.docs.find(d => d.id === user.uid);
                    if (myResult) {
                        results.push({
                            compId: compDoc.id,
                            compTitle: compDoc.data().title || 'Competition',
                            compDate: compDoc.data().createdAt,
                            ...myResult.data(),
                        });
                    }
                } catch (e) { /* skip */ }
            }
            setHistory(results);
        } catch (err) {
            console.error('Error loading history:', err);
        }
        setLoading(false);
    };

    const bestWPM = history.length > 0 ? Math.max(...history.map(h => h.wpm || 0)) : 0;
    const avgWPM = history.length > 0 ? Math.round(history.reduce((s, h) => s + (h.wpm || 0), 0) / history.length) : 0;
    const avgAccuracy = history.length > 0 ? Math.round(history.reduce((s, h) => s + (h.accuracy || 0), 0) / history.length * 10) / 10 : 0;
    const bestScore = history.length > 0 ? Math.max(...history.map(h => h.score || 0)) : 0;

    return (
        <div className="page-container fade-in">
            {/* Profile Header */}
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
                <div className="avatar avatar-lg" style={{ width: '80px', height: '80px', fontSize: '32px' }}>
                    {user?.displayName?.[0] || '?'}
                </div>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800 }}>
                        {user?.displayName || 'Typist'}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{user?.email}</p>
                    <span className="badge badge-active" style={{ marginTop: '8px' }}>
                        {userData?.role || 'student'}
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid-4" style={{ marginBottom: '32px' }}>
                {[
                    { icon: <FiZap size={22} />, value: bestWPM, label: 'Best WPM', color: '#00d4ff' },
                    { icon: <FiBarChart2 size={22} />, value: avgWPM, label: 'Avg WPM', color: '#7c3aed' },
                    { icon: <FiTarget size={22} />, value: `${avgAccuracy}%`, label: 'Avg Accuracy', color: '#10b981' },
                    { icon: <FiAward size={22} />, value: bestScore, label: 'Best Score', color: '#fbbf24' },
                ].map((s, i) => (
                    <div key={i} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
                            background: `${s.color}15`, color: s.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{s.icon}</div>
                        <div>
                            <div className="stat-value" style={{ fontSize: '26px' }}>{s.value}</div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Competition History */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-glass-border)' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700 }}>
                        📋 Competition History ({history.length})
                    </h2>
                </div>
                {loading ? (
                    <div className="empty-state"><div className="empty-state-title">Loading...</div></div>
                ) : history.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📝</div>
                        <div className="empty-state-title">No competitions yet</div>
                        <div className="empty-state-text">Join a competition to see your history here</div>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Competition</th>
                                <th>WPM</th>
                                <th>Accuracy</th>
                                <th>Score</th>
                                <th>Mistakes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((h, i) => (
                                <tr key={i}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{h.compTitle}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            {h.compDate ? new Date(h.compDate).toLocaleDateString() : '-'}
                                        </div>
                                    </td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-primary)' }}>{h.wpm}</td>
                                    <td style={{
                                        fontFamily: 'var(--font-mono)', fontWeight: 600,
                                        color: h.accuracy >= 90 ? 'var(--accent-success)' : 'var(--accent-warning)'
                                    }}>{h.accuracy}%</td>
                                    <td style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--rank-gold)' }}>{h.score}</td>
                                    <td style={{ color: 'var(--accent-danger)' }}>{h.mistakes || 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
