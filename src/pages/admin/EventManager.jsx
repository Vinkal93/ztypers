import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, addDoc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiCalendar, FiDollarSign, FiUsers, FiClock, FiSave, FiX, FiEye, FiEyeOff, FiZap, FiBarChart2, FiPlay, FiPause, FiCheckCircle } from 'react-icons/fi';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const STATUS_OPTIONS = [
    { value: 'upcoming', label: '📅 Upcoming', color: '#2563eb' },
    { value: 'scheduled', label: '⏰ Scheduled', color: '#7c3aed' },
    { value: 'live', label: '🔴 Live', color: '#ef4444' },
    { value: 'ended', label: '✅ Ended', color: '#10b981' },
];

function EventModal({ event, onSave, onClose, saving }) {
    const [title, setTitle] = useState(event?.title || '');
    const [description, setDescription] = useState(event?.description || '');
    const [eventDate, setEventDate] = useState(event?.eventDate || '');
    const [eventTime, setEventTime] = useState(event?.eventTime || '');
    const [duration, setDuration] = useState(event ? (event.duration ? event.duration / 60 : 1) : 1);
    const [prize, setPrize] = useState(event?.prize || '');
    const [difficulty, setDifficulty] = useState(event?.difficulty || 'Medium');
    const [maxParticipants, setMaxParticipants] = useState(event?.maxParticipants || '');
    const [entryFee, setEntryFee] = useState(event?.entryFee || '');
    const [published, setPublished] = useState(event?.published || false);
    const [scheduledStart, setScheduledStart] = useState(event?.scheduledStart || '');
    const [eventStatus, setEventStatus] = useState(event?.status || 'upcoming');

    const handleSubmit = () => {
        if (!title.trim() || !eventDate) return;
        onSave({
            title: title.trim(),
            description: description.trim(),
            eventDate, eventTime,
            duration: (Number(duration) || 1) * 60,
            prize: prize ? Number(prize) : 0,
            difficulty,
            maxParticipants: maxParticipants ? Number(maxParticipants) : 0,
            entryFee: entryFee ? Number(entryFee) : 0,
            published, scheduledStart: scheduledStart || '',
            status: eventStatus,
        }, event?.id);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '20px',
        }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{
                width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto',
                background: 'var(--bg-glass)',
                backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid var(--bg-glass-border)',
                borderRadius: '20px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
                padding: '32px',
                animation: 'fadeIn 0.25s ease',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '20px', margin: 0 }}>
                        {event ? '✏️ Edit Event' : '🆕 Create New Event'}
                    </h2>
                    <button onClick={onClose} style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: 'var(--bg-input)', border: '1px solid var(--bg-glass-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        color: 'var(--text-primary)',
                    }}><FiX size={16} /></button>
                </div>

                {/* Form */}
                <div className="form-row">
                    <div className="form-group" style={{ flex: 2 }}>
                        <label className="input-label">Event Title *</label>
                        <input type="text" className="input" value={title} onChange={e => setTitle(e.target.value)}
                            placeholder="e.g., Speed Typing Championship" />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="input-label">Difficulty</label>
                        <select className="input" value={difficulty} onChange={e => setDifficulty(e.target.value)}
                            style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label className="input-label">Description</label>
                    <textarea className="input" value={description} onChange={e => setDescription(e.target.value)}
                        placeholder="Tell participants what this event is about..." rows={2}
                        style={{ minHeight: '60px', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="input-label"><FiCalendar size={12} style={{ marginRight: '4px' }} />Event Date *</label>
                        <input type="date" className="input" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="input-label"><FiClock size={12} style={{ marginRight: '4px' }} />Event Time</label>
                        <input type="time" className="input" value={eventTime} onChange={e => setEventTime(e.target.value)} />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="input-label"><FiClock size={12} style={{ marginRight: '4px' }} />Duration (min)</label>
                        <input type="number" className="input" value={duration} onChange={e => setDuration(e.target.value)} min={1} step={0.5} />
                    </div>
                    <div className="form-group">
                        <label className="input-label"><FiDollarSign size={12} style={{ marginRight: '4px' }} />Prize (₹)</label>
                        <input type="number" className="input" value={prize} onChange={e => setPrize(e.target.value)} placeholder="0" min={0} />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="input-label"><FiUsers size={12} style={{ marginRight: '4px' }} />Max Participants</label>
                        <input type="number" className="input" value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)} placeholder="0 = unlimited" min={0} />
                    </div>
                    <div className="form-group">
                        <label className="input-label"><FiDollarSign size={12} style={{ marginRight: '4px' }} />Entry Fee (₹)</label>
                        <input type="number" className="input" value={entryFee} onChange={e => setEntryFee(e.target.value)} placeholder="0 = free" min={0} />
                    </div>
                </div>

                {/* Status Selector */}
                <div className="form-group">
                    <label className="input-label">Event Status</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                        {STATUS_OPTIONS.map(s => (
                            <button key={s.value} onClick={() => setEventStatus(s.value)}
                                style={{
                                    padding: '10px 4px', borderRadius: 'var(--radius-md)', border: eventStatus === s.value ? `2px solid ${s.color}` : '1px solid var(--bg-glass-border)',
                                    background: eventStatus === s.value ? `${s.color}15` : 'var(--bg-input)',
                                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s ease', fontSize: '12px', fontWeight: 700,
                                    color: eventStatus === s.value ? s.color : 'var(--text-secondary)',
                                }}>
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label className="input-label"><FiZap size={12} style={{ marginRight: '4px' }} />Scheduled Auto-Start (optional)</label>
                    <input type="datetime-local" className="input" value={scheduledStart} onChange={e => setScheduledStart(e.target.value)} />
                </div>

                {/* Publish toggle */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '14px',
                    background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', marginBottom: '20px',
                }}>
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
                            {published ? 'Students can see and enroll' : 'Only you can see this event'}
                        </div>
                    </div>
                </div>

                <button onClick={handleSubmit} className="btn btn-primary" disabled={saving || !title.trim() || !eventDate}
                    style={{ width: '100%', padding: '14px', fontWeight: 700 }}>
                    {saving ? 'Saving...' : <><FiSave /> {event ? 'Update Event' : 'Create Event'}</>}
                </button>
            </div>
        </div>
    );
}

// ── Status icon helper ──
function StatusIcon({ status }) {
    const map = {
        upcoming: { icon: <FiCalendar size={12} />, bg: 'rgba(37,99,235,0.1)', color: '#2563eb', border: 'rgba(37,99,235,0.3)', label: 'Upcoming' },
        scheduled: { icon: <FiClock size={12} />, bg: 'rgba(124,58,237,0.1)', color: '#7c3aed', border: 'rgba(124,58,237,0.3)', label: 'Scheduled' },
        live: { icon: <FiPlay size={12} />, bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.3)', label: '● Live' },
        ended: { icon: <FiCheckCircle size={12} />, bg: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'rgba(16,185,129,0.3)', label: 'Ended' },
    };
    const s = map[status] || map.upcoming;
    return (
        <span style={{
            padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '11px',
            fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`,
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            animation: status === 'live' ? 'pulse 1.5s infinite' : 'none',
        }}>{s.icon} {s.label}</span>
    );
}

export default function EventManager() {
    const { userData } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');

    const instituteId = userData?.instituteId || '';

    // Combined: migrate legacy events first, then subscribe filtered
    useEffect(() => {
        if (!instituteId) return;
        let unsub = () => { };
        let cancelled = false;

        (async () => {
            try {
                const allSnap = await getDocs(collection(db, 'events'));
                const updates = [];
                allSnap.docs.forEach(d => {
                    if (!d.data().instituteId) {
                        updates.push(updateDoc(doc(db, 'events', d.id), { instituteId }));
                    }
                });
                if (updates.length > 0) await Promise.all(updates);
            } catch (err) { console.error('Event migration:', err); }

            if (cancelled) return;

            const q = query(collection(db, 'events'), where('instituteId', '==', instituteId));
            unsub = onSnapshot(q, (snap) => {
                const evts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                evts.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
                setEvents(evts);
                setLoading(false);
            });
        })();

        return () => { cancelled = true; unsub(); };
    }, [instituteId]);

    const handleSave = async (data, editId) => {
        setSaving(true);
        const payload = { ...data, instituteId, updatedAt: new Date().toISOString() };
        try {
            if (editId) {
                await setDoc(doc(db, 'events', editId), payload, { merge: true });
            } else {
                payload.createdAt = new Date().toISOString();
                await addDoc(collection(db, 'events'), payload);
            }
            setShowModal(false);
            setEditingEvent(null);
        } catch (err) { alert('Error: ' + err.message); }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        try { await deleteDoc(doc(db, 'events', id)); setDeleteConfirm(null); } catch (err) { alert('Error: ' + err.message); }
    };

    const setStatus = async (ev, status) => {
        await setDoc(doc(db, 'events', ev.id), { status, updatedAt: new Date().toISOString() }, { merge: true });
    };

    const togglePublished = async (ev) => {
        await setDoc(doc(db, 'events', ev.id), { published: !ev.published, updatedAt: new Date().toISOString() }, { merge: true });
    };

    const formatDate = (d) => {
        if (!d) return '-';
        return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const filteredEvents = filterStatus === 'all' ? events : events.filter(e => e.status === filterStatus);

    const statusCounts = {
        all: events.length,
        upcoming: events.filter(e => e.status === 'upcoming').length,
        scheduled: events.filter(e => e.status === 'scheduled').length,
        live: events.filter(e => e.status === 'live').length,
        ended: events.filter(e => e.status === 'ended').length,
    };

    return (
        <div className="page-container fade-in">
            {/* Modal */}
            {showModal && (
                <EventModal
                    event={editingEvent}
                    onSave={handleSave}
                    onClose={() => { setShowModal(false); setEditingEvent(null); }}
                    saving={saving}
                />
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 className="page-title">📅 Event Manager</h1>
                    <p className="page-subtitle">Create, manage, and control event lifecycle</p>
                </div>
                <button onClick={() => { setEditingEvent(null); setShowModal(true); }} className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 24px', fontWeight: 700 }}>
                    <FiPlus /> Create Event
                </button>
            </div>

            {/* Status filter tabs */}
            <div style={{
                display: 'flex', gap: '6px', marginBottom: '24px', flexWrap: 'wrap',
                background: 'var(--bg-glass)', padding: '6px', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--bg-glass-border)',
            }}>
                {[{ value: 'all', label: 'All' }, ...STATUS_OPTIONS].map(s => (
                    <button key={s.value} onClick={() => setFilterStatus(s.value)}
                        style={{
                            padding: '8px 16px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                            fontWeight: 700, fontSize: '12px', transition: 'all 0.2s ease',
                            background: filterStatus === s.value ? 'var(--accent-gradient)' : 'transparent',
                            color: filterStatus === s.value ? '#fff' : 'var(--text-secondary)',
                        }}>
                        {s.label} ({statusCounts[s.value] || 0})
                    </button>
                ))}
            </div>

            {/* Event Cards */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading events...</div>
            ) : filteredEvents.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '60px' }}>
                    <div style={{ fontSize: '56px', marginBottom: '16px' }}>📅</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', marginBottom: '8px' }}>No Events</div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Create your first event to get started!</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '14px' }}>
                    {filteredEvents.map(ev => {
                        const st = ev.status || 'upcoming';
                        const statusColor = STATUS_OPTIONS.find(s => s.value === st)?.color || '#64748b';
                        return (
                            <div key={ev.id} className="glass-card" style={{
                                padding: 0, overflow: 'hidden',
                                borderLeft: `3px solid ${statusColor}`,
                                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>

                                {/* Top row */}
                                <div style={{ padding: '18px 22px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: '200px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', margin: 0, color: 'var(--text-primary)' }}>{ev.title}</h3>
                                            <StatusIcon status={st} />
                                        </div>
                                        {ev.description && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: 1.5, maxWidth: '500px' }}>{ev.description}</p>}
                                    </div>

                                    {/* Actions cluster */}
                                    <div style={{ display: 'flex', gap: '5px', flexShrink: 0, alignItems: 'center' }}>
                                        {st !== 'live' && (
                                            <button onClick={() => setStatus(ev, 'live')} className="btn btn-sm" title="Go Live"
                                                style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)', fontSize: '11px', padding: '5px 10px' }}>
                                                <FiPlay size={12} /> Live
                                            </button>
                                        )}
                                        {st === 'live' && (
                                            <button onClick={() => setStatus(ev, 'ended')} className="btn btn-sm" title="End"
                                                style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.15)', fontSize: '11px', padding: '5px 10px' }}>
                                                <FiPause size={12} /> End
                                            </button>
                                        )}
                                        <Link to={`/admin/event-analytics/${ev.id}`} className="btn btn-sm btn-secondary" title="Analytics" style={{ padding: '5px 8px' }}>
                                            <FiBarChart2 size={13} />
                                        </Link>
                                        <button onClick={() => togglePublished(ev)} className="btn btn-sm btn-secondary" title={ev.published ? 'Unpublish' : 'Publish'} style={{ padding: '5px 8px' }}>
                                            {ev.published ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                                        </button>
                                        <button onClick={() => { setEditingEvent(ev); setShowModal(true); }} className="btn btn-sm btn-secondary" style={{ padding: '5px 8px' }}>
                                            <FiEdit2 size={13} />
                                        </button>
                                        {deleteConfirm === ev.id ? (
                                            <div style={{ display: 'flex', gap: '3px' }}>
                                                <button onClick={() => handleDelete(ev.id)} className="btn btn-sm btn-danger" style={{ fontSize: '11px', padding: '5px 8px' }}>Yes</button>
                                                <button onClick={() => setDeleteConfirm(null)} className="btn btn-sm btn-secondary" style={{ fontSize: '11px', padding: '5px 8px' }}>No</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setDeleteConfirm(ev.id)} className="btn btn-sm btn-danger" style={{ padding: '5px 8px' }}><FiTrash2 size={13} /></button>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom info strip */}
                                <div style={{
                                    padding: '10px 22px', borderTop: '1px solid var(--bg-glass-border)',
                                    display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-muted)',
                                    background: 'var(--bg-glass)',
                                }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiCalendar size={12} />{formatDate(ev.eventDate)}</span>
                                    {ev.eventTime && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiClock size={12} />{ev.eventTime}</span>}
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiClock size={12} />{ev.duration >= 60 ? `${Math.round(ev.duration / 60)} min` : `${ev.duration}s`}</span>
                                    {ev.prize > 0 && <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>🏆 ₹{ev.prize}</span>}
                                    {ev.entryFee > 0 && <span>Entry: ₹{ev.entryFee}</span>}
                                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'var(--bg-glass-border)', fontWeight: 600 }}>
                                        {ev.difficulty || 'Medium'}
                                    </span>
                                    {ev.published && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(16,185,129,0.08)', color: '#10b981', fontWeight: 600 }}>Published</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

