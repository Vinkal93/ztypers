import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FiRadio, FiUsers, FiZap, FiTarget, FiAward, FiClock } from 'react-icons/fi';

export default function LiveViewer() {
    const [playgroundParticipants, setPlaygroundParticipants] = useState([]);
    const [playgroundSettings, setPlaygroundSettings] = useState(null);

    // Listen to playground settings
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'playground'), (snap) => {
            if (snap.exists()) setPlaygroundSettings(snap.data());
        });
        return () => unsub();
    }, []);

    // Listen to playground participants
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'playground_participants'), (snap) => {
            const parts = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .map((p, i) => ({ ...p, rank: i + 1 }));
            setPlaygroundParticipants(parts);
        });
        return () => unsub();
    }, []);

    const isLive = playgroundSettings?.status === 'active';
    const isCountdown = playgroundSettings?.status === 'countdown';
    const isEnded = playgroundSettings?.status === 'ended';

    const topWpm = playgroundParticipants.length > 0 ? Math.max(...playgroundParticipants.map(p => p.wpm || 0)) : 0;
    const avgWpm = playgroundParticipants.length > 0
        ? Math.round(playgroundParticipants.reduce((s, p) => s + (p.wpm || 0), 0) / playgroundParticipants.length)
        : 0;
    const avgAcc = playgroundParticipants.length > 0
        ? Math.round(playgroundParticipants.reduce((s, p) => s + (p.accuracy || 0), 0) / playgroundParticipants.length)
        : 0;

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <h1 className="page-title"><FiRadio style={{ marginRight: '8px' }} /> Live Competition</h1>
                <p className="page-subtitle">Watch all participants compete in real-time — updates every second!</p>
            </div>

            {/* Status Banner */}
            {(isLive || isCountdown) && (
                <div className="live-banner" style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="live-pulse" />
                        <span style={{ fontWeight: 700, fontSize: '16px' }}>
                            {isCountdown ? '⏳ Countdown in Progress...' : '🔴 Competition is LIVE!'}
                        </span>
                    </div>
                    <span style={{ fontSize: '13px', opacity: 0.9 }}>
                        {playgroundParticipants.length} participants
                    </span>
                </div>
            )}

            {isEnded && (
                <div style={{
                    padding: '16px 24px', borderRadius: 'var(--radius-lg)', marginBottom: '24px',
                    background: 'rgba(107,114,128,0.1)', border: '1px solid rgba(107,114,128,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>🏁 Competition Ended — Final Results Below</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{playgroundParticipants.length} participants</span>
                </div>
            )}

            {/* Stats Summary */}
            {playgroundParticipants.length > 0 && (
                <div className="grid-4" style={{ marginBottom: '24px' }}>
                    {[
                        { icon: <FiUsers size={20} />, value: playgroundParticipants.length, label: 'Participants', color: '#7c3aed' },
                        { icon: <FiZap size={20} />, value: topWpm, label: 'Top WPM', color: '#2563eb' },
                        { icon: <FiTarget size={20} />, value: `${avgAcc}%`, label: 'Avg Accuracy', color: '#059669' },
                        { icon: <FiAward size={20} />, value: avgWpm, label: 'Avg WPM', color: '#d97706' },
                    ].map((s, i) => (
                        <div key={i} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px' }}>
                            <div style={{
                                width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
                                background: `${s.color}15`, color: s.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>{s.icon}</div>
                            <div>
                                <div className="stat-value" style={{ fontSize: '24px' }}>{s.value}</div>
                                <div className="stat-label">{s.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Podium for top 3 */}
            {playgroundParticipants.length >= 3 && (
                <div className="podium" style={{ marginBottom: '24px' }}>
                    {[1, 0, 2].map(idx => {
                        const p = playgroundParticipants[idx];
                        if (!p) return null;
                        const places = ['first', 'second', 'third'];
                        const emojis = ['🥇', '🥈', '🥉'];
                        return (
                            <div key={idx} className="podium-place">
                                <div className="avatar" style={{ fontSize: '16px' }}>
                                    {p.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div style={{ fontWeight: 700, fontSize: '14px', textAlign: 'center' }}>{p.name}</div>
                                <div className={`podium-block ${places[idx]}`}>
                                    <div style={{ fontSize: '28px' }}>{emojis[idx]}</div>
                                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, marginTop: '4px' }}>
                                        {p.wpm || 0}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>WPM</div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--rank-gold)' }}>
                                        {p.score || 0} pts
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Full Rankings Table */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{
                    padding: '16px 20px', borderBottom: '1px solid var(--bg-glass-border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                        {isLive ? '🔴 ' : ''}All Participants
                    </h3>
                    {isLive && <span style={{ fontSize: '11px', color: 'var(--accent-success)', fontWeight: 700 }}>Auto-updating</span>}
                </div>
                {playgroundParticipants.length === 0 ? (
                    <div className="empty-state" style={{ padding: '60px' }}>
                        <div className="empty-state-icon">📺</div>
                        <div className="empty-state-title">No Active Competition</div>
                        <div className="empty-state-text">When the admin starts a competition, live results will appear here automatically.</div>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Name</th>
                                <th>WPM</th>
                                <th>Accuracy</th>
                                <th>Score</th>
                                <th>Errors</th>
                                <th>Progress</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {playgroundParticipants.map(p => (
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
                                            <div style={{ width: `${p.progress || 0}%`, height: '100%', background: 'var(--accent-gradient)', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{
                                            fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: 'var(--radius-full)',
                                            background: p.finished ? 'rgba(5,150,105,0.1)' : 'rgba(37,99,235,0.1)',
                                            color: p.finished ? 'var(--accent-success)' : 'var(--accent-primary)',
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
