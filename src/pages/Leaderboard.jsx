import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { rankParticipants } from '../lib/ranking';
import { FiAward, FiZap, FiTarget } from 'react-icons/fi';

export default function Leaderboard() {
    const { compId } = useParams();
    const [competitions, setCompetitions] = useState([]);
    const [selectedComp, setSelectedComp] = useState(compId || '');
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load competitions
    useEffect(() => {
        const q = query(collection(db, 'competitions'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            const comps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setCompetitions(comps);
            if (!selectedComp && comps.length > 0) setSelectedComp(comps[0].id);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // Load participants for selected competition
    useEffect(() => {
        if (!selectedComp) return;
        const unsub = onSnapshot(collection(db, 'competitions', selectedComp, 'participants'), (snap) => {
            const parts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setParticipants(rankParticipants(parts));
        });
        return () => unsub();
    }, [selectedComp]);

    const getRankStyle = (rank) => {
        if (rank === 1) return { color: 'var(--rank-gold)', className: 'gold' };
        if (rank === 2) return { color: 'var(--rank-silver)', className: 'silver' };
        if (rank === 3) return { color: 'var(--rank-bronze)', className: 'bronze' };
        return { color: 'var(--text-secondary)', className: '' };
    };

    const getRankEmoji = (rank) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <h1 className="page-title">🏆 Live Leaderboard</h1>
                <p className="page-subtitle">Real-time rankings updated every 2-3 seconds</p>
            </div>

            {/* Competition Selector */}
            <div style={{ marginBottom: '24px' }}>
                <select className="input" value={selectedComp} onChange={e => setSelectedComp(e.target.value)}
                    style={{ maxWidth: '400px' }}>
                    {competitions.map(c => (
                        <option key={c.id} value={c.id}>
                            {c.title || 'Competition'} — {c.status}
                        </option>
                    ))}
                </select>
            </div>

            {/* Top 3 Podium */}
            {participants.length >= 3 && (
                <div className="podium" style={{ marginBottom: '32px' }}>
                    {/* 2nd place */}
                    <div className="podium-place" style={{ animation: 'slideUp 0.6s ease 0.1s forwards', opacity: 0 }}>
                        <div className="avatar avatar-lg">{participants[1]?.name?.[0] || '?'}</div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{participants[1]?.name}</div>
                        <div className="podium-block second">
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🥈</div>
                            <div style={{ fontWeight: 800, fontSize: '18px' }}>{participants[1]?.score}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{participants[1]?.wpm} WPM</div>
                        </div>
                    </div>
                    {/* 1st place */}
                    <div className="podium-place" style={{ animation: 'slideUp 0.6s ease forwards', opacity: 0 }}>
                        <div className="avatar avatar-lg" style={{ boxShadow: '0 0 20px rgba(251,191,36,0.5)' }}>{participants[0]?.name?.[0] || '?'}</div>
                        <div style={{ fontWeight: 700, fontSize: '16px' }}>{participants[0]?.name}</div>
                        <div className="podium-block first">
                            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🥇</div>
                            <div style={{ fontWeight: 800, fontSize: '22px', color: 'var(--rank-gold)' }}>{participants[0]?.score}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{participants[0]?.wpm} WPM</div>
                        </div>
                    </div>
                    {/* 3rd place */}
                    <div className="podium-place" style={{ animation: 'slideUp 0.6s ease 0.2s forwards', opacity: 0 }}>
                        <div className="avatar avatar-lg">{participants[2]?.name?.[0] || '?'}</div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{participants[2]?.name}</div>
                        <div className="podium-block third">
                            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🥉</div>
                            <div style={{ fontWeight: 800, fontSize: '18px' }}>{participants[2]?.score}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{participants[2]?.wpm} WPM</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Rankings Table */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-glass-border)' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                        All Rankings ({participants.length} participants)
                    </h3>
                </div>
                {participants.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🏆</div>
                        <div className="empty-state-title">No participants yet</div>
                        <div className="empty-state-text">Rankings will appear as students start typing</div>
                    </div>
                ) : (
                    <div>
                        {/* Header */}
                        <div className="leaderboard-row" style={{ borderBottom: '1px solid var(--bg-glass-border)', padding: '12px 20px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>RANK</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>NAME</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>WPM</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>ACCURACY</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>SCORE</span>
                        </div>
                        {participants.map((p, i) => {
                            const rankStyle = getRankStyle(p.rank);
                            return (
                                <div key={p.id} className="leaderboard-row" style={{
                                    animation: `fadeIn 0.3s ease ${i * 0.05}s forwards`, opacity: 0,
                                    background: p.rank <= 3 ? `${rankStyle.color}08` : 'transparent',
                                }}>
                                    <div className={`leaderboard-rank ${rankStyle.className}`}>
                                        {getRankEmoji(p.rank)}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div className="avatar">{p.name?.[0] || '?'}</div>
                                        <span className="leaderboard-name">{p.name}</span>
                                    </div>
                                    <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-primary)' }}>
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
                                        color: rankStyle.color
                                    }}>
                                        {p.score}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
