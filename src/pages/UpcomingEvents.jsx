import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FiCalendar, FiClock, FiDollarSign, FiUsers, FiZap, FiAward, FiCheckCircle, FiSearch, FiFilter } from 'react-icons/fi';

function getCountdown(dateStr, timeStr) {
    if (!dateStr) return null;
    const target = new Date(`${dateStr}T${timeStr || '00:00'}`);
    const now = new Date();
    const diff = target - now;
    if (diff <= 0) return { label: 'Started', expired: true, days: 0, hours: 0, mins: 0, secs: 0 };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    let label = '';
    if (days > 0) label = `${days}d ${hours}h ${mins}m ${secs}s`;
    else if (hours > 0) label = `${hours}h ${mins}m ${secs}s`;
    else label = `${mins}m ${secs}s`;
    return { label, expired: false, days, hours, mins, secs };
}

export default function UpcomingEvents() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [enrolling, setEnrolling] = useState(null);
    const [enrolledIds, setEnrolledIds] = useState(new Set());
    const [enrollForm, setEnrollForm] = useState({ name: '', email: '', phone: '' });
    const [enrollTarget, setEnrollTarget] = useState(null);
    const [enrollMsg, setEnrollMsg] = useState('');
    const [filterDifficulty, setFilterDifficulty] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [countdowns, setCountdowns] = useState({});

    // Listen to published events
    useEffect(() => {
        const q = query(collection(db, 'events'), where('published', '==', true));
        const unsub = onSnapshot(q, (snap) => {
            const evts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            evts.sort((a, b) => (a.eventDate || '').localeCompare(b.eventDate || ''));
            setEvents(evts);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // Live countdown timer — update every SECOND
    useEffect(() => {
        const updateCountdowns = () => {
            const cd = {};
            events.forEach(ev => {
                cd[ev.id] = getCountdown(ev.eventDate, ev.eventTime);
            });
            setCountdowns(cd);
        };
        updateCountdowns();
        const interval = setInterval(updateCountdowns, 1000);
        return () => clearInterval(interval);
    }, [events]);

    // Check already enrolled
    useEffect(() => {
        const localEnrolled = localStorage.getItem('ztypers_event_enrollments');
        if (localEnrolled) {
            try { setEnrolledIds(new Set(JSON.parse(localEnrolled))); } catch { }
        }
    }, []);

    const handleEnroll = async (eventId) => {
        if (!enrollForm.name.trim()) return;
        setEnrolling(eventId);
        setEnrollMsg('');
        try {
            await addDoc(collection(db, 'event_enrollments'), {
                eventId,
                name: enrollForm.name.trim(),
                email: enrollForm.email.trim(),
                phone: enrollForm.phone.trim(),
                enrolledAt: new Date().toISOString(),
            });
            const newEnrolled = new Set(enrolledIds);
            newEnrolled.add(eventId);
            setEnrolledIds(newEnrolled);
            localStorage.setItem('ztypers_event_enrollments', JSON.stringify([...newEnrolled]));
            setEnrollMsg('🎉 Enrolled successfully!');
            setEnrollForm({ name: '', email: '', phone: '' });
            setEnrollTarget(null);
            setTimeout(() => setEnrollMsg(''), 3000);
        } catch (err) {
            setEnrollMsg('Error: ' + err.message);
        }
        setEnrolling(null);
    };

    const filteredEvents = events.filter(ev => {
        if (filterDifficulty !== 'All' && ev.difficulty !== filterDifficulty) return false;
        if (searchQuery && !ev.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const getDifficultyColor = (d) => {
        if (d === 'Easy') return { bg: 'rgba(5,150,105,0.1)', color: '#059669', border: 'rgba(5,150,105,0.3)' };
        if (d === 'Hard') return { bg: 'rgba(239,68,68,0.1)', color: '#dc2626', border: 'rgba(239,68,68,0.3)' };
        return { bg: 'rgba(245,158,11,0.1)', color: '#d97706', border: 'rgba(245,158,11,0.3)' };
    };

    // Countdown digit box
    const CountdownBox = ({ value, label }) => (
        <div style={{ textAlign: 'center' }}>
            <div style={{
                background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(6px)',
                borderRadius: '8px', padding: '6px 10px', minWidth: '42px',
                fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 800,
                color: '#fff', border: '1px solid rgba(255,255,255,0.15)',
            }}>{String(value).padStart(2, '0')}</div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
        </div>
    );

    return (
        <div className="page-container fade-in">
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <span style={{ fontSize: '56px' }}>🏆</span>
                <h1 style={{
                    fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 900, marginTop: '12px',
                    background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                    Upcoming Events
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '500px', margin: '8px auto 0' }}>
                    Browse and join upcoming typing competitions. Show your speed and win prizes!
                </p>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <div style={{ position: 'relative', flex: '1', maxWidth: '300px' }}>
                    <FiSearch size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="text" className="input" placeholder="Search events..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: '40px' }} />
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {['All', 'Easy', 'Medium', 'Hard'].map(d => (
                        <button key={d} onClick={() => setFilterDifficulty(d)}
                            className={`btn btn-sm ${filterDifficulty === d ? 'btn-primary' : 'btn-secondary'}`}>
                            {d}
                        </button>
                    ))}
                </div>
            </div>

            {/* Success Message */}
            {enrollMsg && (
                <div style={{
                    padding: '14px 20px', borderRadius: 'var(--radius-md)', marginBottom: '20px', textAlign: 'center',
                    background: enrollMsg.includes('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(5,150,105,0.1)',
                    border: `1px solid ${enrollMsg.includes('Error') ? 'rgba(239,68,68,0.3)' : 'rgba(5,150,105,0.3)'}`,
                    color: enrollMsg.includes('Error') ? 'var(--accent-danger)' : 'var(--accent-success)',
                    fontWeight: 600, fontSize: '14px',
                }}>
                    {enrollMsg}
                </div>
            )}

            {/* Events Grid */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading events...</div>
            ) : filteredEvents.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '60px' }}>
                    <div style={{ fontSize: '56px', marginBottom: '16px' }}>📭</div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '8px' }}>No Events Found</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {searchQuery || filterDifficulty !== 'All' ? 'Try adjusting your filters' : 'Check back soon for upcoming events!'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
                    {filteredEvents.map(ev => {
                        const dc = getDifficultyColor(ev.difficulty);
                        const cd = countdowns[ev.id];
                        const isEnrolled = enrolledIds.has(ev.id);
                        const durationMin = ev.duration >= 60 ? Math.round(ev.duration / 60) : ev.duration;
                        const durationLabel = ev.duration >= 60 ? `${durationMin} min` : `${ev.duration}s`;

                        return (
                            <div key={ev.id} className="glass-card" style={{
                                padding: 0, display: 'flex', flexDirection: 'column',
                                transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden',
                                border: ev.prize > 0 ? '1px solid rgba(251,191,36,0.25)' : undefined,
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>

                                {/* ── HEADER: Event Name + Prize Highlight ── */}
                                <div style={{
                                    background: 'var(--accent-gradient)', padding: '20px 24px', position: 'relative',
                                }}>
                                    <h3 style={{
                                        fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '20px',
                                        color: '#fff', margin: 0, lineHeight: 1.3,
                                        textShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                    }}>
                                        {ev.title}
                                    </h3>
                                    {ev.prize > 0 && (
                                        <div style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px',
                                            padding: '6px 16px', borderRadius: 'var(--radius-full)',
                                            background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)',
                                            color: '#fff', fontWeight: 800, fontSize: '16px',
                                            border: '1px solid rgba(255,255,255,0.25)',
                                            animation: 'pulse 2s infinite',
                                        }}>
                                            <FiAward size={16} /> ₹{ev.prize} Prize
                                        </div>
                                    )}
                                    {/* Difficulty badge */}
                                    <span style={{
                                        position: 'absolute', top: '14px', right: '14px',
                                        padding: '4px 12px', borderRadius: 'var(--radius-full)',
                                        background: 'rgba(255,255,255,0.2)', color: '#fff',
                                        fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px',
                                        border: '1px solid rgba(255,255,255,0.25)',
                                    }}>
                                        {ev.difficulty || 'Medium'}
                                    </span>
                                </div>

                                {/* ── LIVE COUNTDOWN ── */}
                                {cd && !cd.expired && (
                                    <div style={{
                                        background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
                                        padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    }}>
                                        <FiClock size={14} style={{ color: 'rgba(255,255,255,0.7)' }} />
                                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginRight: '4px' }}>
                                            Starts In
                                        </span>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            {cd.days > 0 && <CountdownBox value={cd.days} label="Days" />}
                                            <CountdownBox value={cd.hours} label="Hrs" />
                                            <CountdownBox value={cd.mins} label="Min" />
                                            <CountdownBox value={cd.secs} label="Sec" />
                                        </div>
                                    </div>
                                )}
                                {cd && cd.expired && (
                                    <div style={{
                                        background: 'rgba(16,185,129,0.1)', padding: '10px 20px', textAlign: 'center',
                                        color: 'var(--accent-success)', fontWeight: 800, fontSize: '13px',
                                        borderBottom: '1px solid rgba(16,185,129,0.2)',
                                    }}>
                                        🟢 Event Started!
                                    </div>
                                )}

                                {/* ── BODY ── */}
                                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                                    {/* Description */}
                                    {ev.description && (
                                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                                            {ev.description.length > 120 ? ev.description.slice(0, 120) + '...' : ev.description}
                                        </p>
                                    )}

                                    {/* Info Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        {[
                                            { icon: <FiCalendar size={13} />, label: new Date(ev.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
                                            { icon: <FiClock size={13} />, label: ev.eventTime || 'TBA' },
                                            { icon: <FiZap size={13} />, label: durationLabel },
                                            { icon: <FiDollarSign size={13} />, label: ev.entryFee > 0 ? `₹${ev.entryFee} Entry` : 'Free Entry' },
                                        ].map((info, i) => (
                                            <div key={i} style={{
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)',
                                                fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600,
                                            }}>
                                                {info.icon} {info.label}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Enroll Button / Form */}
                                    <div style={{ marginTop: 'auto' }}>
                                        {isEnrolled ? (
                                            <div style={{
                                                padding: '14px', borderRadius: 'var(--radius-md)', textAlign: 'center',
                                                background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)',
                                                color: 'var(--accent-success)', fontWeight: 700, fontSize: '13px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            }}>
                                                <FiCheckCircle /> Enrolled ✓
                                            </div>
                                        ) : enrollTarget === ev.id ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <input type="text" className="input" placeholder="Your Name *" value={enrollForm.name}
                                                    onChange={e => setEnrollForm(p => ({ ...p, name: e.target.value }))} style={{ fontSize: '13px' }} />
                                                <input type="email" className="input" placeholder="Email (optional)" value={enrollForm.email}
                                                    onChange={e => setEnrollForm(p => ({ ...p, email: e.target.value }))} style={{ fontSize: '13px' }} />
                                                <input type="tel" className="input" placeholder="Phone (optional)" value={enrollForm.phone}
                                                    onChange={e => setEnrollForm(p => ({ ...p, phone: e.target.value }))} style={{ fontSize: '13px' }} />
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button onClick={() => handleEnroll(ev.id)} className="btn btn-primary btn-sm"
                                                        disabled={enrolling === ev.id || !enrollForm.name.trim()} style={{ flex: 1 }}>
                                                        {enrolling === ev.id ? 'Enrolling...' : 'Confirm'}
                                                    </button>
                                                    <button onClick={() => setEnrollTarget(null)} className="btn btn-secondary btn-sm">Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button onClick={() => setEnrollTarget(ev.id)} className="btn btn-primary"
                                                style={{ width: '100%', padding: '13px', background: 'var(--accent-gradient)', fontWeight: 700, fontSize: '14px' }}>
                                                <FiUsers style={{ marginRight: '6px' }} />Enroll Now
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
