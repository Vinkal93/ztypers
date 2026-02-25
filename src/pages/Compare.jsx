import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FiBarChart2, FiZap, FiTarget, FiAward, FiHash, FiDelete, FiX, FiUser } from 'react-icons/fi';

export default function Compare() {
    const [participants, setParticipants] = useState([]);
    const [selected, setSelected] = useState([]);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'playground_participants'), (snap) => {
            const parts = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.score || 0) - (a.score || 0));
            setParticipants(parts);
        });
        return () => unsub();
    }, []);

    const toggleSelect = (p) => {
        if (selected.find(s => s.id === p.id)) {
            setSelected(selected.filter(s => s.id !== p.id));
        } else if (selected.length < 4) {
            setSelected([...selected, p]);
        }
    };

    const getBarWidth = (val, max) => max > 0 ? Math.round((val / max) * 100) : 0;

    const stats = [
        { key: 'wpm', label: 'WPM', icon: <FiZap size={14} />, color: 'var(--accent-primary)' },
        { key: 'accuracy', label: 'Accuracy %', icon: <FiTarget size={14} />, color: 'var(--accent-success)' },
        { key: 'score', label: 'Score', icon: <FiAward size={14} />, color: 'var(--rank-gold)' },
        { key: 'mistakes', label: 'Mistakes', icon: <FiHash size={14} />, color: 'var(--accent-danger)', lower: true },
        { key: 'backspaceCount', label: 'Backspaces', icon: <FiDelete size={14} />, color: 'var(--text-muted)', lower: true },
        { key: 'totalTyped', label: 'Keystrokes', icon: <FiBarChart2 size={14} />, color: 'var(--accent-secondary)' },
    ];

    const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706'];

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <h1 className="page-title"><FiBarChart2 style={{ marginRight: '8px' }} /> Compare Students</h1>
                <p className="page-subtitle">Select up to 4 students to compare their live performance side-by-side</p>
            </div>

            {/* Student Selector */}
            <div className="glass-card" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '16px' }}>
                    Select Students ({selected.length}/4)
                </h3>
                {participants.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No students in active competition yet.</p>
                ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {participants.map((p, i) => {
                            const isSelected = selected.find(s => s.id === p.id);
                            return (
                                <button key={p.id} onClick={() => toggleSelect(p)}
                                    className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ fontSize: '13px', padding: '8px 14px' }}>
                                    <FiUser size={13} />
                                    {p.name}
                                    {isSelected && <FiX size={13} />}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Comparison */}
            {selected.length >= 2 && (
                <div className="glass-card">
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '24px' }}>
                        📊 Live Comparison
                    </h3>

                    {stats.map(stat => {
                        const maxVal = Math.max(...selected.map(s => s[stat.key] || 0), 1);
                        return (
                            <div key={stat.key} style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    {stat.icon}
                                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{stat.label}</span>
                                </div>
                                {selected.map((s, i) => (
                                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                                        <span style={{ width: '80px', fontSize: '12px', fontWeight: 600, color: colors[i], textAlign: 'right', flexShrink: 0 }}>
                                            {s.name}
                                        </span>
                                        <div style={{ flex: 1, height: '24px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', position: 'relative' }}>
                                            <div style={{
                                                width: `${getBarWidth(s[stat.key] || 0, maxVal)}%`,
                                                height: '100%', background: colors[i], borderRadius: 'var(--radius-sm)',
                                                transition: 'width 0.5s ease', minWidth: '2px',
                                            }} />
                                        </div>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '14px', width: '50px', color: colors[i] }}>
                                            {s[stat.key] || 0}{stat.key === 'accuracy' ? '%' : ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        );
                    })}

                    {/* Summary Table */}
                    <div style={{ marginTop: '24px', overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>WPM</th>
                                    <th>Accuracy</th>
                                    <th>Score</th>
                                    <th>Mistakes</th>
                                    <th>Progress</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selected.map((s, i) => (
                                    <tr key={s.id}>
                                        <td style={{ fontWeight: 600, color: colors[i] }}>{s.name}</td>
                                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{s.wpm || 0}</td>
                                        <td style={{ fontFamily: 'var(--font-mono)' }}>{s.accuracy || 0}%</td>
                                        <td style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--rank-gold)' }}>{s.score || 0}</td>
                                        <td style={{ color: 'var(--accent-danger)' }}>{s.mistakes || 0}</td>
                                        <td>{s.progress || 0}%</td>
                                        <td>
                                            <span style={{
                                                fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: 'var(--radius-full)',
                                                background: s.finished ? 'rgba(5,150,105,0.1)' : 'rgba(37,99,235,0.1)',
                                                color: s.finished ? 'var(--accent-success)' : 'var(--accent-primary)',
                                            }}>
                                                {s.finished ? '✅ Done' : '⌨️ Typing'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selected.length === 1 && (
                <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Select at least 2 students to compare</p>
                </div>
            )}

            {selected.length === 0 && participants.length > 0 && (
                <div className="glass-card" style={{ textAlign: 'center', padding: '60px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '8px' }}>Select Students Above</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Click on student names to add them to comparison. You can compare up to 4 students side-by-side with live data.
                    </p>
                </div>
            )}
        </div>
    );
}
