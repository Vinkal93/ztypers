import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, setDoc, onSnapshot, collection, getDocs, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getRandomParagraph, easyParagraphs, mediumParagraphs, hardParagraphs } from '../../constants/theme';
import { FiArrowLeft, FiPlay, FiSquare, FiClock, FiDelete, FiFileText, FiUsers, FiRefreshCw, FiAward, FiRadio, FiDollarSign, FiCheck, FiX } from 'react-icons/fi';

export default function PlaygroundControl() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [settings, setSettings] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [batches, setBatches] = useState([]);
    const [students, setStudents] = useState([]);
    const [form, setForm] = useState({
        paragraph: '',
        duration: 60,
        countdownSeconds: 10,
        backspaceEnabled: true,
        difficulty: 'medium',
        prize: 0,
        batchId: searchParams.get('batch') || '',
    });
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);
    const [showStudentPicker, setShowStudentPicker] = useState(false);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'playground'), (snap) => {
            if (snap.exists()) setSettings(snap.data());
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'playground_participants'), (snap) => {
            const parts = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .map((p, i) => ({ ...p, rank: i + 1 }));
            setParticipants(parts);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        const unsub1 = onSnapshot(collection(db, 'batches'), (snap) => {
            setBatches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const unsub2 = onSnapshot(collection(db, 'students'), (snap) => {
            setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => { unsub1(); unsub2(); };
    }, []);

    // Auto-select students when batch changes
    useEffect(() => {
        if (form.batchId) {
            const batch = batches.find(b => b.id === form.batchId);
            if (batch?.studentIds) {
                setSelectedStudentIds(batch.studentIds);
            }
        } else {
            setSelectedStudentIds(students.map(s => s.id));
        }
    }, [form.batchId, batches, students]);

    const updateSettings = async (data) => {
        try {
            await setDoc(doc(db, 'settings', 'playground'), data, { merge: true });
        } catch (err) {
            console.error('Error:', err);
            alert('Error updating settings');
        }
    };

    const setWaiting = async () => {
        const para = form.paragraph || getRandomParagraph(form.difficulty);
        await updateSettings({
            ...form,
            paragraph: para,
            status: 'waiting',
            selectedStudentIds,
            updatedAt: new Date().toISOString(),
        });
    };

    const startCountdown = async () => {
        const para = form.paragraph || getRandomParagraph(form.difficulty);
        await updateSettings({
            ...form,
            paragraph: para,
            status: 'countdown',
            selectedStudentIds,
            countdownSeconds: form.countdownSeconds,
        });
        setTimeout(async () => {
            await updateSettings({ status: 'active', startedAt: new Date().toISOString() });
        }, (form.countdownSeconds || 10) * 1000);
    };

    const startNow = async () => {
        const para = form.paragraph || getRandomParagraph(form.difficulty);
        await updateSettings({
            ...form,
            paragraph: para,
            status: 'active',
            selectedStudentIds,
            startedAt: new Date().toISOString(),
            countdownSeconds: 3,
        });
    };

    const stopCompetition = async () => {
        await updateSettings({ status: 'ended', endedAt: new Date().toISOString() });
        // Save to competition_history for batch history
        try {
            const selectedBatch = batches.find(b => b.id === form.batchId);
            await addDoc(collection(db, 'competition_history'), {
                batchId: form.batchId || '',
                batchName: selectedBatch?.name || 'No Batch',
                duration: form.duration || 60,
                difficulty: form.difficulty || 'medium',
                prize: form.prize || 0,
                participants: participants.map(p => ({
                    id: p.id,
                    studentId: p.studentId || p.id,
                    name: p.name,
                    wpm: p.wpm || 0,
                    accuracy: p.accuracy || 0,
                    score: p.score || 0,
                    mistakes: p.mistakes || 0,
                    backspaceCount: p.backspaceCount || 0,
                    finished: p.finished || false,
                })),
                endedAt: new Date().toISOString(),
            });
        } catch (err) {
            console.error('Error saving competition history:', err);
        }

        // Save winner to winners collection
        if (participants.length > 0) {
            const winner = participants[0];
            try {
                await addDoc(collection(db, 'winners'), {
                    name: winner.name,
                    studentId: winner.studentId || winner.id,
                    wpm: winner.wpm || 0,
                    accuracy: winner.accuracy || 0,
                    score: winner.score || 0,
                    mistakes: winner.mistakes || 0,
                    prize: form.prize || 0,
                    difficulty: form.difficulty || 'medium',
                    duration: form.duration || 60,
                    batchId: form.batchId || '',
                    batchName: batches.find(b => b.id === form.batchId)?.name || '',
                    totalParticipants: participants.length,
                    date: new Date().toISOString(),
                    runnerUp: participants[1] ? { name: participants[1].name, wpm: participants[1].wpm, score: participants[1].score } : null,
                    thirdPlace: participants[2] ? { name: participants[2].name, wpm: participants[2].wpm, score: participants[2].score } : null,
                });
            } catch (err) {
                console.error('Error saving winner:', err);
            }
        }
    };

    const resetPlayground = async () => {
        const snap = await getDocs(collection(db, 'playground_participants'));
        for (const d of snap.docs) {
            await deleteDoc(doc(db, 'playground_participants', d.id));
        }
        await updateSettings({
            status: 'waiting', paragraph: '', duration: 60, countdownSeconds: 10,
            backspaceEnabled: true, difficulty: 'medium', prize: 0, batchId: '', selectedStudentIds: [],
        });
        setForm({ paragraph: '', duration: 60, countdownSeconds: 10, backspaceEnabled: true, difficulty: 'medium', prize: 0, batchId: '' });
        setSelectedStudentIds([]);
    };

    const randomParagraph = () => {
        setForm(prev => ({ ...prev, paragraph: getRandomParagraph(prev.difficulty) }));
    };

    const toggleStudentSelection = (sid) => {
        setSelectedStudentIds(prev =>
            prev.includes(sid) ? prev.filter(s => s !== sid) : [...prev, sid]
        );
    };

    const isActive = settings?.status === 'active';
    const isCountdown = settings?.status === 'countdown';
    const batchStudents = form.batchId ? students.filter(s => (batches.find(b => b.id === form.batchId)?.studentIds || []).includes(s.id)) : students;

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
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
                    {form.batchId && (
                        <span style={{ padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '11px', fontWeight: 700, background: 'rgba(124,58,237,0.1)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.3)' }}>
                            📦 {batches.find(b => b.id === form.batchId)?.name || 'Batch'}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {!isActive && !isCountdown && (
                        <>
                            <button onClick={setWaiting} className="btn btn-secondary">⏳ Set Waiting Mode</button>
                            <button onClick={startCountdown} className="btn btn-primary btn-lg">
                                <FiClock /> Start with Countdown ({form.countdownSeconds}s)
                            </button>
                            <button onClick={startNow} className="btn btn-success">
                                <FiPlay /> Start Now (3s)
                            </button>
                        </>
                    )}
                    {(isActive || isCountdown) && (
                        <button onClick={stopCompetition} className="btn btn-danger btn-lg">
                            <FiSquare /> Stop Competition
                        </button>
                    )}
                    <button onClick={resetPlayground} className="btn btn-secondary"><FiRefreshCw /> Reset All</button>
                </div>
            </div>

            {/* Settings */}
            <div className="grid-2" style={{ marginBottom: '24px' }}>
                <div className="glass-card">
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '16px' }}>⚙️ Settings</h3>

                    {/* Batch Selector */}
                    <div className="form-group">
                        <label className="input-label">📦 Batch</label>
                        <select className="input" value={form.batchId} onChange={e => setForm({ ...form, batchId: e.target.value })}>
                            <option value="">All Students (No Batch Filter)</option>
                            {batches.map(b => (
                                <option key={b.id} value={b.id}>{b.name} ({(b.studentIds || []).length} students)</option>
                            ))}
                        </select>
                    </div>

                    {/* Student Selector */}
                    <div className="form-group">
                        <label className="input-label">👥 Participants ({selectedStudentIds.length} selected)</label>
                        <button onClick={() => setShowStudentPicker(!showStudentPicker)}
                            className="btn btn-sm btn-secondary" style={{ marginBottom: '8px' }}>
                            <FiUsers size={14} /> {showStudentPicker ? 'Hide' : 'Choose Students'}
                        </button>
                        {showStudentPicker && (
                            <div style={{ maxHeight: '200px', overflow: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-glass-border)', padding: '8px' }}>
                                <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                                    <button onClick={() => setSelectedStudentIds(batchStudents.map(s => s.id))} className="btn btn-sm btn-primary" style={{ fontSize: '11px' }}>Select All</button>
                                    <button onClick={() => setSelectedStudentIds([])} className="btn btn-sm btn-secondary" style={{ fontSize: '11px' }}>Clear</button>
                                </div>
                                {batchStudents.map(s => (
                                    <label key={s.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', cursor: 'pointer',
                                        borderRadius: '6px', fontSize: '13px',
                                        background: selectedStudentIds.includes(s.id) ? 'rgba(0,212,255,0.08)' : 'transparent',
                                    }}>
                                        <input type="checkbox" checked={selectedStudentIds.includes(s.id)}
                                            onChange={() => toggleStudentSelection(s.id)} />
                                        <span style={{ fontWeight: 600 }}>{s.name}</span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>{s.studentId || s.id}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Difficulty */}
                    <div className="form-group">
                        <label className="input-label">📚 Difficulty Level</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {['easy', 'medium', 'hard'].map(d => (
                                <button key={d} onClick={() => setForm({ ...form, difficulty: d })}
                                    className={`btn ${form.difficulty === d ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ flex: 1, textTransform: 'capitalize', fontSize: '13px' }}>
                                    {d === 'easy' ? '🟢' : d === 'medium' ? '🟡' : '🔴'} {d}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="input-label"><FiClock style={{ marginRight: '4px' }} /> Duration</label>
                        <select className="input" value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) })}>
                            <option value={15}>15 seconds</option>
                            <option value={30}>30 seconds</option>
                            <option value={60}>1 minute</option>
                            <option value={120}>2 minutes</option>
                            <option value={300}>5 minutes</option>
                            <option value={600}>10 minutes</option>
                            <option value={900}>15 minutes</option>
                            <option value={1800}>30 minutes</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="input-label">⏱ Countdown</label>
                        <select className="input" value={form.countdownSeconds} onChange={e => setForm({ ...form, countdownSeconds: parseInt(e.target.value) })}>
                            <option value={3}>3 seconds</option>
                            <option value={5}>5 seconds</option>
                            <option value={10}>10 seconds</option>
                            <option value={15}>15 seconds</option>
                            <option value={30}>30 seconds</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="input-label"><FiDollarSign style={{ marginRight: '4px' }} /> Prize Amount (₹)</label>
                        <input type="number" className="input" placeholder="e.g., 500 (0 = no prize)"
                            value={form.prize} onChange={e => setForm({ ...form, prize: parseInt(e.target.value) || 0 })} />
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
                        <button onClick={randomParagraph} className="btn btn-sm btn-secondary">🎲 Random ({form.difficulty})</button>
                    </div>
                    <textarea className="input" value={form.paragraph}
                        onChange={e => setForm({ ...form, paragraph: e.target.value })}
                        placeholder={`Click 🎲 Random to load a ${form.difficulty} paragraph...`}
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
                            <tr><th>Rank</th><th>Name</th><th>ID</th><th>WPM</th><th>Accuracy</th><th>Score</th><th>Mistakes</th><th>Backsp</th></tr>
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
