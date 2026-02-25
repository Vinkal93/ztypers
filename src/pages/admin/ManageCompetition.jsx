import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { rankParticipants } from '../../lib/ranking';
import { FiPlay, FiSquare, FiAward, FiArrowLeft, FiUsers, FiBarChart2, FiAlertCircle } from 'react-icons/fi';

export default function ManageCompetition() {
    const { compId } = useParams();
    const navigate = useNavigate();
    const [competition, setCompetition] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'competitions', compId), (snap) => {
            if (snap.exists()) setCompetition({ id: snap.id, ...snap.data() });
            setLoading(false);
        });
        return () => unsub();
    }, [compId]);

    useEffect(() => {
        if (!compId) return;
        const unsub = onSnapshot(collection(db, 'competitions', compId, 'participants'), (snap) => {
            const parts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setParticipants(rankParticipants(parts));
        });
        return () => unsub();
    }, [compId]);

    const updateStatus = async (status) => {
        try {
            await updateDoc(doc(db, 'competitions', compId), { status });
        } catch (err) {
            console.error('Error:', err);
            alert('Error updating status');
        }
    };

    const declareResult = async () => {
        if (!confirm('Declare results? This will end the competition for all participants.')) return;
        try {
            await updateDoc(doc(db, 'competitions', compId), {
                status: 'ended',
                endedAt: new Date().toISOString(),
                finalRankings: participants.map(p => ({
                    userId: p.id, name: p.name, wpm: p.wpm,
                    accuracy: p.accuracy, score: p.score, rank: p.rank,
                })),
            });
        } catch (err) {
            console.error('Error:', err);
        }
    };

    if (loading) {
        return <div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}>
            <div className="timer" style={{ animation: 'pulse 1.5s infinite' }}>Loading...</div>
        </div>;
    }

    return (
        <div className="page-container fade-in">
            <button onClick={() => navigate('/admin')} className="btn btn-secondary" style={{ marginBottom: '24px' }}>
                <FiArrowLeft /> Back
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 className="page-title">{competition?.title || 'Competition'}</h1>
                    <p className="page-subtitle">
                        Duration: {competition?.duration}s · Prize: ₹{competition?.prize || 0} ·{' '}
                        <span className={`badge badge-${competition?.status}`}>{competition?.status}</span>
                    </p>
                </div>
            </div>

            {/* Controls */}
            <div className="glass-card" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '16px' }}>🎮 Competition Controls</h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {competition?.status !== 'active' && competition?.status !== 'ended' && (
                        <button onClick={() => updateStatus('active')} className="btn btn-success btn-lg">
                            <FiPlay /> Start Competition
                        </button>
                    )}
                    {competition?.status === 'active' && (
                        <>
                            <button onClick={() => updateStatus('upcoming')} className="btn btn-danger btn-lg">
                                <FiSquare /> Stop Competition
                            </button>
                            <button onClick={declareResult} className="btn btn-primary btn-lg">
                                <FiAward /> Declare Results
                            </button>
                        </>
                    )}
                    {competition?.status === 'ended' && (
                        <div style={{
                            padding: '12px 20px', background: 'rgba(16,185,129,0.1)', borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(16,185,129,0.3)', color: 'var(--accent-success)', fontWeight: 600
                        }}>
                            ✅ Results Declared
                        </div>
                    )}
                </div>
            </div>

            {/* Live Participants */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{
                    padding: '20px 24px', borderBottom: '1px solid var(--bg-glass-border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                        <FiUsers style={{ marginRight: '8px' }} />Live Participants ({participants.length})
                    </h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Link to={`/admin/performance/${compId}`} className="btn btn-sm btn-secondary">
                            <FiBarChart2 size={14} /> Performance
                        </Link>
                        <Link to={`/admin/disputes/${compId}`} className="btn btn-sm btn-secondary">
                            <FiAlertCircle size={14} /> Disputes
                        </Link>
                    </div>
                </div>

                {participants.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">👥</div>
                        <div className="empty-state-title">No participants yet</div>
                        <div className="empty-state-text">Students will appear here as they join</div>
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
                                <th>Keystrokes</th>
                                <th>Mistakes</th>
                                <th>Tab Switches</th>
                            </tr>
                        </thead>
                        <tbody>
                            {participants.map(p => (
                                <tr key={p.id}>
                                    <td style={{
                                        fontFamily: 'var(--font-display)', fontWeight: 800,
                                        color: p.rank <= 3 ? ['var(--rank-gold)', 'var(--rank-silver)', 'var(--rank-bronze)'][p.rank - 1] : 'var(--text-secondary)'
                                    }}>
                                        #{p.rank}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{p.wpm}</td>
                                    <td style={{
                                        fontFamily: 'var(--font-mono)',
                                        color: p.accuracy >= 90 ? 'var(--accent-success)' : 'var(--accent-warning)'
                                    }}>{p.accuracy}%</td>
                                    <td style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--rank-gold)' }}>{p.score}</td>
                                    <td>{p.totalKeystrokes || 0}</td>
                                    <td style={{ color: 'var(--accent-danger)' }}>{p.mistakes || 0}</td>
                                    <td style={{ color: p.tabSwitches > 0 ? 'var(--accent-danger)' : 'var(--text-muted)' }}>
                                        {p.tabSwitches || 0} {p.tabSwitches > 2 && '⚠️'}
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
