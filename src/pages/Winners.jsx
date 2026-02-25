import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FiAward, FiZap, FiTarget, FiUsers, FiDollarSign, FiCalendar } from 'react-icons/fi';

export default function Winners() {
    const [winners, setWinners] = useState([]);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'winners'), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            setWinners(list);
        });
        return () => unsub();
    }, []);

    const formatDate = (iso) => {
        if (!iso) return '-';
        const d = new Date(iso);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <h1 className="page-title">🏆 Hall of Fame</h1>
                <p className="page-subtitle">All past competition winners — their performance and prizes</p>
            </div>

            {/* Stats */}
            {winners.length > 0 && (
                <div className="grid-4" style={{ marginBottom: '24px' }}>
                    {[
                        { icon: <FiAward size={20} />, val: winners.length, label: 'Competitions', color: '#d97706' },
                        { icon: <FiDollarSign size={20} />, val: `₹${winners.reduce((s, w) => s + (w.prize || 0), 0)}`, label: 'Total Prizes', color: '#059669' },
                        { icon: <FiZap size={20} />, val: Math.max(...winners.map(w => w.wpm || 0)), label: 'Best WPM Ever', color: '#2563eb' },
                        { icon: <FiUsers size={20} />, val: winners.reduce((s, w) => s + (w.totalParticipants || 0), 0), label: 'Total Participants', color: '#7c3aed' },
                    ].map((s, i) => (
                        <div key={i} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px' }}>
                            <div style={{
                                width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
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

            {/* Selected Winner Detail */}
            {selected && (
                <div className="glass-card" style={{ marginBottom: '24px', border: '2px solid var(--rank-gold)', textAlign: 'center', padding: '32px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏆</div>
                    <h2 style={{
                        fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 900,
                        background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                    }}>
                        {selected.name}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                        {formatDate(selected.date)} • {selected.totalParticipants} participants • {selected.difficulty || 'medium'} difficulty
                    </p>

                    <div className="grid-3" style={{ marginBottom: '20px' }}>
                        {[
                            { label: 'WPM', value: selected.wpm || 0, color: 'var(--accent-primary)' },
                            { label: 'Accuracy', value: `${selected.accuracy || 0}%`, color: 'var(--accent-success)' },
                            { label: 'Score', value: selected.score || 0, color: 'var(--rank-gold)' },
                            { label: 'Mistakes', value: selected.mistakes || 0, color: 'var(--accent-danger)' },
                            { label: 'Duration', value: `${selected.duration || 60}s`, color: 'var(--text-muted)' },
                            { label: 'Prize', value: selected.prize ? `₹${selected.prize}` : 'Free', color: '#059669' },
                        ].map((s, i) => (
                            <div key={i} style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: s.color }}>{s.value}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Runner ups */}
                    {(selected.runnerUp || selected.thirdPlace) && (
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {selected.runnerUp && (
                                <span style={{
                                    padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: '13px', fontWeight: 600,
                                    background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.3)', color: 'var(--rank-silver)'
                                }}>
                                    🥈 {selected.runnerUp.name} — {selected.runnerUp.wpm} WPM
                                </span>
                            )}
                            {selected.thirdPlace && (
                                <span style={{
                                    padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: '13px', fontWeight: 600,
                                    background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.3)', color: 'var(--rank-bronze)'
                                }}>
                                    🥉 {selected.thirdPlace.name} — {selected.thirdPlace.wpm} WPM
                                </span>
                            )}
                        </div>
                    )}

                    <button onClick={() => setSelected(null)} className="btn btn-secondary" style={{ marginTop: '16px' }}>Close</button>
                </div>
            )}

            {/* Winners Table */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bg-glass-border)' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>🏅 All Winners</h3>
                </div>
                {winners.length === 0 ? (
                    <div className="empty-state" style={{ padding: '60px' }}>
                        <div className="empty-state-icon">🏆</div>
                        <div className="empty-state-title">No Winners Yet</div>
                        <div className="empty-state-text">Winners will appear here after competitions end.</div>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr><th>#</th><th>Winner</th><th>WPM</th><th>Accuracy</th><th>Score</th><th>Prize</th><th>Difficulty</th><th>Date</th><th>Participants</th></tr>
                        </thead>
                        <tbody>
                            {winners.map((w, i) => (
                                <tr key={w.id} onClick={() => setSelected(w)} style={{ cursor: 'pointer' }}>
                                    <td style={{ fontWeight: 700, color: 'var(--rank-gold)' }}>{i + 1}</td>
                                    <td style={{ fontWeight: 700 }}>🏆 {w.name}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-primary)' }}>{w.wpm || 0}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', color: (w.accuracy || 0) >= 90 ? 'var(--accent-success)' : 'var(--accent-warning)' }}>{w.accuracy || 0}%</td>
                                    <td style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--rank-gold)' }}>{w.score || 0}</td>
                                    <td style={{ fontWeight: 700, color: w.prize ? '#059669' : 'var(--text-muted)' }}>
                                        {w.prize ? `₹${w.prize}` : 'Free'}
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '3px 8px', borderRadius: 'var(--radius-full)', fontSize: '11px', fontWeight: 600,
                                            background: w.difficulty === 'easy' ? 'rgba(5,150,105,0.1)' : w.difficulty === 'hard' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                            color: w.difficulty === 'easy' ? 'var(--accent-success)' : w.difficulty === 'hard' ? 'var(--accent-danger)' : 'var(--accent-warning)'
                                        }}>
                                            {w.difficulty === 'easy' ? '🟢' : w.difficulty === 'hard' ? '🔴' : '🟡'} {w.difficulty || 'medium'}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(w.date)}</td>
                                    <td style={{ color: 'var(--text-muted)' }}>{w.totalParticipants || 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
