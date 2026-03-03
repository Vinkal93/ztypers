import { Link } from 'react-router-dom';
import { FiGithub, FiGlobe, FiMail, FiCode, FiZap, FiArrowLeft, FiExternalLink } from 'react-icons/fi';
import vinkalPhoto from '../assets/Vinkal prajapati.jpg';

export default function About() {
    return (
        <div className="page-container fade-in">
            <Link to="/" className="btn btn-secondary" style={{ marginBottom: '24px' }}>
                <FiArrowLeft /> Back to Home
            </Link>

            {/* Hero Section */}
            <div className="glass-card" style={{ textAlign: 'center', padding: '48px 32px', marginBottom: '32px' }}>
                <img src={vinkalPhoto} alt="Vinkal Prajapati"
                    style={{
                        width: '140px', height: '140px', borderRadius: '50%', objectFit: 'cover',
                        border: '4px solid transparent', backgroundClip: 'padding-box',
                        boxShadow: '0 0 0 4px rgba(0,212,255,0.3), 0 0 30px rgba(124,58,237,0.2), var(--shadow-md)',
                        margin: '0 auto 24px', display: 'block',
                    }} />
                <h1 style={{
                    fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900,
                    background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    marginBottom: '8px',
                }}>Vinkal Prajapati</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '17px', marginBottom: '24px', maxWidth: '600px', margin: '0 auto 24px' }}>
                    The Visionary Developer Behind Modern Digital Innovation
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a href="https://vinkal041.hashnode.dev" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                        <FiGlobe /> Blog
                    </a>
                    <a href="https://github.com/Vinkal93" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                        <FiGithub /> GitHub
                    </a>
                    <a href="mailto:vinkal041@gmail.com" className="btn btn-primary">
                        <FiMail /> Contact
                    </a>
                </div>
            </div>

            {/* About */}
            <div className="grid-2" style={{ marginBottom: '32px' }}>
                <div className="glass-card">
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '22px', marginBottom: '16px' }}>
                        👨‍💻 Who Am I?
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '14px' }}>
                        I'm <strong>Vinkal Prajapati</strong> — a passionate full-stack developer and digital innovator from India.
                        I specialize in building modern, high-performance web and mobile applications that solve real-world problems.
                        My journey in tech started with a curiosity for how things work, and evolved into creating applications
                        that empower users and businesses alike.
                    </p>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '14px', marginTop: '12px' }}>
                        I believe technology should be accessible, beautiful, and powerful. Every project I build reflects this philosophy —
                        from intuitive interfaces to robust backend systems that scale.
                    </p>
                </div>

                <div className="glass-card">
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '22px', marginBottom: '16px' }}>
                        🎯 My Mission
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '14px' }}>
                        To drive digital transformation through innovative software solutions. I aim to create tools that
                        are not just functional, but delightful to use — building bridges between technology and the people who use it.
                    </p>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '14px', marginTop: '12px' }}>
                        <strong>Z Typers</strong> is one of my flagship projects — India's most transparent live typing competition platform.
                        It's designed to make typing competitions fair, exciting, and accessible to students across the country.
                    </p>
                </div>
            </div>
            
                
            {/* Skills */}
            <div className="glass-card" style={{ marginBottom: '32px' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '22px', marginBottom: '20px', textAlign: 'center' }}>
                    🛠️ Tech Stack & Skills
                </h2>
                <div className="grid-3">
                    {[
                        { title: 'Frontend', skills: ['React.js', 'Next.js', 'Vite', 'HTML5/CSS3', 'JavaScript', 'TypeScript', 'Tailwind CSS'], icon: '🎨' },
                        { title: 'Backend & Database', skills: ['Node.js', 'Firebase', 'Firestore', 'MongoDB', 'REST APIs', 'Express.js', 'PostgreSQL'], icon: '⚙️' },
                        { title: 'Mobile & Tools', skills: ['React Native', 'Capacitor', 'Electron', 'Git/GitHub', 'VS Code', 'Figma', 'Vercel'], icon: '📱' },
                    ].map((cat, i) => (
                        <div key={i} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '36px', marginBottom: '12px' }}>{cat.icon}</div>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', marginBottom: '12px' }}>{cat.title}</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
                                {cat.skills.map((s, j) => (
                                    <span key={j} style={{
                                        padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 500,
                                        background: 'var(--accent-gradient-light)', color: 'var(--accent-primary)',
                                        border: '1px solid rgba(37,99,235,0.15)',
                                    }}>{s}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Projects */}
            <div className="glass-card" style={{ marginBottom: '32px' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '22px', marginBottom: '20px', textAlign: 'center' }}>
                    🚀 Notable Projects
                </h2>
                <div className="grid-3">
                    {[
                        { name: 'Z Typers', desc: 'India\'s most transparent live typing competition platform with real-time ranking and anti-cheat.', tech: 'React, Firebase, Vite', emoji: '⚡' },
                        { name: 'InSuite Accounts', desc: 'Professional accounting & inventory management software with Tally-like features.', tech: 'React, SQLite, Electron', emoji: '📊' },
                        { name: 'StudyOne', desc: 'All-in-one student productivity app with AI chat, notes, progress tracking, and more.', tech: 'React, Firebase, Capacitor', emoji: '📚' },
                        { name: 'Finance Friend', desc: 'Personal finance management app with smart budgeting and expense tracking.', tech: 'React, Capacitor, Charts', emoji: '💰' },
                        { name: 'ImageEdit Pro', desc: 'Advanced web-based image editor with AI-powered tools and effects.', tech: 'React, Canvas API, AI', emoji: '🖼️' },
                        { name: 'TypeMaster', desc: 'Desktop typing practice app for Windows with beautiful UI and analytics.', tech: 'Electron, React', emoji: '⌨️' },
                    ].map((p, i) => (
                        <div key={i} className="glass-card" style={{ padding: '20px' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>{p.emoji}</div>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>{p.name}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.6, marginBottom: '8px' }}>{p.desc}</p>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{p.tech}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Values */}
            <div className="glass-card" style={{ marginBottom: '32px' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '22px', marginBottom: '20px', textAlign: 'center' }}>
                    💡 What Drives Me
                </h2>
                <div className="grid-3">
                    {[
                        { icon: '🔥', title: 'Passion', desc: 'Every line of code I write comes from a deep passion for creating solutions that matter.' },
                        { icon: '🎨', title: 'Design', desc: 'I believe beautiful design is not optional — it\'s essential for great user experiences.' },
                        { icon: '🏗️', title: 'Quality', desc: 'I build with production-grade standards — secure, scalable, and maintainable code.' },
                        { icon: '🤝', title: 'Collaboration', desc: 'Technology grows best when shared. I love working with others to build something great.' },
                        { icon: '📈', title: 'Innovation', desc: 'I constantly explore new technologies and approaches to push boundaries.' },
                        { icon: '🌍', title: 'Impact', desc: 'I aim to create tools that positively impact education, business, and daily life.' },
                    ].map((v, i) => (
                        <div key={i} style={{ textAlign: 'center', padding: '12px' }}>
                            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{v.icon}</div>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{v.title}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.5 }}>{v.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Contact CTA */}
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '24px', marginBottom: '12px' }}>
                    Let's Build Something Amazing Together 🚀
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '15px' }}>
                    Got a project idea or want to collaborate? I'd love to hear from you!
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a href="mailto:vinkal041@gmail.com" className="btn btn-primary btn-lg">
                        <FiMail /> Get in Touch
                    </a>
                    <a href="https://vinkal041.hashnode.dev" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-lg">
                        <FiExternalLink /> Read My Blog
                    </a>
                </div>
            </div>
        </div>
    );
}
