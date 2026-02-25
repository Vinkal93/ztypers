import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { rankParticipants } from '../../lib/ranking';
import { FiArrowLeft, FiUser, FiZap, FiTarget, FiClock, FiHash, FiAlertTriangle } from 'react-icons/fi';

export default function Performance() {
    const { compId } = useParams();
    const navigate = useNavigate();
    const [competition, setCompetition] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [compId]);

    const loadData = async () => {
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

    return (
        <div className="page-container fade-in">
            <button onClick={() => navigate(`/admin/manage/${compId}`)} className="btn btn-secondary" style={{ marginBottom: '24px' }}>
                <FiArrowLeft /> Back to Manage
            </button>

            <div className="page-header">
                <h1 className="page-title">📊 Performance Viewer</h1>
                <p className="page-subtitle">{competition?.title} — Detailed participant analytics</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
                {/* Participant List */}
                <div className="glass-card" style={{ padding: '12px', maxHeight: '70vh', overflowY: 'auto' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, padding: '12px', fontSize: '14px', color: 'var(--text-muted)' }}>
                        PARTICIPANTS ({participants.length})
                    </h3>
                    {participants.map(p => (
                        <div key={p.id} onClick={() => setSelected(p)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                background: selected?.id === p.id ? 'rgba(0,212,255,0.1)' : 'transparent',
                                border: selected?.id === p.id ? '1px solid rgba(0,212,255,0.3)' : '1px solid transparent',
                                transition: 'all 0.2s ease', marginBottom: '4px',
                            }}>
                            <div className="avatar" style={{ width: '36px', height: '36px', fontSize: '14px' }}>{p.name?.[0]}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '13px' }}>{p.name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>#{p.rank} · {p.score} pts</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Detail View */}
                <div>
                    {!selected ? (
                        <div className="glass-card empty-state">
                            <div className="empty-state-icon">👆</div>
                            <div className="empty-state-title">Select a participant</div>
                            <div className="empty-state-text">Click a participant to view their detailed performance</div>
                        </div>
                    ) : (
                        <div className="fade-in">
                            {/* Stats Overview */}
                            <div className="grid-4" style={{ marginBottom: '24px' }}>
                                {[
                                    { icon: <FiZap />, value: selected.wpm, label: 'WPM', color: '#00d4ff' },
                                    { icon: <FiTarget />, value: `${selected.accuracy}%`, label: 'Accuracy', color: '#10b981' },
                                    { icon: <FiHash />, value: selected.totalKeystrokes || 0, label: 'Keystrokes', color: '#7c3aed' },
                                    { icon: <FiAlertTriangle />, value: selected.mistakes || 0, label: 'Mistakes', color: '#ef4444' },
                                ].map((s, i) => (
                                    <div key={i} className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
                                        <div style={{ color: s.color, marginBottom: '4px' }}>{s.icon}</div>
                                        <div className="stat-value" style={{ fontSize: '24px' }}>{s.value}</div>
                                        <div className="stat-label">{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Score Breakdown */}
                            <div className="glass-card" style={{ marginBottom: '24px' }}>
                                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '16px' }}>📐 Score Formula</h3>
                                <div style={{
                                    fontFamily: 'var(--font-mono)', fontSize: '16px', padding: '16px', background: 'var(--bg-primary)',
                                    borderRadius: 'var(--radius-md)', textAlign: 'center'
                                }}>
                                    <span style={{ color: 'var(--accent-primary)' }}>Score</span> =
                                    <span style={{ color: 'var(--accent-primary)' }}> WPM ({selected.wpm})</span> ×
                                    <span style={{ color: 'var(--accent-success)' }}> (Accuracy ({selected.accuracy}%) / 100)</span> =
                                    <span style={{ color: 'var(--rank-gold)', fontWeight: 800, fontSize: '20px' }}> {selected.score}</span>
                                </div>
                            </div>

                            {/* Extra Info */}
                            <div className="grid-2" style={{ marginBottom: '24px' }}>
                                <div className="glass-card">
                                    <h4 style={{ fontWeight: 600, marginBottom: '12px', color: 'var(--text-secondary)' }}>⌫ Backspaces Used</h4>
                                    <div className="stat-value" style={{ fontSize: '28px' }}>{selected.backspaceCount || 0}</div>
                                </div>
                                <div className="glass-card">
                                    <h4 style={{ fontWeight: 600, marginBottom: '12px', color: 'var(--text-secondary)' }}>🔄 Tab Switches</h4>
                                    <div className="stat-value" style={{ fontSize: '28px', color: selected.tabSwitches > 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                                        {selected.tabSwitches || 0} {selected.tabSwitches > 2 && '⚠️ Suspicious'}
                                    </div>
                                </div>
                            </div>

                            {/* Wrong Words */}
                            {selected.wrongWords?.length > 0 && (
                                <div className="glass-card" style={{ marginBottom: '24px' }}>
                                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '16px' }}>❌ Wrong Words ({selected.wrongWords.length})</h3>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {selected.wrongWords.map((w, i) => (
                                            <span key={i} style={{
                                                padding: '6px 12px', borderRadius: 'var(--radius-sm)',
                                                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                                                color: 'var(--accent-danger)', fontFamily: 'var(--font-mono)', fontSize: '13px',
                                            }}>
                                                {typeof w === 'string' ? w : w.word}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Keystroke Log */}
                            {selected.keystrokeLog?.length > 0 && (
                                <div className="glass-card">
                                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '16px' }}>
                                        ⌨ Keystroke Log ({selected.keystrokeLog.length} keys)
                                    </h3>
                                    <div className="keystroke-log">
                                        {selected.keystrokeLog.slice(0, 200).map((entry, i) => (
                                            <div key={i} className="keystroke-entry">
                                                <span className="keystroke-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                                                <span className={`keystroke-key ${entry.correct ? 'keystroke-correct' : entry.correct === false ? 'keystroke-wrong' : ''}`}>
                                                    {entry.key === ' ' ? '␣' : entry.key}
                                                </span>
                                                {entry.expected && entry.key !== entry.expected && (
                                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>expected: "{entry.expected === ' ' ? '␣' : entry.expected}"</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
