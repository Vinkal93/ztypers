import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { paragraphs } from '../../constants/theme';
import { FiSave, FiArrowLeft, FiClock, FiDollarSign, FiFileText, FiType, FiDelete } from 'react-icons/fi';

export default function CreateCompetition() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        title: '',
        duration: 60,
        prize: '',
        entryFee: '',
        paragraph: '',
        date: '',
        backspaceEnabled: true,
    });

    const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
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
            };
            await addDoc(collection(db, 'competitions'), compData);
            navigate('/admin');
        } catch (err) {
            console.error('Error:', err);
            alert('Error creating competition. Try again.');
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
