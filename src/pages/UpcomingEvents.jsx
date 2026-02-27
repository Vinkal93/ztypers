import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FiCalendar, FiClock, FiDollarSign, FiUsers, FiZap, FiAward, FiCheckCircle, FiSearch, FiFilter } from 'react-icons/fi';

function getCountdown(dateStr, timeStr) {
    if (!dateStr) return null;
    const target = new Date(`${dateStr}T${timeStr || '00:00'}`);
    const now = new Date();
    const diff = target - now;
    if (diff <= 0) return { label: 'Started', expired: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return { label: `${days}d ${hours}h ${mins}m`, expired: false };
    if (hours > 0) return { label: `${hours}h ${mins}m`, expired: false };
    return { label: `${mins}m`, expired: false };
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

    // Live countdown timer - update every minute
    useEffect(() => {
        const updateCountdowns = () => {
            const cd = {};
            events.forEach(ev => {
                cd[ev.id] = getCountdown(ev.eventDate, ev.eventTime);
            });
            setCountdowns(cd);
        };
        updateCountdowns();
        const interval = setInterval(updateCountdowns, 30000); // update every 30s
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                    {filteredEvents.map(ev => {
                        const dc = getDifficultyColor(ev.difficulty);
                        const cd = countdowns[ev.id];
                        const isEnrolled = enrolledIds.has(ev.id);

                        return (
                            <div key={ev.id} className="glass-card" style={{
                                padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px',
                                transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>

                                {/* Countdown Badge */}
                                {cd && !cd.expired && (
                                    <div style={{
                                        position: 'absolute', top: '16px', right: '16px',
                                        padding: '6px 12px', borderRadius: 'var(--radius-full)',
                                        background: 'var(--accent-gradient)', color: '#fff',
                                        fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px',
                                        display: 'flex', alignItems: 'center', gap: '4px',
                                    }}>
                                        <FiClock size={11} /> {cd.label}
                                    </div>
                                )}

                                {/* Title & Difficulty */}
                                <div>
                                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '18px', margin: '0 0 8px', paddingRight: cd && !cd.expired ? '100px' : '0' }}>
                                        {ev.title}
                                    </h3>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{
                                            padding: '4px 12px', borderRadius: 'var(--radius-full)',
                                            background: dc.bg, color: dc.color, border: `1px solid ${dc.border}`,
                                            fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                                        }}>
                                            {ev.difficulty || 'Medium'}
                                        </span>
                                        {ev.prize > 0 && (
                                            <span style={{
                                                padding: '4px 12px', borderRadius: 'var(--radius-full)',
                                                background: 'rgba(251,191,36,0.1)', color: 'var(--rank-gold)', border: '1px solid rgba(251,191,36,0.3)',
                                                fontSize: '11px', fontWeight: 700,
                                            }}>
                                                <FiAward size={10} style={{ marginRight: '4px' }} />₹{ev.prize}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Description */}
                                {ev.description && (
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                                        {ev.description.length > 120 ? ev.description.slice(0, 120) + '...' : ev.description}
                                    </p>
                                )}

                                {/* Info Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    {[
                                        { icon: <FiCalendar size={13} />, label: new Date(ev.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) },
                                        { icon: <FiClock size={13} />, label: ev.eventTime || 'TBA' },
                                        { icon: <FiZap size={13} />, label: `${ev.duration}s` },
                                        { icon: <FiDollarSign size={13} />, label: ev.entryFee > 0 ? `₹${ev.entryFee}` : 'Free' },
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
                                        style={{ width: '100%', padding: '12px', background: 'var(--accent-gradient)', fontWeight: 700, fontSize: '13px' }}>
                                        <FiUsers style={{ marginRight: '6px' }} />Enroll Now
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
