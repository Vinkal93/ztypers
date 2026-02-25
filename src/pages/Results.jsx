import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { rankParticipants } from '../lib/ranking';
import { FiAward, FiHome } from 'react-icons/fi';

export default function Results() {
    const { compId } = useParams();
    const [competition, setCompetition] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadResults();
    }, [compId]);

    const loadResults = async () => {
        try {
            const compDoc = await getDoc(doc(db, 'competitions', compId));
            if (compDoc.exists()) setCompetition(compDoc.data());

            const partSnap = await getDocs(collection(db, 'competitions', compId, 'participants'));
            const parts = partSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setParticipants(rankParticipants(parts));
        } catch (err) {
            console.error('Error:', err);
        }
        setLoading(false);
    };

    if (loading) {
        return <div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}>
            <div className="timer" style={{ animation: 'pulse 1.5s infinite' }}>Loading Results...</div>
        </div>;
    }

    return (
        <div className="page-container fade-in">
            <div className="page-header" style={{ textAlign: 'center' }}>
                <h1 className="page-title" style={{ fontSize: '36px' }}>🏆 Competition Results</h1>
                <p className="page-subtitle" style={{ fontSize: '16px' }}>{competition?.title || 'Typing Competition'}</p>
            </div>

            {/* Winner Podium */}
            {participants.length >= 1 && (
                <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                    <div className="podium">
                        {participants.length >= 2 && (
                            <div className="podium-place slide-up" style={{ animationDelay: '0.2s' }}>
                                <div className="avatar avatar-lg">{participants[1]?.name?.[0]}</div>
                                <div style={{ fontWeight: 600 }}>{participants[1]?.name}</div>
                                <div className="podium-block second">
                                    <div style={{ fontSize: '32px' }}>🥈</div>
                                    <div style={{ fontWeight: 800, fontSize: '18px' }}>{participants[1]?.score}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{participants[1]?.wpm} WPM · {participants[1]?.accuracy}%</div>
                                </div>
                            </div>
                        )}
                        <div className="podium-place slide-up">
                            <div className="avatar avatar-lg" style={{ width: '80px', height: '80px', fontSize: '32px', boxShadow: '0 0 30px rgba(251,191,36,0.5)' }}>
                                {participants[0]?.name?.[0]}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '18px' }}>{participants[0]?.name}</div>
                            <div className="podium-block first">
                                <div style={{ fontSize: '48px' }}>🥇</div>
                                <div style={{ fontWeight: 800, fontSize: '24px', color: 'var(--rank-gold)' }}>{participants[0]?.score}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{participants[0]?.wpm} WPM · {participants[0]?.accuracy}%</div>
                            </div>
                        </div>
                        {participants.length >= 3 && (
                            <div className="podium-place slide-up" style={{ animationDelay: '0.3s' }}>
                                <div className="avatar avatar-lg">{participants[2]?.name?.[0]}</div>
                                <div style={{ fontWeight: 600 }}>{participants[2]?.name}</div>
                                <div className="podium-block third">
                                    <div style={{ fontSize: '28px' }}>🥉</div>
                                    <div style={{ fontWeight: 800, fontSize: '18px' }}>{participants[2]?.score}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{participants[2]?.wpm} WPM · {participants[2]?.accuracy}%</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Full Results Table */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '32px' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-glass-border)' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Final Rankings</h3>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Name</th>
                            <th>WPM</th>
                            <th>Accuracy</th>
                            <th>Score</th>
                            <th>Mistakes</th>
                            <th>Backspaces</th>
                        </tr>
                    </thead>
                    <tbody>
                        {participants.map((p) => (
                            <tr key={p.id}>
                                <td style={{
                                    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '18px',
                                    color: p.rank === 1 ? 'var(--rank-gold)' : p.rank === 2 ? 'var(--rank-silver)' : p.rank === 3 ? 'var(--rank-bronze)' : 'var(--text-secondary)'
                                }}>
                                    {p.rank <= 3 ? ['🥇', '🥈', '🥉'][p.rank - 1] : `#${p.rank}`}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '13px' }}>{p.name?.[0]}</div>
                                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                                    </div>
                                </td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-primary)' }}>{p.wpm}</td>
                                <td style={{
                                    fontFamily: 'var(--font-mono)', fontWeight: 600,
                                    color: p.accuracy >= 90 ? 'var(--accent-success)' : 'var(--accent-warning)'
                                }}>{p.accuracy}%</td>
                                <td style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--rank-gold)' }}>{p.score}</td>
                                <td style={{ color: 'var(--accent-danger)' }}>{p.mistakes || 0}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{p.backspaceCount || 0}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div style={{ textAlign: 'center' }}>
                <Link to="/home" className="btn btn-secondary btn-lg"><FiHome /> Back to Home</Link>
            </div>
        </div>
    );
}
