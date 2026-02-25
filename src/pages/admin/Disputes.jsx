import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { rankParticipants } from '../../lib/ranking';
import { FiArrowLeft, FiSearch, FiShield, FiClock, FiHash, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

export default function Disputes() {
    const { compId } = useParams();
    const navigate = useNavigate();
    const [competition, setCompetition] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [compareA, setCompareA] = useState(null);
    const [compareB, setCompareB] = useState(null);
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

    const getSuspicion = (p) => {
        const flags = [];
        if (p.tabSwitches > 2) flags.push('Excessive tab switching');
        if (p.wpm > 120) flags.push('Unusually high WPM');
        if (p.backspaceCount === 0 && p.totalKeystrokes > 50) flags.push('Zero backspaces (suspicious)');
        if (p.accuracy === 100 && p.wpm > 80) flags.push('Perfect accuracy at high speed');
        return flags;
    };

    return (
        <div className="page-container fade-in">
            <button onClick={() => navigate(`/admin/manage/${compId}`)} className="btn btn-secondary" style={{ marginBottom: '24px' }}>
                <FiArrowLeft /> Back to Manage
            </button>

            <div className="page-header">
                <h1 className="page-title">🧾 Objection Handling System</h1>
                <p className="page-subtitle">{competition?.title} — Full audit trail for dispute resolution</p>
            </div>

            {/* How it works */}
            <div className="glass-card" style={{ marginBottom: '24px', borderColor: 'rgba(0,212,255,0.2)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '8px' }}>
                    <FiShield style={{ marginRight: '8px' }} />How Disputes Work
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7 }}>
                    If a student claims "Winner mai hu", you can open their full keystroke history, exact time log,
                    error report, and see the real calculated score formula. The system stores every key pressed
                    with timestamps — providing transparent, verifiable proof of each participant's performance.
                </p>
            </div>

            {/* Suspicion Flags */}
            <div className="glass-card" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '16px' }}>
                    <FiAlertTriangle style={{ marginRight: '8px', color: 'var(--accent-warning)' }} /> Auto-Flagged Participants
                </h3>
                {participants.filter(p => getSuspicion(p).length > 0).length === 0 ? (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
                        background: 'rgba(16,185,129,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.3)'
                    }}>
                        <FiCheckCircle size={20} style={{ color: 'var(--accent-success)' }} />
                        <span style={{ color: 'var(--accent-success)', fontWeight: 600 }}>No suspicious activity detected. Fair play! ✅</span>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {participants.filter(p => getSuspicion(p).length > 0).map(p => (
                            <div key={p.id} style={{
                                padding: '16px', borderRadius: 'var(--radius-md)',
                                background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '13px' }}>{p.name?.[0]}</div>
                                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Rank #{p.rank}</span>
                                    </div>
                                    <span style={{ fontSize: '13px', color: 'var(--accent-danger)', fontWeight: 600 }}>
                                        {getSuspicion(p).length} flag(s)
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {getSuspicion(p).map((flag, i) => (
                                        <span key={i} style={{
                                            padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '11px',
                                            background: 'rgba(239,68,68,0.15)', color: 'var(--accent-danger)', fontWeight: 500,
                                        }}>⚠ {flag}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Compare Two Participants */}
            <div className="glass-card" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '16px' }}>
                    <FiSearch style={{ marginRight: '8px' }} /> Compare Participants (Dispute Resolution)
                </h3>
                <div className="form-row" style={{ marginBottom: '20px' }}>
                    <div>
                        <label className="input-label">Participant A (Claimant)</label>
                        <select className="input" value={compareA?.id || ''} onChange={e => setCompareA(participants.find(p => p.id === e.target.value))}>
                            <option value="">Select...</option>
                            {participants.map(p => <option key={p.id} value={p.id}>#{p.rank} {p.name} (Score: {p.score})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="input-label">Participant B (Current Winner)</label>
                        <select className="input" value={compareB?.id || ''} onChange={e => setCompareB(participants.find(p => p.id === e.target.value))}>
                            <option value="">Select...</option>
                            {participants.map(p => <option key={p.id} value={p.id}>#{p.rank} {p.name} (Score: {p.score})</option>)}
                        </select>
                    </div>
                </div>

                {compareA && compareB && (
                    <div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Metric</th>
                                    <th style={{ textAlign: 'center' }}>{compareA.name}</th>
                                    <th style={{ textAlign: 'center' }}>{compareB.name}</th>
                                    <th style={{ textAlign: 'center' }}>Winner</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { label: 'Final Score', a: compareA.score, b: compareB.score, higher: true },
                                    { label: 'WPM', a: compareA.wpm, b: compareB.wpm, higher: true },
                                    { label: 'Accuracy', a: `${compareA.accuracy}%`, b: `${compareB.accuracy}%`, aVal: compareA.accuracy, bVal: compareB.accuracy, higher: true },
                                    { label: 'Total Keystrokes', a: compareA.totalKeystrokes || 0, b: compareB.totalKeystrokes || 0 },
                                    { label: 'Mistakes', a: compareA.mistakes || 0, b: compareB.mistakes || 0, higher: false },
                                    { label: 'Backspaces', a: compareA.backspaceCount || 0, b: compareB.backspaceCount || 0 },
                                    { label: 'Tab Switches', a: compareA.tabSwitches || 0, b: compareB.tabSwitches || 0, higher: false },
                                ].map((row, i) => {
                                    const aVal = row.aVal ?? row.a;
                                    const bVal = row.bVal ?? row.b;
                                    let winner = '-';
                                    if (typeof aVal === 'number' && typeof bVal === 'number') {
                                        if (row.higher === true) winner = aVal > bVal ? compareA.name : aVal < bVal ? compareB.name : 'Tie';
                                        else if (row.higher === false) winner = aVal < bVal ? compareA.name : aVal > bVal ? compareB.name : 'Tie';
                                    }
                                    return (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{row.label}</td>
                                            <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{row.a}</td>
                                            <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{row.b}</td>
                                            <td style={{
                                                textAlign: 'center', fontWeight: 700,
                                                color: winner === compareA.name ? 'var(--accent-primary)' : winner === compareB.name ? 'var(--accent-secondary)' : 'var(--text-muted)'
                                            }}>
                                                {winner === 'Tie' ? '🤝 Tie' : winner === '-' ? '-' : `✅ ${winner}`}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Score Proof */}
                        <div style={{ marginTop: '20px' }}>
                            <h4 style={{ fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)' }}>📐 Score Calculation Proof</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                {[compareA, compareB].map((p, i) => (
                                    <div key={i} style={{
                                        padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)',
                                        fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: 2,
                                    }}>
                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>{p.name}</div>
                                        <div>WPM = <span style={{ color: 'var(--accent-primary)' }}>{p.wpm}</span></div>
                                        <div>Accuracy = <span style={{ color: 'var(--accent-success)' }}>{p.accuracy}%</span></div>
                                        <div>Score = {p.wpm} × ({p.accuracy}/100) = <span style={{ color: 'var(--rank-gold)', fontWeight: 800 }}>{p.score}</span></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Full Audit Table */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-glass-border)' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>📋 Full Audit Trail</h3>
                </div>
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
                            <th>Backspaces</th>
                            <th>Tab SW</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {participants.map(p => {
                            const flags = getSuspicion(p);
                            return (
                                <tr key={p.id}>
                                    <td style={{
                                        fontWeight: 800, fontFamily: 'var(--font-display)',
                                        color: p.rank <= 3 ? ['var(--rank-gold)', 'var(--rank-silver)', 'var(--rank-bronze)'][p.rank - 1] : 'var(--text-secondary)'
                                    }}>
                                        #{p.rank}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{p.wpm}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', color: p.accuracy >= 90 ? 'var(--accent-success)' : 'var(--accent-warning)' }}>{p.accuracy}%</td>
                                    <td style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--rank-gold)' }}>{p.score}</td>
                                    <td>{p.totalKeystrokes || 0}</td>
                                    <td style={{ color: 'var(--accent-danger)' }}>{p.mistakes || 0}</td>
                                    <td>{p.backspaceCount || 0}</td>
                                    <td style={{ color: p.tabSwitches > 0 ? 'var(--accent-danger)' : 'var(--text-muted)' }}>{p.tabSwitches || 0}</td>
                                    <td>
                                        {flags.length > 0 ? (
                                            <span style={{ color: 'var(--accent-danger)', fontSize: '12px', fontWeight: 600 }}>⚠ {flags.length} flags</span>
                                        ) : (
                                            <span style={{ color: 'var(--accent-success)', fontSize: '12px' }}>✅ Clean</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
