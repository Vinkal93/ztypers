import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, onSnapshot, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { paragraphs } from '../../constants/theme';
import { FiArrowLeft, FiPlay, FiSquare, FiClock, FiDelete, FiFileText, FiUsers, FiRefreshCw, FiAward, FiRadio } from 'react-icons/fi';

export default function PlaygroundControl() {
    const navigate = useNavigate();
    const [settings, setSettings] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [form, setForm] = useState({
        paragraph: '',
        duration: 60,
        countdownSeconds: 10,
        backspaceEnabled: true,
    });

    // Listen to playground settings
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'playground'), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setSettings(data);
            }
        });
        return () => unsub();
    }, []);

    // Listen to participants
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'playground_participants'), (snap) => {
            const parts = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .map((p, i) => ({ ...p, rank: i + 1 }));
            setParticipants(parts);
        });
        return () => unsub();
    }, []);

    const updateSettings = async (data) => {
        try {
            await setDoc(doc(db, 'settings', 'playground'), data, { merge: true });
        } catch (err) {
            console.error('Error:', err);
            alert('Error updating settings');
        }
    };

    const setWaiting = async () => {
        await updateSettings({
            ...form,
            paragraph: form.paragraph || paragraphs[Math.floor(Math.random() * paragraphs.length)],
            status: 'waiting',
            updatedAt: new Date().toISOString(),
        });
    };

    const startCountdown = async () => {
        await updateSettings({ status: 'countdown', countdownSeconds: form.countdownSeconds });
        // After countdown finishes, set to active
        setTimeout(async () => {
            await updateSettings({ status: 'active', startedAt: new Date().toISOString() });
        }, (form.countdownSeconds || 10) * 1000);
    };

    const startNow = async () => {
        await updateSettings({
            ...form,
            paragraph: form.paragraph || paragraphs[Math.floor(Math.random() * paragraphs.length)],
            status: 'active',
            startedAt: new Date().toISOString(),
            countdownSeconds: 3,
        });
    };

    const stopCompetition = async () => {
        await updateSettings({ status: 'ended', endedAt: new Date().toISOString() });
    };

    const resetPlayground = async () => {
        // Clear all participants
        const snap = await getDocs(collection(db, 'playground_participants'));
        for (const d of snap.docs) {
            await deleteDoc(doc(db, 'playground_participants', d.id));
        }
        await updateSettings({
            status: 'waiting',
            paragraph: '',
            duration: 60,
            countdownSeconds: 10,
            backspaceEnabled: true,
        });
        setForm({ paragraph: '', duration: 60, countdownSeconds: 10, backspaceEnabled: true });
    };

    const randomParagraph = () => {
        setForm(prev => ({ ...prev, paragraph: paragraphs[Math.floor(Math.random() * paragraphs.length)] }));
    };

    const isActive = settings?.status === 'active';
    const isCountdown = settings?.status === 'countdown';

    return (
        <div className="page-container fade-in">
            <button onClick={() => navigate('/admin')} className="btn btn-secondary" style={{ marginBottom: '24px' }}>
                <FiArrowLeft /> Back
            </button>

            <div className="page-header">
                <h1 className="page-title">🎮 Playground Control</h1>
                <p className="page-subtitle">Set up and control live typing for all students</p>
            </div>

            {/* Status */}
            <div className="glass-card" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <span style={{
                        padding: '6px 16px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '13px',
                        background: isActive ? 'rgba(5,150,105,0.1)' : isCountdown ? 'rgba(245,158,11,0.1)' : 'rgba(107,114,128,0.1)',
                        color: isActive ? 'var(--accent-success)' : isCountdown ? 'var(--accent-warning)' : 'var(--text-muted)',
                        border: `1px solid ${isActive ? 'rgba(5,150,105,0.3)' : isCountdown ? 'rgba(245,158,11,0.3)' : 'rgba(107,114,128,0.3)'}`,
                    }}>
                        {isActive ? '🟢 LIVE' : isCountdown ? '🟡 COUNTDOWN' : settings?.status === 'ended' ? '🔴 ENDED' : '⚪ WAITING'}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                        <FiUsers size={14} style={{ marginRight: '4px' }} /> {participants.length} participants
                    </span>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {!isActive && !isCountdown && (
                        <>
                            <button onClick={setWaiting} className="btn btn-secondary">
                                ⏳ Set Waiting Mode
                            </button>
                            <button onClick={startCountdown} className="btn btn-primary btn-lg">
                                <FiClock /> Start with Countdown ({form.countdownSeconds}s)
                            </button>
                            <button onClick={startNow} className="btn btn-success">
                                <FiPlay /> Start Now (3s countdown)
                            </button>
                        </>
                    )}
                    {(isActive || isCountdown) && (
                        <button onClick={stopCompetition} className="btn btn-danger btn-lg">
                            <FiSquare /> Stop Competition
                        </button>
                    )}
                    <button onClick={resetPlayground} className="btn btn-secondary">
                        <FiRefreshCw /> Reset All
                    </button>
                </div>
            </div>

            {/* Settings */}
            <div className="grid-2" style={{ marginBottom: '24px' }}>
                <div className="glass-card">
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '16px' }}>⚙️ Settings</h3>
                    <div className="form-group">
                        <label className="input-label"><FiClock style={{ marginRight: '4px' }} /> Duration</label>
                        <select className="input" value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) })}>
                            <option value={15}>15 seconds</option>
                            <option value={30}>30 seconds</option>
                            <option value={60}>1 minute</option>
                            <option value={120}>2 minutes</option>
                            <option value={300}>5 minutes</option>
                            <option value={600}>10 minutes</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="input-label">⏱ Countdown (seconds before start)</label>
                        <select className="input" value={form.countdownSeconds} onChange={e => setForm({ ...form, countdownSeconds: parseInt(e.target.value) })}>
                            <option value={3}>3 seconds</option>
                            <option value={5}>5 seconds</option>
                            <option value={10}>10 seconds</option>
                            <option value={15}>15 seconds</option>
                            <option value={30}>30 seconds</option>
                            <option value={60}>1 minute</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="input-label"><FiDelete style={{ marginRight: '4px' }} /> Backspace</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button className={`toggle-switch ${form.backspaceEnabled ? 'active' : ''}`}
                                onClick={() => setForm({ ...form, backspaceEnabled: !form.backspaceEnabled })}>
                                <div className="toggle-knob" />
                            </button>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                {form.backspaceEnabled ? '✅ Allowed' : '❌ Disabled'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>📝 Paragraph</h3>
                        <button onClick={randomParagraph} className="btn btn-sm btn-secondary">🎲 Random</button>
                    </div>
                    <textarea className="input" value={form.paragraph}
                        onChange={e => setForm({ ...form, paragraph: e.target.value })}
                        placeholder="Enter the paragraph for students to type..."
                        style={{ minHeight: '200px' }} />
                </div>
            </div>

            {/* Live Rankings */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{
                    padding: '16px 24px', borderBottom: '1px solid var(--bg-glass-border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                        <FiRadio style={{ marginRight: '8px' }} /> Live Rankings
                    </h3>
                    {isActive && <span style={{ fontSize: '12px', color: 'var(--accent-success)', fontWeight: 600 }}>🔴 Live</span>}
                </div>
                {participants.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px' }}>
                        <div className="empty-state-icon">👥</div>
                        <div className="empty-state-title">No participants yet</div>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Name</th>
                                <th>ID</th>
                                <th>WPM</th>
                                <th>Accuracy</th>
                                <th>Score</th>
                                <th>Mistakes</th>
                                <th>Backspaces</th>
                            </tr>
                        </thead>
                        <tbody>
                            {participants.map(p => (
                                <tr key={p.id}>
                                    <td style={{
                                        fontFamily: 'var(--font-display)', fontWeight: 800,
                                        color: p.rank <= 3 ? ['var(--rank-gold)', 'var(--rank-silver)', 'var(--rank-bronze)'][p.rank - 1] : 'var(--text-muted)'
                                    }}>
                                        {p.rank <= 3 ? ['🥇', '🥈', '🥉'][p.rank - 1] : `#${p.rank}`}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{p.studentId}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-primary)' }}>{p.wpm}</td>
                                    <td style={{
                                        fontFamily: 'var(--font-mono)',
                                        color: p.accuracy >= 90 ? 'var(--accent-success)' : 'var(--accent-warning)'
                                    }}>{p.accuracy}%</td>
                                    <td style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--rank-gold)' }}>{p.score}</td>
                                    <td style={{ color: 'var(--accent-danger)' }}>{p.mistakes || 0}</td>
                                    <td>{p.backspaceCount || 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
