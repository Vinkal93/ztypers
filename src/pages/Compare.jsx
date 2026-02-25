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

            // Auto-update selected
            setSelected(prev => prev.map(s => {
                const updated = parts.find(p => p.id === s.id);
                return updated || s;
            }));
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

    const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706'];
    const statFields = [
        { key: 'wpm', label: 'WPM', suffix: '' },
        { key: 'accuracy', label: 'Accuracy', suffix: '%' },
        { key: 'score', label: 'Score', suffix: '' },
        { key: 'mistakes', label: 'Mistakes', suffix: '' },
        { key: 'backspaceCount', label: 'Backspaces', suffix: '' },
        { key: 'totalTyped', label: 'Keystrokes', suffix: '' },
        { key: 'correctChars', label: 'Correct Chars', suffix: '' },
        { key: 'progress', label: 'Progress', suffix: '%' },
    ];

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <h1 className="page-title"><FiBarChart2 style={{ marginRight: '8px' }} /> Compare Students</h1>
                <p className="page-subtitle">Select up to 4 students for a professional head-to-head comparison</p>
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
                        {participants.map(p => {
                            const idx = selected.findIndex(s => s.id === p.id);
                            const isSelected = idx >= 0;
                            return (
                                <button key={p.id} onClick={() => toggleSelect(p)}
                                    style={{
                                        padding: '8px 16px', borderRadius: 'var(--radius-full)', fontSize: '13px', fontWeight: 600,
                                        border: `2px solid ${isSelected ? colors[idx] : 'var(--bg-glass-border)'}`,
                                        background: isSelected ? `${colors[idx]}15` : 'var(--bg-glass)',
                                        color: isSelected ? colors[idx] : 'var(--text-secondary)',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease',
                                    }}>
                                    <FiUser size={13} /> {p.name}
                                    {isSelected && <FiX size={13} />}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Professional Table Comparison */}
            {selected.length >= 2 && (
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bg-glass-border)' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>📊 Head-to-Head Comparison (Live)</h3>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', minWidth: '120px' }}>Metric</th>
                                    {selected.map((s, i) => (
                                        <th key={s.id} style={{ color: colors[i], minWidth: '100px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors[i] }} />
                                                {s.name}
                                            </div>
                                        </th>
                                    ))}
                                    <th style={{ minWidth: '80px' }}>Best</th>
                                </tr>
                            </thead>
                            <tbody>
                                {statFields.map(sf => {
                                    const values = selected.map(s => s[sf.key] || 0);
                                    const bestVal = sf.key === 'mistakes' || sf.key === 'backspaceCount'
                                        ? Math.min(...values)
                                        : Math.max(...values);
                                    return (
                                        <tr key={sf.key}>
                                            <td style={{ fontWeight: 600, fontSize: '13px' }}>{sf.label}</td>
                                            {selected.map((s, i) => {
                                                const val = s[sf.key] || 0;
                                                const isBest = val === bestVal;
                                                return (
                                                    <td key={s.id} style={{
                                                        fontFamily: 'var(--font-mono)', fontWeight: isBest ? 800 : 500, fontSize: '15px',
                                                        color: isBest ? colors[i] : 'var(--text-secondary)',
                                                        background: isBest ? `${colors[i]}08` : undefined,
                                                        textAlign: 'center',
                                                    }}>
                                                        {val}{sf.suffix}
                                                        {isBest && ' ⭐'}
                                                    </td>
                                                );
                                            })}
                                            <td style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                                                {selected[values.indexOf(bestVal)]?.name}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {/* Status Row */}
                                <tr>
                                    <td style={{ fontWeight: 600, fontSize: '13px' }}>Status</td>
                                    {selected.map((s, i) => (
                                        <td key={s.id} style={{ textAlign: 'center' }}>
                                            <span style={{
                                                fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: 'var(--radius-full)',
                                                background: s.finished ? 'rgba(5,150,105,0.1)' : 'rgba(37,99,235,0.1)',
                                                color: s.finished ? 'var(--accent-success)' : 'var(--accent-primary)',
                                            }}>
                                                {s.finished ? '✅ Done' : '⌨️ Typing'}
                                            </span>
                                        </td>
                                    ))}
                                    <td />
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selected.length === 1 && (
                <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Select at least 2 students to compare</p>
                </div>
            )}

            {selected.length === 0 && participants.length > 0 && (
                <div className="glass-card" style={{ textAlign: 'center', padding: '60px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '8px' }}>Select Students Above</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Click on student names to compare their performance side-by-side. Data updates live!</p>
                </div>
            )}
        </div>
    );
}
