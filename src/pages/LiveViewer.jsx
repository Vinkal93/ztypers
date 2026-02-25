import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { rankParticipants } from '../lib/ranking';
import { FiRadio, FiZap, FiTarget, FiAward, FiUsers, FiClock } from 'react-icons/fi';

export default function LiveViewer() {
    const { compId } = useParams();
    const [competitions, setCompetitions] = useState([]);
    const [activeComp, setActiveComp] = useState(null);
    const [selectedCompId, setSelectedCompId] = useState(compId || '');
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load competitions
    useEffect(() => {
        const q = query(collection(db, 'competitions'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            const comps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setCompetitions(comps);
            const active = comps.find(c => c.status === 'active');
            if (active && !selectedCompId) {
                setSelectedCompId(active.id);
                setActiveComp(active);
            } else if (selectedCompId) {
                setActiveComp(comps.find(c => c.id === selectedCompId) || null);
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // Load participants
    useEffect(() => {
        if (!selectedCompId) return;
        const comp = competitions.find(c => c.id === selectedCompId);
        setActiveComp(comp || null);
        const unsub = onSnapshot(collection(db, 'competitions', selectedCompId, 'participants'), (snap) => {
            const parts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setParticipants(rankParticipants(parts));
        });
        return () => unsub();
    }, [selectedCompId, competitions]);

    const getRankEmoji = (rank) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    const isActive = activeComp?.status === 'active';

    return (
        <div className="page-container fade-in">
            {/* Live Banner */}
            {isActive && (
                <div className="live-banner">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="live-pulse" />
                        <span style={{ fontWeight: 700, fontSize: '16px' }}>LIVE</span>
                        <span style={{ opacity: 0.9 }}>{activeComp?.title || 'Competition'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span><FiUsers size={14} /> {participants.length} participants</span>
                        {activeComp?.prize && <span>🏆 ₹{activeComp.prize}</span>}
                    </div>
                </div>
            )}

            <div className="page-header">
                <h1 className="page-title">
                    <FiRadio style={{ marginRight: '8px' }} />
                    {isActive ? 'Live Competition' : 'Competition Viewer'}
                </h1>
                <p className="page-subtitle">
                    {isActive ? 'Real-time rankings — auto-refreshes every 2-3 seconds' : 'Select a competition to view live or past rankings'}
                </p>
            </div>

            {/* Competition Selector */}
            <div style={{ marginBottom: '24px' }}>
                <select className="input" value={selectedCompId} onChange={e => setSelectedCompId(e.target.value)}
                    style={{ maxWidth: '500px' }}>
                    <option value="">Select Competition...</option>
                    {competitions.map(c => (
                        <option key={c.id} value={c.id}>
                            {c.status === 'active' ? '🟢 ' : c.status === 'ended' ? '🏁 ' : '📅 '}
                            {c.title || 'Competition'} — {c.status}
                        </option>
                    ))}
                </select>
            </div>

            {!selectedCompId ? (
                <div className="glass-card empty-state">
                    <div className="empty-state-icon">📺</div>
                    <div className="empty-state-title">Select a competition</div>
                    <div className="empty-state-text">Choose from the dropdown to see live or past rankings</div>
                </div>
            ) : (
                <>
                    {/* Live Stats Summary */}
                    <div className="grid-4" style={{ marginBottom: '24px' }}>
                        <div className="glass-card" style={{ textAlign: 'center' }}>
                            <div className="stat-value" style={{ color: 'var(--accent-primary)', fontSize: '28px' }}>{participants.length}</div>
                            <div className="stat-label"><FiUsers size={12} /> Participants</div>
                        </div>
                        <div className="glass-card" style={{ textAlign: 'center' }}>
                            <div className="stat-value" style={{ color: 'var(--accent-primary)', fontSize: '28px' }}>
                                {participants.length > 0 ? Math.max(...participants.map(p => p.wpm || 0)) : 0}
                            </div>
                            <div className="stat-label"><FiZap size={12} /> Top WPM</div>
                        </div>
                        <div className="glass-card" style={{ textAlign: 'center' }}>
                            <div className="stat-value" style={{ color: 'var(--accent-success)', fontSize: '28px' }}>
                                {participants.length > 0 ? Math.max(...participants.map(p => p.accuracy || 0)) : 0}%
                            </div>
                            <div className="stat-label"><FiTarget size={12} /> Best Accuracy</div>
                        </div>
                        <div className="glass-card" style={{ textAlign: 'center' }}>
                            <div className="stat-value" style={{ color: 'var(--rank-gold)', fontSize: '28px' }}>
                                {participants.length > 0 ? Math.max(...participants.map(p => p.score || 0)) : 0}
                            </div>
                            <div className="stat-label"><FiAward size={12} /> Top Score</div>
                        </div>
                    </div>

                    {/* Live Rankings */}
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{
                            padding: '20px 24px', borderBottom: '1px solid var(--bg-glass-border)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px' }}>
                                {isActive && <><span className="live-pulse" /> </>}
                                Live Rankings
                            </h2>
                            {isActive && (
                                <span style={{ fontSize: '12px', color: 'var(--accent-success)', fontWeight: 600 }}>
                                    Auto-refreshing ✓
                                </span>
                            )}
                        </div>

                        {participants.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">⏳</div>
                                <div className="empty-state-title">Waiting for participants...</div>
                                <div className="empty-state-text">Rankings will appear as students start typing</div>
                            </div>
                        ) : (
                            <>
                                {/* Header */}
                                <div className="leaderboard-row" style={{ borderBottom: '1px solid var(--bg-glass-border)', padding: '10px 20px' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>RANK</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>STUDENT</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>WPM</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>ACCURACY</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>SCORE</span>
                                </div>
                                {participants.map((p, i) => (
                                    <div key={p.id} className="leaderboard-row" style={{
                                        animation: `fadeIn 0.3s ease ${i * 0.05}s forwards`, opacity: 0,
                                        background: p.rank <= 3 ? 'var(--accent-gradient-light)' : 'transparent',
                                    }}>
                                        <div style={{
                                            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '20px',
                                            color: p.rank === 1 ? 'var(--rank-gold)' : p.rank === 2 ? 'var(--rank-silver)' : p.rank === 3 ? 'var(--rank-bronze)' : 'var(--text-muted)',
                                        }}>
                                            {getRankEmoji(p.rank)}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div className="avatar">{p.name?.[0] || '?'}</div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '14px' }}>{p.name}</div>
                                                {p.tabSwitches > 2 && (
                                                    <span style={{ fontSize: '10px', color: 'var(--accent-danger)', fontWeight: 600 }}>⚠ Suspicious</span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '16px', color: 'var(--accent-primary)' }}>
                                            {p.wpm}
                                        </div>
                                        <div style={{
                                            textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600,
                                            color: p.accuracy >= 90 ? 'var(--accent-success)' : p.accuracy >= 70 ? 'var(--accent-warning)' : 'var(--accent-danger)'
                                        }}>
                                            {p.accuracy}%
                                        </div>
                                        <div style={{
                                            textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '18px',
                                            color: p.rank === 1 ? 'var(--rank-gold)' : 'var(--text-primary)'
                                        }}>
                                            {p.score}
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
