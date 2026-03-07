import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSuperAdmin } from '../../context/SuperAdminContext';
import { FiShield, FiMail, FiLock, FiAlertTriangle, FiEye, FiEyeOff } from 'react-icons/fi';

const LOCKOUT_KEY = 'su_lockout';
const MAX_ATTEMPTS = 5;

function getLockout() {
    try {
        const data = JSON.parse(localStorage.getItem(LOCKOUT_KEY) || '{}');
        return { attempts: data.attempts || 0, lockedUntil: data.lockedUntil || 0 };
    } catch { return { attempts: 0, lockedUntil: 0 }; }
}

function setLockoutData(attempts, cooldownMs = 0) {
    localStorage.setItem(LOCKOUT_KEY, JSON.stringify({
        attempts,
        lockedUntil: cooldownMs ? Date.now() + cooldownMs : 0,
    }));
}

// Progressive cooldowns: 30s, 1m, 5m, 15m, 30m
const COOLDOWNS = [30000, 60000, 300000, 900000, 1800000];

export default function SuperAdminLogin() {
    const navigate = useNavigate();
    const { isSuperAdmin, loginSuperAdmin, loading: authLoading } = useSuperAdmin();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [lockCountdown, setLockCountdown] = useState(0);

    // Check lockout timer
    useEffect(() => {
        const tick = () => {
            const { lockedUntil } = getLockout();
            if (lockedUntil > Date.now()) {
                setLockCountdown(Math.ceil((lockedUntil - Date.now()) / 1000));
            } else {
                setLockCountdown(0);
            }
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    // Redirect if already logged in
    useEffect(() => {
        if (!authLoading && isSuperAdmin) {
            navigate('/SU/dashboard', { replace: true });
        }
    }, [isSuperAdmin, authLoading, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        const { attempts, lockedUntil } = getLockout();
        if (lockedUntil > Date.now()) {
            setError('Account locked. Please wait.');
            return;
        }

        if (!email.trim() || !password.trim()) {
            setError('Enter email and password');
            return;
        }

        setLoading(true);
        try {
            await loginSuperAdmin(email.trim(), password);
            // SUCCESS — clear lockout, navigate
            setLockoutData(0);
            navigate('/SU/dashboard', { replace: true });
        } catch (err) {
            const newAttempts = attempts + 1;
            if (err.message?.includes('Invalid login')) {
                setError('Invalid credentials');
            } else if (err.message?.includes('Email not confirmed')) {
                setError('Email not confirmed. Check your inbox.');
            } else {
                setError(err.message || 'Login failed');
            }
            if (newAttempts >= MAX_ATTEMPTS) {
                const cooldown = COOLDOWNS[Math.min(Math.floor(newAttempts / MAX_ATTEMPTS) - 1, COOLDOWNS.length - 1)];
                setLockoutData(newAttempts, cooldown);
            } else {
                setLockoutData(newAttempts);
            }
        }
        setLoading(false);
    };

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(145deg, #0a0a0f 0%, #0d1117 50%, #161b22 100%)',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            padding: '20px',
        }}>
            <div style={{
                width: '100%', maxWidth: '420px',
                background: 'rgba(22,27,34,0.85)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '20px', padding: '40px 32px',
                boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '60px', height: '60px', borderRadius: '16px',
                        background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px', boxShadow: '0 8px 25px rgba(124,58,237,0.3)',
                    }}>
                        <FiShield size={28} color="#fff" />
                    </div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0 }}>
                        Super Admin
                    </h1>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
                        Supabase Secure Auth
                    </p>
                </div>

                {/* Lockout Warning */}
                {lockCountdown > 0 && (
                    <div style={{
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: '12px', padding: '14px 16px', marginBottom: '20px',
                        display: 'flex', alignItems: 'center', gap: '10px',
                    }}>
                        <FiAlertTriangle size={16} color="#ef4444" />
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>
                                Account Locked
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(239,68,68,0.7)' }}>
                                Wait {formatTime(lockCountdown)} before trying again
                            </div>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div style={{
                        background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                        borderRadius: '10px', padding: '12px', marginBottom: '16px',
                        fontSize: '12px', color: '#ef4444', fontWeight: 600,
                    }}>
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>
                            Email
                        </label>
                        <div style={{ position: 'relative' }}>
                            <FiMail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="admin@example.com" autoComplete="email"
                                disabled={lockCountdown > 0}
                                style={{
                                    width: '100%', padding: '12px 14px 12px 42px', borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
                                    color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.5)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <FiLock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                            <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••" autoComplete="current-password"
                                disabled={lockCountdown > 0}
                                style={{
                                    width: '100%', padding: '12px 42px 12px 42px', borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
                                    color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.5)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                            />
                            <button type="button" onClick={() => setShowPw(!showPw)}
                                style={{
                                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)',
                                    padding: '4px',
                                }}>
                                {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" disabled={loading || lockCountdown > 0}
                        style={{
                            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                            background: lockCountdown > 0 ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                            color: '#fff', fontWeight: 700, fontSize: '14px', cursor: lockCountdown > 0 ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            opacity: loading ? 0.7 : 1,
                        }}>
                        {loading ? '🔐 Verifying...' : lockCountdown > 0 ? `Locked (${formatTime(lockCountdown)})` : '🔐 Access Super Admin'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
                    Protected by Supabase Auth
                </div>
            </div>
        </div>
    );
}
