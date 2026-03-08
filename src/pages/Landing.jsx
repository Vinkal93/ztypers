import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiZap, FiAward, FiShield, FiRadio, FiBarChart2, FiUsers, FiType, FiArrowRight, FiUserPlus, FiActivity } from 'react-icons/fi';

// Animated counter hook
function useCounter(target, duration = 1800) {
    const [value, setValue] = useState(0);
    const ref = useRef(null);
    useEffect(() => {
        let start = 0;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= target) { setValue(target); clearInterval(timer); }
            else setValue(Math.floor(start));
        }, 16);
        return () => clearInterval(timer);
    }, [target, duration]);
    return value;
}

function Counter({ value, suffix = '' }) {
    const count = useCounter(typeof value === 'number' ? value : 0);
    if (typeof value !== 'number') return <span>{value}</span>;
    return <span>{count.toLocaleString()}{suffix}</span>;
}

export default function Landing() {
    const { user, isAdmin } = useAuth();
    const adminMode = user && isAdmin && isAdmin();

    return (
        <div style={{ minHeight: '100vh' }}>
            {/* ── Brand strip ── */}
            <div style={{
                background: 'var(--accent-gradient)', padding: '10px 24px', textAlign: 'center',
                fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '0.3px',
            }}>
                🏆 India's Smartest Live Typing Competition &amp; Institute Management Platform
            </div>

            {/* ── Hero ── */}
            <section style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', padding: '80px 24px 60px',
            }}>
                <div className="badge badge-active" style={{ marginBottom: '24px', fontSize: '13px', padding: '8px 16px' }}>
                    ⚡ Real-Time · Anti-Cheat · Transparent Rankings
                </div>
                <h1 style={{
                    fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 7vw, 68px)', fontWeight: 900,
                    lineHeight: 1.1, marginBottom: '24px', maxWidth: '820px',
                }}>
                    <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Type Fast.
                    </span>
                    <br />
                    <span>Compete Live.</span>
                    <br />
                    <span style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Win Big.
                    </span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '17px', maxWidth: '600px', lineHeight: 1.7, marginBottom: '40px' }}>
                    Real-time typing competitions with live rankings, instant analytics, and transparent scoring —
                    India's most trusted institute management platform.
                </p>

                {/* CTA Buttons */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Link to="/practice" className="btn btn-primary btn-lg" style={{ fontSize: '16px' }}>
                        <FiType /> Start Practicing
                    </Link>
                    {!adminMode && (
                        <Link to="/enroll" className="btn btn-lg" style={{
                            fontSize: '16px', background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: '#fff', border: 'none', padding: '14px 28px',
                            borderRadius: 'var(--radius-full)', fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none',
                        }}>
                            <FiUserPlus /> Enroll Now
                        </Link>
                    )}
                    <Link to="/live" className="btn btn-secondary btn-lg" style={{ fontSize: '16px' }}>
                        <FiRadio /> Watch Live
                    </Link>
                    {adminMode && (
                        <Link to="/admin" className="btn btn-lg" style={{
                            fontSize: '16px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                            color: '#fff', border: 'none', padding: '14px 28px',
                            borderRadius: 'var(--radius-full)', fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none',
                        }}>
                            <FiActivity /> Admin Dashboard
                        </Link>
                    )}
                </div>

                {/* Animated Stats */}
                <div style={{ display: 'flex', gap: '20px', marginTop: '60px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {[
                        { value: 10000, label: 'Active Typists', suffix: '+' },
                        { value: 500, label: 'Competitions', suffix: '+' },
                        { value: '₹5L+', label: 'Prizes Given', suffix: '' },
                        { value: '99.9%', label: 'Uptime', suffix: '' },
                    ].map((s, i) => (
                        <div key={i} className="glass-card" style={{ padding: '16px 28px', textAlign: 'center', animation: `fadeIn 0.5s ease ${i * 0.1}s both` }}>
                            <div className="stat-value" style={{ fontSize: '26px', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                {typeof s.value === 'number'
                                    ? <>{s.value >= 1000 ? <Counter value={s.value} /> : <Counter value={s.value} />}{s.suffix}</>
                                    : s.value}
                            </div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Features ── */}
            <section style={{ padding: '60px 24px', background: 'var(--bg-glass)', borderTop: '1px solid var(--bg-glass-border)', borderBottom: '1px solid var(--bg-glass-border)' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800, textAlign: 'center', marginBottom: '40px' }}>
                    Why <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Z Typers</span>?
                </h2>
                <div className="grid-3" style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    {[
                        { icon: <FiZap size={24} />, title: 'Real-Time Engine', desc: 'Live WPM, accuracy tracking, and instant rank updates during competition.' },
                        { icon: <FiShield size={24} />, title: 'Anti-Cheat System', desc: 'Copy-paste detection, keystroke logging, and typing rhythm analysis.' },
                        { icon: <FiAward size={24} />, title: 'Transparent Ranking', desc: 'Score = WPM × Accuracy. Full audit trail for disputes.' },
                        { icon: <FiBarChart2 size={24} />, title: 'Deep Analytics', desc: 'Word-level error tracking and detailed performance breakdown.' },
                        { icon: <FiUsers size={24} />, title: 'Compare Students', desc: 'Side-by-side comparison with speed and accuracy graphs.' },
                        { icon: <FiRadio size={24} />, title: 'Live Viewer', desc: 'Anyone can watch live rankings — no login needed!' },
                    ].map((f, i) => (
                        <div key={i} className="glass-card" style={{ animation: `fadeIn 0.4s ease ${i * 0.08}s both` }}>
                            <div style={{ color: 'var(--accent-primary)', marginBottom: '12px' }}>{f.icon}</div>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>{f.title}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Institute Band ── */}
            <section style={{
                padding: '48px 24px', textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(37,99,235,0.06), rgba(124,58,237,0.06))',
            }}>
                <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                    <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏫</div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 800, marginBottom: '16px' }}>
                        Built for Institutes &amp; Coaching Centres
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '24px' }}>
                        Manage students, batches, competitions, and performance analytics — all in one place.
                        The complete digital solution for typing institutes across India.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        {['📊 Analytics', '👨‍🎓 Student Management', '🏆 Live Competitions', '📋 Session History', '🎯 Achievement System'].map((t, i) => (
                            <span key={i} style={{
                                padding: '8px 16px', borderRadius: 'var(--radius-full)', fontSize: '13px',
                                fontWeight: 600, background: 'var(--bg-card)', border: '1px solid var(--bg-glass-border)',
                            }}>{t}</span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            {!adminMode && (
                <section style={{ padding: '60px 24px', textAlign: 'center' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, marginBottom: '16px' }}>
                        Ready to test your typing speed?
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                        No registration needed! Start practicing right now, or enroll for competitions.
                    </p>
                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/enroll" className="btn btn-lg" style={{ fontSize: '16px', padding: '16px 40px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: 'var(--radius-full)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                            <FiUserPlus /> Enroll Now
                        </Link>
                        <Link to="/practice" className="btn btn-primary btn-lg" style={{ fontSize: '16px', padding: '16px 40px' }}>
                            Start Typing Now <FiArrowRight />
                        </Link>
                    </div>
                </section>
            )}

            {/* ── Footer ── */}
            <footer style={{ textAlign: 'center', padding: '24px', borderTop: '1px solid var(--bg-glass-border)', color: 'var(--text-muted)', fontSize: '13px' }}>
                <div style={{ display: 'none' }}>
                    <h2>Best Typing Competition Platform India</h2>
                    <p>Z Typers by Vinkal Prajapati is the top choice for typing institutes and students to practice and compete. Keywords: Vinkal Prajapati, Typing Speed Test, WPM, India Typing Competition.</p>
                </div>
                <p>© 2026 Z Typers · Built with ❤️ by <Link to="/about" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }} aria-label="Visit About Developer Vinkal Prajapati">Vinkal Prajapati</Link></p>
                <p style={{ marginTop: '4px', fontSize: '11px', fontWeight: 600 }}>
                    🏆 India's Smartest Live Typing Competition & Institute Management Platform
                </p>
                <p style={{ marginTop: '8px', fontSize: '10px', color: 'var(--text-muted)', opacity: 0.6, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px' }}>
                    v2.2.0 · Build 2026.03.07 · Developed by Vinkal Prajapati
                </p>
            </footer>
        </div>
    );
}
