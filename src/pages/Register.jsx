import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiUser, FiUserPlus } from 'react-icons/fi';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        try {
            await register(email, password, name);
            navigate('/admin');
        } catch (err) {
            setError(err.message || 'Registration failed. Try again.');
        }
        setLoading(false);
    };

    return (
        <div style={{
            minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
        }}>
            <div className="glass-card fade-in" style={{ maxWidth: '440px', width: '100%', padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <span style={{ fontSize: '48px', display: 'block' }}>⚡</span>
                    <h1 style={{
                        fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, marginTop: '12px',
                        background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>Admin Registration</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '14px' }}>
                        Create an admin account to manage competitions
                    </p>
                </div>

                {error && (
                    <div style={{
                        padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '20px',
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        color: 'var(--accent-danger)', fontSize: '13px',
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="input-label"><FiUser style={{ marginRight: '6px' }} />Full Name</label>
                        <input type="text" className="input" placeholder="Your name"
                            value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label className="input-label"><FiMail style={{ marginRight: '6px' }} />Email</label>
                        <input type="email" className="input" placeholder="admin@example.com"
                            value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label className="input-label"><FiLock style={{ marginRight: '6px' }} />Password</label>
                        <input type="password" className="input" placeholder="••••••••"
                            value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label className="input-label"><FiLock style={{ marginRight: '6px' }} />Confirm Password</label>
                        <input type="password" className="input" placeholder="••••••••"
                            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}
                        style={{ width: '100%', marginTop: '8px', padding: '14px' }}>
                        {loading ? 'Creating account...' : <><FiUserPlus /> Create Admin Account</>}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    Already have an account?{' '}
                    <Link to="/login" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
                        Login here
                    </Link>
                </p>
            </div>
        </div>
    );
}
