import { Link } from 'react-router-dom';
import { FiZap, FiAward, FiShield, FiRadio, FiBarChart2, FiUsers, FiType, FiArrowRight, FiUserPlus } from 'react-icons/fi';

export default function Landing() {
    return (
        <div style={{ minHeight: '100vh' }}>
            {/* Hero */}
            <section style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', padding: '80px 24px 60px',
            }}>
                <div className="badge badge-active" style={{ marginBottom: '24px', fontSize: '13px', padding: '8px 16px' }}>
                    🏆 India's Most Transparent Live Typing Competition
                </div>
                <h1 style={{
                    fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 7vw, 64px)', fontWeight: 900,
                    lineHeight: 1.1, marginBottom: '24px', maxWidth: '800px',
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
                    Real-time typing competitions with live rankings, instant analytics, and transparent scoring.
                    No login needed — just watch or practice!
                </p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Link to="/practice" className="btn btn-primary btn-lg" style={{ fontSize: '16px' }}>
                        <FiType /> Start Practicing
                    </Link>
                    <Link to="/enroll" className="btn btn-lg" style={{ fontSize: '16px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: 'var(--radius-full)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                        <FiUserPlus /> Enroll Now
                    </Link>
                    <Link to="/live" className="btn btn-secondary btn-lg" style={{ fontSize: '16px' }}>
                        <FiRadio /> Watch Live
                    </Link>
                </div>

                {/* Quick Stats */}
                <div style={{
                    display: 'flex', gap: '32px', marginTop: '60px', flexWrap: 'wrap', justifyContent: 'center',
                }}>
                    {[
                        { value: '10K+', label: 'Active Typists' },
                        { value: '500+', label: 'Competitions' },
                        { value: '₹5L+', label: 'Prizes Given' },
                        { value: '99.9%', label: 'Uptime' },
                    ].map((s, i) => (
                        <div key={i} className="glass-card" style={{ padding: '16px 24px', textAlign: 'center' }}>
                            <div className="stat-value" style={{ fontSize: '24px', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.value}</div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section style={{ padding: '60px 24px' }}>
                <h2 style={{
                    fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800,
                    textAlign: 'center', marginBottom: '40px',
                }}>
                    Why <span style={{ color: 'var(--accent-primary)' }}>Z Typers</span>?
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
                        <div key={i} className="glass-card" style={{ animation: `fadeIn 0.4s ease ${i * 0.08}s forwards`, opacity: 0 }}>
                            <div style={{ color: 'var(--accent-primary)', marginBottom: '12px' }}>{f.icon}</div>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>{f.title}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
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

            {/* Footer */}
            <footer style={{
                textAlign: 'center', padding: '24px', borderTop: '1px solid var(--bg-glass-border)',
                color: 'var(--text-muted)', fontSize: '13px',
            }}>
                <p>© 2026 Z Typers · Built with ❤️ by <Link to="/about" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>Vinkal Prajapati</Link></p>
                <p style={{ marginTop: '4px', fontSize: '11px' }}>India's Most Transparent Live Typing Competition Platform</p>
            </footer>
        </div>
    );
}
