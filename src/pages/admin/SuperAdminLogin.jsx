import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { FiShield, FiLogIn, FiAlertCircle, FiLock } from 'react-icons/fi';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATIONS = [30, 60, 120, 300]; // seconds for 1st, 2nd, 3rd, 4th+ lockout

function getLockoutState() {
    try {
        const raw = localStorage.getItem('su_lockout');
        if (!raw) return null;
        return JSON.parse(raw);
    } catch { return null; }
}

function setLockoutState(state) {
    localStorage.setItem('su_lockout', JSON.stringify(state));
}

export default function SuperAdminLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [lockoutEnd, setLockoutEnd] = useState(null);
    const [lockoutCount, setLockoutCount] = useState(0);
    const [remaining, setRemaining] = useState(0);

    // Restore lockout state on mount
    useEffect(() => {
        const state = getLockoutState();
        if (state) {
            setAttempts(state.attempts || 0);
            setLockoutCount(state.lockoutCount || 0);
            if (state.lockoutEnd) {
                const end = new Date(state.lockoutEnd);
                if (end > new Date()) {
                    setLockoutEnd(end);
                } else {
                    // Lockout expired, reset attempts but keep lockout count
                    setAttempts(0);
                    setLockoutState({ ...state, attempts: 0, lockoutEnd: null });
                }
            }
        }
    }, []);

    // Countdown timer
    useEffect(() => {
        if (!lockoutEnd) { setRemaining(0); return; }
        const tick = () => {
            const diff = Math.max(0, Math.ceil((lockoutEnd - new Date()) / 1000));
            setRemaining(diff);
            if (diff <= 0) {
                setLockoutEnd(null);
                setAttempts(0);
                const state = getLockoutState();
                setLockoutState({ ...state, attempts: 0, lockoutEnd: null });
            }
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [lockoutEnd]);

    const isLocked = lockoutEnd && remaining > 0;

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`;
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (isLocked || !email.trim() || !password.trim()) return;
        setLoading(true);
        setError('');
        try {
            const q = query(collection(db, 'super_admins'), where('email', '==', email.trim()), where('password', '==', password.trim()));
            const snap = await getDocs(q);
            if (snap.empty) {
                const newAttempts = attempts + 1;
                setAttempts(newAttempts);

                if (newAttempts >= MAX_ATTEMPTS) {
                    // Lockout
                    const newLockoutCount = lockoutCount + 1;
                    const durationIdx = Math.min(newLockoutCount - 1, LOCKOUT_DURATIONS.length - 1);
                    const lockSec = LOCKOUT_DURATIONS[durationIdx];
                    const end = new Date(Date.now() + lockSec * 1000);
                    setLockoutEnd(end);
                    setLockoutCount(newLockoutCount);
                    setLockoutState({ attempts: newAttempts, lockoutEnd: end.toISOString(), lockoutCount: newLockoutCount });
                    setError(`🔒 Too many failed attempts! Locked for ${formatTime(lockSec)}.`);
                } else {
                    setLockoutState({ attempts: newAttempts, lockoutEnd: null, lockoutCount });
                    setError(`Invalid credentials. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts !== 1 ? 's' : ''} remaining.`);
                }
                setLoading(false);
                return;
            }
            // Success — reset lockout state
            localStorage.removeItem('su_lockout');
            const suData = snap.docs[0].data();
            sessionStorage.setItem('su_session', JSON.stringify({
                id: snap.docs[0].id,
                email: suData.email,
                name: suData.name || 'Super Admin',
                loginAt: new Date().toISOString(),
            }));
            navigate('/SU/dashboard');
        } catch (err) {
            setError('Error: ' + err.message);
        }
        setLoading(false);
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center',
            background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 30%, #0d0d1f 100%)',
            padding: '20px',
        }}>
            {/* Animated background orbs */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
                <div style={{
                    position: 'absolute', width: '400px', height: '400px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
                    top: '-100px', right: '-100px', animation: 'float 8s ease-in-out infinite',
                }} />
                <div style={{
                    position: 'absolute', width: '300px', height: '300px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
                    bottom: '-50px', left: '-50px', animation: 'float 10s ease-in-out infinite reverse',
                }} />
            </div>

            <div style={{
                width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1,
                background: 'rgba(15,15,35,0.8)',
                backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(139,92,246,0.2)',
                borderRadius: '24px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(139,92,246,0.08)',
                padding: '40px 36px',
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '20px', margin: '0 auto 16px',
                        background: isLocked ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: isLocked ? '0 8px 24px rgba(239,68,68,0.3)' : '0 8px 24px rgba(124,58,237,0.3)',
                        transition: 'all 0.3s ease',
                    }}>
                        {isLocked ? <FiLock size={28} color="#fff" /> : <FiShield size={28} color="#fff" />}
                    </div>
                    <h1 style={{
                        fontFamily: 'var(--font-display, Inter, sans-serif)', fontWeight: 900, fontSize: '24px',
                        color: '#fff', margin: '0 0 6px',
                    }}>Super Admin</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>
                        Platform-wide management access
                    </p>
                </div>

                {/* Lockout countdown */}
                {isLocked && (
                    <div style={{
                        padding: '20px', borderRadius: '16px', marginBottom: '20px', textAlign: 'center',
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    }}>
                        <FiLock size={24} style={{ color: '#ef4444', marginBottom: '8px' }} />
                        <div style={{ fontWeight: 800, fontSize: '13px', color: '#ef4444', marginBottom: '10px' }}>
                            Account Locked
                        </div>
                        <div style={{
                            fontFamily: 'var(--font-mono, monospace)', fontSize: '32px', fontWeight: 900,
                            color: '#ef4444', letterSpacing: '2px',
                        }}>
                            {formatTime(remaining)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(239,68,68,0.6)', marginTop: '6px' }}>
                            Too many failed attempts. Try again after the countdown.
                        </div>
                        {/* Progress bar */}
                        <div style={{
                            marginTop: '12px', height: '4px', borderRadius: '2px',
                            background: 'rgba(239,68,68,0.15)', overflow: 'hidden',
                        }}>
                            <div style={{
                                height: '100%', borderRadius: '2px',
                                background: 'linear-gradient(90deg, #ef4444, #f59e0b)',
                                width: `${Math.max(0, 100 - (remaining / (LOCKOUT_DURATIONS[Math.min(lockoutCount - 1, LOCKOUT_DURATIONS.length - 1)] || 30)) * 100)}%`,
                                transition: 'width 1s linear',
                            }} />
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && !isLocked && (
                    <div style={{
                        padding: '12px 16px', borderRadius: '12px', marginBottom: '20px',
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                        <FiAlertCircle size={16} /> {error}
                    </div>
                )}

                {/* Attempt indicator */}
                {attempts > 0 && !isLocked && (
                    <div style={{
                        display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '16px',
                    }}>
                        {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
                            <div key={i} style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: i < attempts ? '#ef4444' : 'rgba(255,255,255,0.1)',
                                transition: 'all 0.3s ease',
                                boxShadow: i < attempts ? '0 0 6px rgba(239,68,68,0.4)' : 'none',
                            }} />
                        ))}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Email
                        </label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                            placeholder="superadmin@example.com" required disabled={isLocked}
                            style={{
                                width: '100%', padding: '14px 16px', borderRadius: '12px',
                                background: isLocked ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff', fontSize: '14px', outline: 'none', transition: 'border 0.2s',
                                boxSizing: 'border-box', opacity: isLocked ? 0.5 : 1,
                            }}
                            onFocus={e => e.target.style.borderColor = 'rgba(139,92,246,0.5)'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Password
                        </label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••" required disabled={isLocked}
                            style={{
                                width: '100%', padding: '14px 16px', borderRadius: '12px',
                                background: isLocked ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff', fontSize: '14px', outline: 'none', transition: 'border 0.2s',
                                boxSizing: 'border-box', opacity: isLocked ? 0.5 : 1,
                            }}
                            onFocus={e => e.target.style.borderColor = 'rgba(139,92,246,0.5)'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                    </div>

                    <button type="submit" disabled={loading || isLocked}
                        style={{
                            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                            background: isLocked ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                            color: '#fff', fontSize: '14px', fontWeight: 800,
                            cursor: loading || isLocked ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            boxShadow: isLocked ? 'none' : '0 4px 16px rgba(124,58,237,0.3)',
                            transition: 'all 0.2s ease', opacity: loading || isLocked ? 0.5 : 1,
                        }}
                        onMouseEnter={e => { if (!loading && !isLocked) e.target.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; }}>
                        {isLocked ? <><FiLock size={16} /> Locked</> :
                            loading ? 'Verifying...' : <><FiLogIn size={16} /> Access Dashboard</>}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
                    🔒 Restricted access • {MAX_ATTEMPTS} attempts before lockout
                </p>
            </div>
        </div>
    );
}
