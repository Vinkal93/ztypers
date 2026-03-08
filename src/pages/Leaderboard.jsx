import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FiAward, FiZap, FiTarget, FiHash, FiUsers } from 'react-icons/fi';
import Seo from '../components/Seo';

export default function Leaderboard() {
    const [participants, setParticipants] = useState([]);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'playground_participants'), (snap) => {
            const parts = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .map((p, i) => ({ ...p, rank: i + 1 }));
            setParticipants(parts);
        });
        return () => unsub();
    }, []);

    return (
        <div className="page-container fade-in">
            <Seo
                title="Live Typing Leaderboard & Competition Rankings"
                description="View live typing competition rankings on Z Typers. See top WPM scores, accuracy stats, and find out who is the fastest typist in India."
                keywords="typing leaderboard, live typing competition rankings, top WPM scorers, fastest typists India, typing tournament results"
                canonicalUrl="/leaderboard"
            />
            <div className="page-header">
                <h1 className="page-title"><FiAward style={{ marginRight: '8px' }} /> Rankings</h1>
                <p className="page-subtitle">Live leaderboard — all playground participants ranked by score</p>
            </div>

            {/* Podium */}
            {participants.length >= 3 && (
                <div className="podium" style={{ marginBottom: '32px' }}>
                    {[1, 0, 2].map(idx => {
                        const p = participants[idx];
                        if (!p) return null;
                        const places = ['first', 'second', 'third'];
                        const emojis = ['🥇', '🥈', '🥉'];
                        return (
                            <div key={idx} className="podium-place">
                                <div className="avatar" style={{ fontSize: '18px' }}>
                                    {p.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div style={{ fontWeight: 700, fontSize: '15px', textAlign: 'center' }}>{p.name}</div>
                                <div className={`podium-block ${places[idx]}`}>
                                    <div style={{ fontSize: '32px' }}>{emojis[idx]}</div>
                                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, marginTop: '4px' }}>{p.wpm || 0}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>WPM</div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: 'var(--rank-gold)', marginTop: '4px' }}>
                                        {p.score || 0} pts
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.accuracy || 0}% acc</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Stats Row */}
            {participants.length > 0 && (
                <div className="grid-4" style={{ marginBottom: '24px' }}>
                    {[
                        { icon: <FiUsers size={18} />, val: participants.length, label: 'Participants', color: '#7c3aed' },
                        { icon: <FiZap size={18} />, val: Math.max(...participants.map(p => p.wpm || 0)), label: 'Top WPM', color: '#2563eb' },
                        { icon: <FiTarget size={18} />, val: `${Math.round(participants.reduce((s, p) => s + (p.accuracy || 0), 0) / participants.length)}%`, label: 'Avg Accuracy', color: '#059669' },
                        { icon: <FiAward size={18} />, val: participants[0]?.score || 0, label: 'Top Score', color: '#d97706' },
                    ].map((s, i) => (
                        <div key={i} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
                                background: `${s.color}15`, color: s.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>{s.icon}</div>
                            <div>
                                <div className="stat-value" style={{ fontSize: '22px' }}>{s.val}</div>
                                <div className="stat-label">{s.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Full Table */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bg-glass-border)' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                        🏆 Full Rankings
                    </h3>
                </div>
                {participants.length === 0 ? (
                    <div className="empty-state" style={{ padding: '60px' }}>
                        <div className="empty-state-icon">🏆</div>
                        <div className="empty-state-title">No Rankings Yet</div>
                        <div className="empty-state-text">Rankings will appear here once a playground competition starts.</div>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Rank</th><th>Name</th><th>WPM</th><th>Accuracy</th><th>Score</th><th>Mistakes</th><th>Progress</th><th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {participants.map(p => (
                                <tr key={p.id}>
                                    <td style={{
                                        fontFamily: 'var(--font-display)', fontWeight: 800,
                                        color: p.rank <= 3 ? ['var(--rank-gold)', 'var(--rank-silver)', 'var(--rank-bronze)'][p.rank - 1] : 'var(--text-muted)'
                                    }}>
                                        {p.rank <= 3 ? ['🥇', '🥈', '🥉'][p.rank - 1] : `#${p.rank}`}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-primary)' }}>{p.wpm || 0}</td>
                                    <td style={{
                                        fontFamily: 'var(--font-mono)',
                                        color: (p.accuracy || 0) >= 90 ? 'var(--accent-success)' : 'var(--accent-warning)'
                                    }}>{p.accuracy || 0}%</td>
                                    <td style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--rank-gold)' }}>{p.score || 0}</td>
                                    <td style={{ color: 'var(--accent-danger)' }}>{p.mistakes || 0}</td>
                                    <td>
                                        <div style={{ width: '60px', height: '6px', background: 'var(--bg-glass-border)', borderRadius: '3px' }}>
                                            <div style={{ width: `${p.progress || 0}%`, height: '100%', background: 'var(--accent-gradient)', borderRadius: '3px' }} />
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{
                                            fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: 'var(--radius-full)',
                                            background: p.finished ? 'rgba(5,150,105,0.1)' : 'rgba(37,99,235,0.1)',
                                            color: p.finished ? 'var(--accent-success)' : 'var(--accent-primary)'
                                        }}>
                                            {p.finished ? '✅ Done' : '⌨️ Typing'}
                                        </span>
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
