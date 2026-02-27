import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiCalendar, FiDollarSign, FiUsers, FiClock, FiSave, FiX, FiEye, FiEyeOff, FiZap, FiBarChart2 } from 'react-icons/fi';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export default function EventManager() {
    const { userData } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventTime, setEventTime] = useState('');
    const [duration, setDuration] = useState(60);
    const [prize, setPrize] = useState('');
    const [difficulty, setDifficulty] = useState('Medium');
    const [maxParticipants, setMaxParticipants] = useState('');
    const [entryFee, setEntryFee] = useState('');
    const [published, setPublished] = useState(false);
    const [scheduledStart, setScheduledStart] = useState('');
    const [saving, setSaving] = useState(false);

    // Listen to events
    useEffect(() => {
        const q = query(collection(db, 'events'));
        const unsub = onSnapshot(q, (snap) => {
            const evts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            evts.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            setEvents(evts);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const resetForm = () => {
        setTitle(''); setDescription(''); setEventDate(''); setEventTime('');
        setDuration(60); setPrize(''); setDifficulty('Medium'); setMaxParticipants('');
        setEntryFee(''); setPublished(false); setScheduledStart('');
        setEditingId(null); setShowForm(false);
    };

    const handleEdit = (ev) => {
        setTitle(ev.title || '');
        setDescription(ev.description || '');
        setEventDate(ev.eventDate || '');
        setEventTime(ev.eventTime || '');
        setDuration(ev.duration || 60);
        setPrize(ev.prize || '');
        setDifficulty(ev.difficulty || 'Medium');
        setMaxParticipants(ev.maxParticipants || '');
        setEntryFee(ev.entryFee || '');
        setPublished(ev.published || false);
        setScheduledStart(ev.scheduledStart || '');
        setEditingId(ev.id);
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!title.trim() || !eventDate) return;
        setSaving(true);
        const data = {
            title: title.trim(),
            description: description.trim(),
            eventDate,
            eventTime,
            duration: Number(duration) || 60,
            prize: prize ? Number(prize) : 0,
            difficulty,
            maxParticipants: maxParticipants ? Number(maxParticipants) : 0,
            entryFee: entryFee ? Number(entryFee) : 0,
            published,
            scheduledStart: scheduledStart || '',
            instituteId: userData?.instituteId || '',
            updatedAt: new Date().toISOString(),
        };
        try {
            if (editingId) {
                await setDoc(doc(db, 'events', editingId), data, { merge: true });
            } else {
                data.createdAt = new Date().toISOString();
                data.status = 'upcoming';
                await addDoc(collection(db, 'events'), data);
            }
            resetForm();
        } catch (err) {
            alert('Error: ' + err.message);
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        try {
            await deleteDoc(doc(db, 'events', id));
            setDeleteConfirm(null);
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const togglePublished = async (ev) => {
        await setDoc(doc(db, 'events', ev.id), { published: !ev.published, updatedAt: new Date().toISOString() }, { merge: true });
    };

    const formatDate = (d) => {
        if (!d) return '-';
        return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <div className="page-container fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 className="page-title">📅 Event Manager</h1>
                    <p className="page-subtitle">Create, edit, and manage competitions & events</p>
                </div>
                <button onClick={() => { resetForm(); setShowForm(true); }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiPlus /> Create Event
                </button>
            </div>

            {/* ========= CREATE/EDIT FORM ========= */}
            {showForm && (
                <div className="glass-card" style={{ marginBottom: '24px', padding: '28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                            {editingId ? '✏️ Edit Event' : '🆕 New Event'}
                        </h2>
                        <button onClick={resetForm} className="btn btn-sm btn-secondary"><FiX size={14} /></button>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="input-label">Event Title *</label>
                            <input type="text" className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Speed Typing Championship" />
                        </div>
                        <div className="form-group">
                            <label className="input-label">Difficulty</label>
                            <select className="input" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="input-label">Description</label>
                        <textarea className="input" value={description} onChange={e => setDescription(e.target.value)}
                            placeholder="Tell participants what this event is about..." rows={3} style={{ minHeight: '80px' }} />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="input-label"><FiCalendar size={13} style={{ marginRight: '4px' }} />Event Date *</label>
                            <input type="date" className="input" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="input-label"><FiClock size={13} style={{ marginRight: '4px' }} />Event Time</label>
                            <input type="time" className="input" value={eventTime} onChange={e => setEventTime(e.target.value)} />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="input-label"><FiClock size={13} style={{ marginRight: '4px' }} />Duration (seconds)</label>
                            <input type="number" className="input" value={duration} onChange={e => setDuration(e.target.value)} min={10} />
                        </div>
                        <div className="form-group">
                            <label className="input-label"><FiDollarSign size={13} style={{ marginRight: '4px' }} />Prize (₹)</label>
                            <input type="number" className="input" value={prize} onChange={e => setPrize(e.target.value)} placeholder="0" min={0} />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="input-label"><FiUsers size={13} style={{ marginRight: '4px' }} />Max Participants</label>
                            <input type="number" className="input" value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)} placeholder="0 = unlimited" min={0} />
                        </div>
                        <div className="form-group">
                            <label className="input-label"><FiDollarSign size={13} style={{ marginRight: '4px' }} />Entry Fee (₹)</label>
                            <input type="number" className="input" value={entryFee} onChange={e => setEntryFee(e.target.value)} placeholder="0 = free" min={0} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="input-label"><FiZap size={13} style={{ marginRight: '4px' }} />Scheduled Auto-Start (optional)</label>
                        <input type="datetime-local" className="input" value={scheduledStart} onChange={e => setScheduledStart(e.target.value)} />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                            If set, the competition will auto-start at this time
                        </span>
                    </div>

                    {/* Publish Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
                        <button onClick={() => setPublished(!published)}
                            style={{
                                width: '48px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer',
                                background: published ? 'var(--accent-success)' : 'var(--bg-glass-border)',
                                position: 'relative', transition: 'all 0.2s ease',
                            }}>
                            <div style={{
                                width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
                                position: 'absolute', top: '3px', left: published ? '25px' : '3px',
                                transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            }} />
                        </button>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '13px' }}>{published ? 'Published' : 'Draft'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {published ? 'Students can see and enroll in this event' : 'Only you can see this event'}
                            </div>
                        </div>
                    </div>

                    <button onClick={handleSave} className="btn btn-primary" disabled={saving || !title.trim() || !eventDate}
                        style={{ width: '100%', padding: '14px' }}>
                        {saving ? 'Saving...' : <><FiSave /> {editingId ? 'Update Event' : 'Create Event'}</>}
                    </button>
                </div>
            )}

            {/* ========= EVENT LIST ========= */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading events...</div>
            ) : events.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '60px' }}>
                    <div style={{ fontSize: '56px', marginBottom: '16px' }}>📅</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', marginBottom: '8px' }}>No Events Yet</div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Create your first event to get started!</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                    {events.map(ev => (
                        <div key={ev.id} className="glass-card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', margin: 0 }}>{ev.title}</h3>
                                    <span className={`badge badge-${ev.published ? 'active' : 'upcoming'}`}>
                                        {ev.published ? 'Published' : 'Draft'}
                                    </span>
                                    <span className={`badge badge-${ev.difficulty === 'Hard' ? 'ended' : ev.difficulty === 'Easy' ? 'active' : 'upcoming'}`}>
                                        {ev.difficulty || 'Medium'}
                                    </span>
                                </div>
                                {ev.description && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 8px' }}>{ev.description}</p>}
                                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-muted)' }}>
                                    <span><FiCalendar size={12} style={{ marginRight: '4px' }} />{formatDate(ev.eventDate)}</span>
                                    {ev.eventTime && <span><FiClock size={12} style={{ marginRight: '4px' }} />{ev.eventTime}</span>}
                                    <span><FiClock size={12} style={{ marginRight: '4px' }} />{ev.duration}s</span>
                                    {ev.prize > 0 && <span style={{ color: 'var(--rank-gold)', fontWeight: 700 }}>₹{ev.prize}</span>}
                                    {ev.entryFee > 0 && <span>Entry: ₹{ev.entryFee}</span>}
                                    {ev.scheduledStart && <span><FiZap size={12} style={{ marginRight: '4px' }} />Auto: {new Date(ev.scheduledStart).toLocaleString()}</span>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                                <Link to={`/admin/event-analytics/${ev.id}`} className="btn btn-sm btn-secondary" title="Analytics">
                                    <FiBarChart2 size={14} />
                                </Link>
                                <button onClick={() => togglePublished(ev)} className="btn btn-sm btn-secondary" title={ev.published ? 'Unpublish' : 'Publish'}>
                                    {ev.published ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                                </button>
                                <button onClick={() => handleEdit(ev)} className="btn btn-sm btn-secondary"><FiEdit2 size={14} /></button>
                                {deleteConfirm === ev.id ? (
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button onClick={() => handleDelete(ev.id)} className="btn btn-sm btn-danger">Confirm</button>
                                        <button onClick={() => setDeleteConfirm(null)} className="btn btn-sm btn-secondary">Cancel</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setDeleteConfirm(ev.id)} className="btn btn-sm btn-danger"><FiTrash2 size={14} /></button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
