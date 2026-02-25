import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { FiZap, FiClock, FiAward, FiTrendingUp, FiDollarSign, FiUsers } from 'react-icons/fi';

export default function Home() {
    const { user, userData } = useAuth();
    const [competitions, setCompetitions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'competitions'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const comps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCompetitions(comps);
            setLoading(false);
        }, () => setLoading(false));
        return () => unsubscribe();
    }, []);

    const activeComps = competitions.filter(c => c.status === 'active');
    const upcomingComps = competitions.filter(c => c.status === 'upcoming');
    const endedComps = competitions.filter(c => c.status === 'ended');

    return (
        <div className="page-container fade-in">
            {/* Welcome */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800 }}>
                    Welcome back, <span style={{ color: 'var(--accent-primary)' }}>{user?.displayName || 'Typist'}</span> 👋
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Ready to type and compete?</p>
            </div>

            {/* Stats Overview */}
            <div className="grid-4" style={{ marginBottom: '40px' }}>
                {[
                    { icon: <FiZap />, value: userData?.bestWPM || 0, label: 'Best WPM', color: '#00d4ff' },
                    { icon: <FiAward />, value: userData?.rank || '-', label: 'Global Rank', color: '#fbbf24' },
                    { icon: <FiTrendingUp />, value: userData?.totalCompetitions || 0, label: 'Competitions', color: '#10b981' },
                    { icon: <FiUsers />, value: competitions.length, label: 'Total Events', color: '#7c3aed' },
                ].map((stat, i) => (
                    <div key={i} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '50px', height: '50px', borderRadius: 'var(--radius-md)',
                            background: `${stat.color}15`, color: stat.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
                        }}>
                            {stat.icon}
                        </div>
                        <div>
                            <div className="stat-value" style={{ fontSize: '28px' }}>{stat.value}</div>
                            <div className="stat-label">{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Active Competitions */}
            {activeComps.length > 0 && (
                <section style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700 }}>
                            🟢 Live Competitions
                        </h2>
                        <span className="badge badge-active">{activeComps.length} Active</span>
                    </div>
                    <div className="grid-2">
                        {activeComps.map(comp => (
                            <CompetitionCard key={comp.id} comp={comp} />
                        ))}
                    </div>
                </section>
            )}

            {/* Upcoming */}
            <section style={{ marginBottom: '40px' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>
                    📅 Upcoming Competitions
                </h2>
                {upcomingComps.length === 0 ? (
                    <div className="glass-card empty-state">
                        <div className="empty-state-icon">🏆</div>
                        <div className="empty-state-title">No upcoming competitions</div>
                        <div className="empty-state-text">Check back soon or ask your admin to create one!</div>
                    </div>
                ) : (
                    <div className="grid-2">
                        {upcomingComps.map(comp => (
                            <CompetitionCard key={comp.id} comp={comp} />
                        ))}
                    </div>
                )}
            </section>

            {/* Past */}
            {endedComps.length > 0 && (
                <section>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>
                        🏁 Past Competitions
                    </h2>
                    <div className="grid-2">
                        {endedComps.slice(0, 4).map(comp => (
                            <CompetitionCard key={comp.id} comp={comp} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function CompetitionCard({ comp }) {
    const statusColors = {
        active: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', text: '#10b981' },
        upcoming: { bg: 'rgba(0,212,255,0.1)', border: 'rgba(0,212,255,0.3)', text: '#00d4ff' },
        ended: { bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.3)', text: '#6b7280' },
    };
    const sc = statusColors[comp.status] || statusColors.upcoming;

    return (
        <div className="glass-card comp-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                    <div className="comp-title">{comp.title || 'Typing Competition'}</div>
                    <div className="comp-meta">
                        <span><FiClock size={14} /> {comp.duration || 60} sec</span>
                        {comp.prize && <span><FiDollarSign size={14} /> ₹{comp.prize}</span>}
                        {comp.entryFee && <span>Entry: ₹{comp.entryFee}</span>}
                    </div>
                </div>
                <span className={`badge badge-${comp.status || 'upcoming'}`}>
                    {comp.status || 'upcoming'}
                </span>
            </div>

            {comp.status === 'active' ? (
                <Link to={`/compete/${comp.id}`} className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                    <FiZap /> Join Now
                </Link>
            ) : comp.status === 'ended' ? (
                <Link to={`/results/${comp.id}`} className="btn btn-secondary" style={{ width: '100%', marginTop: '12px' }}>
                    <FiAward /> View Results
                </Link>
            ) : (
                <button className="btn btn-secondary" disabled style={{ width: '100%', marginTop: '12px', opacity: 0.5 }}>
                    Starting Soon...
                </button>
            )}
        </div>
    );
}
