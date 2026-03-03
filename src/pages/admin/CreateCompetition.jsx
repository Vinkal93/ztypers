import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { paragraphs } from '../../constants/theme';
import { FiSave, FiArrowLeft, FiClock, FiDollarSign, FiFileText, FiType, FiDelete, FiUsers, FiFilter } from 'react-icons/fi';

export default function CreateCompetition() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        title: '',
        duration: 60,
        prize: '',
        entryFee: '',
        paragraph: '',
        date: '',
        backspaceEnabled: true,
    });

    // Batch & Student targeting
    const [batches, setBatches] = useState([]);
    const [students, setStudents] = useState([]);
    const [targetMode, setTargetMode] = useState('all'); // all | batch | students
    const [selectedBatches, setSelectedBatches] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);

    // Load batches & students
    useEffect(() => {
        const unsub1 = onSnapshot(collection(db, 'batches'), snap => {
            setBatches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const unsub2 = onSnapshot(collection(db, 'students'), snap => {
            setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => { unsub1(); unsub2(); };
    }, []);

    const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const toggleBatch = (batchId) => {
        setSelectedBatches(prev =>
            prev.includes(batchId) ? prev.filter(b => b !== batchId) : [...prev, batchId]
        );
    };

    const toggleStudent = (studentId) => {
        setSelectedStudents(prev =>
            prev.includes(studentId) ? prev.filter(s => s !== studentId) : [...prev, studentId]
        );
    };

    const filteredStudents = targetMode === 'batch' && selectedBatches.length > 0
        ? students.filter(s => selectedBatches.includes(s.batch))
        : students;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const compData = {
                title: form.title,
                duration: parseInt(form.duration),
                prize: form.prize ? parseInt(form.prize) : 0,
                entryFee: form.entryFee ? parseInt(form.entryFee) : 0,
                paragraph: form.paragraph || paragraphs[Math.floor(Math.random() * paragraphs.length)],
                date: form.date || new Date().toISOString().split('T')[0],
                backspaceEnabled: form.backspaceEnabled,
                status: 'upcoming',
                createdAt: new Date().toISOString(),
                // Targeting info
                targetMode,
                targetBatches: targetMode === 'batch' ? selectedBatches : [],
                targetStudents: targetMode === 'students' ? selectedStudents : [],
            };
            const docRef = await addDoc(collection(db, 'competitions'), compData);
            console.log('Competition created with ID:', docRef.id);
            navigate('/admin');
        } catch (err) {
            console.error('Error creating competition:', err);
            if (err.code === 'permission-denied') {
                setError('❌ Firestore permission denied! Go to Firebase Console → Firestore → Rules and allow read/write.');
            } else {
                setError(`Error: ${err.message || err.code || 'Unknown error'}`);
            }
        }
        setLoading(false);
    };

    const loadRandomParagraph = () => {
        update('paragraph', paragraphs[Math.floor(Math.random() * paragraphs.length)]);
    };

    return (
        <div className="page-container fade-in">
            <button onClick={() => navigate('/admin')} className="btn btn-secondary" style={{ marginBottom: '24px' }}>
                <FiArrowLeft /> Back to Dashboard
            </button>

            <div className="page-header">
                <h1 className="page-title">🆕 Create Competition</h1>
                <p className="page-subtitle">Set up a new typing challenge — when you start it, all students will compete simultaneously</p>
            </div>

            {error && (
                <div style={{
                    padding: '14px 18px', borderRadius: 'var(--radius-md)', marginBottom: '20px',
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    color: 'var(--accent-danger)', fontSize: '13px', fontWeight: 500, lineHeight: 1.6,
                }}>
                    {error}
                </div>
            )}

            <div className="glass-card" style={{ maxWidth: '700px' }}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="input-label"><FiType style={{ marginRight: '6px' }} />Competition Title</label>
                        <input type="text" className="input" placeholder="e.g., February Speed Challenge 2026"
                            value={form.title} onChange={e => update('title', e.target.value)} required />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="input-label"><FiClock style={{ marginRight: '6px' }} />Duration</label>
                            <select className="input" value={form.duration} onChange={e => update('duration', e.target.value)}>
                                <option value={15}>15 seconds</option>
                                <option value={30}>30 seconds</option>
                                <option value={60}>1 minute</option>
                                <option value={120}>2 minutes</option>
                                <option value={300}>5 minutes</option>
                                <option value={600}>10 minutes</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="input-label">📅 Date</label>
                            <input type="date" className="input" value={form.date} onChange={e => update('date', e.target.value)} />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="input-label"><FiDollarSign style={{ marginRight: '6px' }} />Prize Amount (₹)</label>
                            <input type="number" className="input" placeholder="e.g., 500"
                                value={form.prize} onChange={e => update('prize', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="input-label">💰 Entry Fee (₹)</label>
                            <input type="number" className="input" placeholder="e.g., 50 (0 = free)"
                                value={form.entryFee} onChange={e => update('entryFee', e.target.value)} />
                        </div>
                    </div>

                    {/* Backspace Toggle */}
                    <div className="form-group">
                        <label className="input-label"><FiDelete style={{ marginRight: '6px' }} />Backspace</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <button type="button" className={`toggle-switch ${form.backspaceEnabled ? 'active' : ''}`}
                                onClick={() => update('backspaceEnabled', !form.backspaceEnabled)}>
                                <div className="toggle-knob" />
                            </button>
                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                {form.backspaceEnabled
                                    ? '✅ Students CAN use backspace to correct mistakes'
                                    : '❌ Students CANNOT use backspace — no corrections allowed'}
                            </span>
                        </div>
                    </div>

                    {/* ── Target Selection ── */}
                    <div className="form-group">
                        <label className="input-label"><FiFilter style={{ marginRight: '6px' }} />Target Participants</label>
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                            {[
                                { id: 'all', label: '🌐 All Students', desc: 'Open to everyone' },
                                { id: 'batch', label: '📦 By Batch', desc: 'Select specific batches' },
                                { id: 'students', label: '👤 Specific Students', desc: 'Hand-pick students' },
                            ].map(m => (
                                <button key={m.id} type="button" onClick={() => setTargetMode(m.id)}
                                    style={{
                                        flex: 1, padding: '12px 8px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                        border: targetMode === m.id ? '2px solid var(--accent-primary)' : '1px solid var(--bg-glass-border)',
                                        background: targetMode === m.id ? 'var(--accent-gradient-light)' : 'var(--bg-input)',
                                        textAlign: 'center', transition: 'all 0.2s ease',
                                    }}>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: targetMode === m.id ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{m.label}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{m.desc}</div>
                                </button>
                            ))}
                        </div>

                        {/* Batch selector */}
                        {targetMode === 'batch' && (
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    Select batches ({selectedBatches.length} selected):
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {batches.length === 0 ? (
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No batches found. Create batches from Student Manager first.</span>
                                    ) : batches.map(b => (
                                        <button key={b.id} type="button" onClick={() => toggleBatch(b.id)}
                                            style={{
                                                padding: '8px 16px', borderRadius: 'var(--radius-full)', cursor: 'pointer',
                                                fontSize: '12px', fontWeight: 600, transition: 'all 0.2s ease',
                                                background: selectedBatches.includes(b.id) ? 'var(--accent-primary)' : 'var(--bg-input)',
                                                color: selectedBatches.includes(b.id) ? '#fff' : 'var(--text-secondary)',
                                                border: selectedBatches.includes(b.id) ? '1px solid var(--accent-primary)' : '1px solid var(--bg-glass-border)',
                                            }}>
                                            {selectedBatches.includes(b.id) ? '✓ ' : ''}{b.name || b.id}
                                        </button>
                                    ))}
                                </div>
                                {selectedBatches.length > 0 && (
                                    <div style={{ fontSize: '11px', color: 'var(--accent-success)', marginTop: '6px', fontWeight: 600 }}>
                                        {filteredStudents.length} student(s) from selected batches
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Student selector */}
                        {targetMode === 'students' && (
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    Select students ({selectedStudents.length} selected):
                                </div>
                                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--bg-glass-border)', borderRadius: 'var(--radius-md)', padding: '8px' }}>
                                    {students.length === 0 ? (
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No students found.</span>
                                    ) : students.map(s => (
                                        <label key={s.id}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px',
                                                borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'background 0.2s',
                                                background: selectedStudents.includes(s.id) ? 'var(--accent-gradient-light)' : 'transparent',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                            onMouseLeave={e => e.currentTarget.style.background = selectedStudents.includes(s.id) ? 'var(--accent-gradient-light)' : 'transparent'}>
                                            <input type="checkbox" checked={selectedStudents.includes(s.id)}
                                                onChange={() => toggleStudent(s.id)}
                                                style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }} />
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '13px' }}>{s.name}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.studentId} • {s.batch || 'No batch'}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                    <button type="button" onClick={() => setSelectedStudents(students.map(s => s.id))}
                                        className="btn btn-sm btn-secondary" style={{ fontSize: '11px' }}>Select All</button>
                                    <button type="button" onClick={() => setSelectedStudents([])}
                                        className="btn btn-sm btn-secondary" style={{ fontSize: '11px' }}>Deselect All</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label className="input-label" style={{ marginBottom: 0 }}><FiFileText style={{ marginRight: '6px' }} />Typing Paragraph</label>
                            <button type="button" onClick={loadRandomParagraph} className="btn btn-sm btn-secondary">
                                🎲 Random
                            </button>
                        </div>
                        <textarea className="input" placeholder="Enter the paragraph students will type, or click Random..."
                            value={form.paragraph} onChange={e => update('paragraph', e.target.value)}
                            style={{ minHeight: '160px' }} />
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
                        {loading ? 'Creating...' : <><FiSave /> Create Competition</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
