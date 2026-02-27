import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, setDoc, onSnapshot, collection, getDoc, addDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { calculateWPM, calculateAccuracy, calculateFinalScore, formatTime } from '../lib/ranking';
import { blockCopyPaste } from '../lib/antiCheat';
import { FiZap, FiTarget, FiClock, FiHash, FiDelete, FiAward, FiLogIn, FiRadio, FiLogOut } from 'react-icons/fi';
import AccountDisabled from './AccountDisabled';
import { checkNewBadges, getBadge } from '../lib/achievements';

const SESSION_DURATION = 60 * 60 * 1000; // 1 hour in ms
const SESSION_KEY = 'ztypers_student_session';

// ---------- Utility: get user's approximate location ----------
async function getLocation() {
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        return `${data.city || '?'}, ${data.region || '?'}, ${data.country_name || '?'} (${data.ip || '?'})`;
    } catch {
        return 'Unknown Location';
    }
}

export default function Playground() {
    const typingRef = useRef(null);

    // Student login
    const [studentId, setStudentId] = useState('');
    const [password, setPassword] = useState('');
    const [student, setStudent] = useState(null);
    const [loginError, setLoginError] = useState('');
    const [loggingIn, setLoggingIn] = useState(false);
    const [loginTime, setLoginTime] = useState(null);
    const [sessionTimeLeft, setSessionTimeLeft] = useState(SESSION_DURATION);
    const [disabledStudent, setDisabledStudent] = useState(null); // {name, disableNote}
    const [newBadges, setNewBadges] = useState([]); // newly earned badges to show

    // Admin settings (from Firestore)
    const [settings, setSettings] = useState(null);

    // Typing state
    const [charIndex, setCharIndex] = useState(0);
    const [charStates, setCharStates] = useState([]);
    const [startTime, setStartTime] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [countdown, setCountdown] = useState(null);
    const [typingActive, setTypingActive] = useState(false);
    const [finished, setFinished] = useState(false);

    // Stats
    const [wpm, setWpm] = useState(0);
    const [accuracy, setAccuracy] = useState(100);
    const [correctChars, setCorrectChars] = useState(0);
    const [totalTyped, setTotalTyped] = useState(0);
    const [correctWords, setCorrectWords] = useState(0);
    const [mistakes, setMistakes] = useState(0);
    const [backspaceCount, setBackspaceCount] = useState(0);
    const [score, setScore] = useState(0);

    // Live rankings
    const [participants, setParticipants] = useState([]);

    // ---------- Restore session from localStorage on mount ----------
    useEffect(() => {
        const saved = localStorage.getItem(SESSION_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const elapsed = Date.now() - parsed.loginTime;
                if (elapsed < SESSION_DURATION) {
                    // Session still valid — restore it
                    setStudent(parsed.student);
                    setLoginTime(parsed.loginTime);
                    setSessionTimeLeft(SESSION_DURATION - elapsed);
                } else {
                    // Expired — clear
                    localStorage.removeItem(SESSION_KEY);
                }
            } catch {
                localStorage.removeItem(SESSION_KEY);
            }
        }
    }, []);

    // ---------- SESSION TIMER (1 Hour) ----------
    useEffect(() => {
        if (!loginTime || !student) return;
        const interval = setInterval(() => {
            const elapsed = Date.now() - loginTime;
            const remaining = Math.max(0, SESSION_DURATION - elapsed);
            setSessionTimeLeft(remaining);
            if (remaining <= 0) {
                // Auto logout
                handleLogout();
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [loginTime, student]);

    const formatSessionTime = (ms) => {
        const totalSec = Math.floor(ms / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Detect browser & device from userAgent
    const getDeviceInfo = () => {
        const ua = navigator.userAgent || '';
        const isMobile = /android|iphone|ipad|ipod|blackberry|windows phone/i.test(ua);
        let browser = 'Other';
        if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
        else if (/Firefox/i.test(ua)) browser = 'Firefox';
        else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
        else if (/Edg/i.test(ua)) browser = 'Edge';
        let os = 'Other';
        if (/Windows/i.test(ua)) os = 'Windows';
        else if (/Mac/i.test(ua)) os = 'Mac';
        else if (/Android/i.test(ua)) os = 'Android';
        else if (/iPhone|iPad/i.test(ua)) os = 'iOS';
        else if (/Linux/i.test(ua)) os = 'Linux';
        return { userAgent: ua, device: isMobile ? 'Mobile' : 'Desktop', browser, os, platform: navigator.platform || '' };
    };

    // Login
    const handleLogin = async () => {
        setLoginError('');
        setLoggingIn(true);
        try {
            const studentDoc = await getDoc(doc(db, 'students', studentId.toUpperCase()));
            if (!studentDoc.exists()) {
                setLoginError('Student ID not found. Ask your admin for correct credentials.');
            } else if (studentDoc.data().password !== password) {
                setLoginError('Incorrect password.');
            } else {
                const studentData = { id: studentDoc.id, ...studentDoc.data() };

                // ── Status check: disabled / suspended ──
                const status = studentData.status || 'active';
                if (status === 'disabled' || status === 'suspended') {
                    setDisabledStudent(studentData);
                    setLoggingIn(false);
                    return;
                }

                // ── Auto re-enable check ──
                if (studentData.disableUntil && new Date(studentData.disableUntil) <= new Date()) {
                    await updateDoc(doc(db, 'students', studentData.id), { status: 'active', disableNote: '', disabledAt: null, disableUntil: null });
                }

                const now = Date.now();
                setStudent(studentData);
                setLoginTime(now);
                setSessionTimeLeft(SESSION_DURATION);

                // Persist session to localStorage
                localStorage.setItem(SESSION_KEY, JSON.stringify({ student: studentData, loginTime: now }));

                // Log session to Firestore with device info
                try {
                    const location = await getLocation();
                    const devInfo = getDeviceInfo();
                    await addDoc(collection(db, 'session_logs'), {
                        studentId: studentData.id,
                        studentName: studentData.name,
                        loginAt: new Date().toISOString(),
                        location,
                        ...devInfo,
                        sessionDurationMs: SESSION_DURATION,
                    });
                } catch (logErr) {
                    console.warn('Session log failed:', logErr);
                }
            }
        } catch (err) {
            setLoginError('Error: ' + (err.message || 'Something went wrong'));
        }
        setLoggingIn(false);
    };

    // Logout
    const handleLogout = () => {
        setStudent(null);
        setLoginTime(null);
        setSessionTimeLeft(SESSION_DURATION);
        setStudentId('');
        setPassword('');
        localStorage.removeItem(SESSION_KEY);
        resetTypingState(settings);
    };

    // Listen to admin playground settings
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'playground'), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setSettings(data);

                // Reset typing on new competition setup
                if (data.status === 'waiting') {
                    resetTypingState(data);
                }
            }
        });
        return () => unsub();
    }, []);

    // Handle admin status changes (countdown, active, ended)
    useEffect(() => {
        if (!settings || !student) return;

        if (settings.status === 'countdown') {
            // Start countdown timer
            setFinished(false);
            setTypingActive(false);
            resetTypingState(settings);
            let counter = settings.countdownSeconds || 10;
            setCountdown(counter);
            const interval = setInterval(() => {
                counter -= 1;
                setCountdown(counter);
                if (counter <= 0) {
                    clearInterval(interval);
                    setCountdown(null);
                }
            }, 1000);
            return () => clearInterval(interval);
        }

        if (settings.status === 'active') {
            // Admin started — begin typing!
            setCountdown(null);
            setTypingActive(true);
            setStartTime(Date.now());
            setTimeLeft(settings.duration || 60);
            setTimeout(() => typingRef.current?.focus(), 100);
        }

        if (settings.status === 'ended') {
            setTypingActive(false);
            setFinished(true);
        }
    }, [settings?.status, student]);

    // Timer
    useEffect(() => {
        if (!typingActive || !startTime) return;
        const dur = settings?.duration || 60;
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const remaining = Math.max(0, dur - elapsed);
            setTimeLeft(remaining);
            if (remaining <= 0) {
                setTypingActive(false);
                setFinished(true);
                clearInterval(interval);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [typingActive, startTime, settings?.duration]);

    // Live stats update — push to Firebase every second
    useEffect(() => {
        if (!typingActive || !startTime || !student) return;
        const interval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            const liveWpm = calculateWPM(correctWords, elapsed);
            const liveAcc = calculateAccuracy(correctChars, totalTyped);
            const liveScore = calculateFinalScore(liveWpm, liveAcc);
            setWpm(liveWpm);
            setAccuracy(liveAcc);
            setScore(liveScore);

            // Push to Firestore for live sync across all devices
            setDoc(doc(db, 'playground_participants', student.id), {
                name: student.name,
                studentId: student.id,
                wpm: liveWpm,
                accuracy: liveAcc,
                score: liveScore,
                mistakes,
                backspaceCount,
                totalTyped,
                correctChars,
                progress: settings?.paragraph ? Math.round((charIndex / settings.paragraph.length) * 100) : 0,
                updatedAt: new Date().toISOString(),
                finished: false,
            }, { merge: true });
        }, 1000);
        return () => clearInterval(interval);
    }, [typingActive, startTime, correctWords, correctChars, totalTyped, mistakes, backspaceCount, charIndex, student]);

    // Final stats on finish
    useEffect(() => {
        if (!finished || !student || !startTime) return;
        const elapsed = (Date.now() - startTime) / 1000;
        const finalWpm = calculateWPM(correctWords, elapsed);
        const finalAcc = calculateAccuracy(correctChars, totalTyped);
        const finalScore = calculateFinalScore(finalWpm, finalAcc);
        setWpm(finalWpm);
        setAccuracy(finalAcc);
        setScore(finalScore);

        setDoc(doc(db, 'playground_participants', student.id), {
            name: student.name,
            studentId: student.id,
            wpm: finalWpm,
            accuracy: finalAcc,
            score: finalScore,
            mistakes,
            backspaceCount,
            totalTyped,
            correctChars,
            progress: 100,
            finished: true,
            finishedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }, { merge: true });
    }, [finished]);

    // Listen to all participants (live rankings)
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'playground_participants'), (snap) => {
            const parts = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .map((p, i) => ({ ...p, rank: i + 1 }));
            setParticipants(parts);
        });
        return () => unsub();
    }, []);

    // Auto-stop when all participants have finished
    useEffect(() => {
        if (!typingActive || participants.length === 0) return;
        const allFinished = participants.every(p => p.finished === true);
        if (allFinished && participants.length > 0) {
            setTypingActive(false);
            setFinished(true);
        }
    }, [participants, typingActive]);

    // Anti-cheat
    useEffect(() => {
        if (!typingRef.current) return;
        return blockCopyPaste(typingRef.current);
    }, [typingActive]);

    const resetTypingState = (s) => {
        const p = s?.paragraph || '';
        setCharIndex(0);
        setCharStates(p.split('').map(() => 'pending'));
        setStartTime(null);
        setTimeLeft(s?.duration || 60);
        setWpm(0); setAccuracy(100); setCorrectChars(0); setTotalTyped(0);
        setCorrectWords(0); setMistakes(0); setBackspaceCount(0); setScore(0);
        setFinished(false);
        setTypingActive(false);
    };

    const handleKeyDown = useCallback((e) => {
        if (!typingActive || !settings?.paragraph) return;
        const para = settings.paragraph;

        if (e.key === 'Tab') { e.preventDefault(); return; }

        if (e.key === 'Backspace') {
            e.preventDefault();
            if (settings.backspaceEnabled === false) return;
            setBackspaceCount(prev => prev + 1);
            if (charIndex > 0) {
                setCharIndex(prev => prev - 1);
                setCharStates(prev => { const n = [...prev]; n[charIndex - 1] = 'pending'; return n; });
            }
            return;
        }

        if (e.key.length !== 1) return;
        e.preventDefault();
        if (charIndex >= para.length) return;

        const expected = para[charIndex];
        const isCorrect = e.key === expected;

        setCharStates(prev => { const n = [...prev]; n[charIndex] = isCorrect ? 'correct' : 'incorrect'; return n; });
        setTotalTyped(prev => prev + 1);
        if (isCorrect) setCorrectChars(prev => prev + 1);
        else setMistakes(prev => prev + 1);

        if (expected === ' ' || charIndex === para.length - 1) {
            const wordStart = para.lastIndexOf(' ', charIndex - 1) + 1;
            const wordStates = charStates.slice(wordStart, charIndex);
            if (wordStates.every(s => s === 'correct') && isCorrect) {
                setCorrectWords(prev => prev + 1);
            }
        }

        setCharIndex(prev => prev + 1);
        if (charIndex + 1 >= para.length) {
            setTypingActive(false);
            setFinished(true);
        }
    }, [typingActive, charIndex, settings, charStates]);

    // ---------- DISABLED STUDENT SCREEN ----------
    if (disabledStudent) {
        return (
            <AccountDisabled
                note={disabledStudent.disableNote}
                onBack={() => setDisabledStudent(null)}
            />
        );
    }

    // ---------- LOGIN SCREEN ----------
    if (!student) {
        return (
            <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div className="glass-card fade-in" style={{ maxWidth: '420px', width: '100%', padding: '40px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <span style={{ fontSize: '48px' }}>🎮</span>
                        <h1 style={{
                            fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, marginTop: '12px',
                            background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                        }}>
                            Playground Login
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '14px' }}>
                            Enter your Student ID and Password to join
                        </p>
                    </div>

                    {loginError && (
                        <div style={{
                            padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px',
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                            color: 'var(--accent-danger)', fontSize: '13px'
                        }}>
                            ⚠️ {loginError}
                        </div>
                    )}

                    <div className="form-group">
                        <label className="input-label">Student ID</label>
                        <input type="text" className="input" placeholder="e.g., ZT1234"
                            value={studentId} onChange={e => setStudentId(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                    </div>
                    <div className="form-group">
                        <label className="input-label">Password</label>
                        <input type="password" className="input" placeholder="••••••••"
                            value={password} onChange={e => setPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                    </div>
                    <button onClick={handleLogin} className="btn btn-primary" disabled={loggingIn || !studentId || !password}
                        style={{ width: '100%', padding: '14px' }}>
                        {loggingIn ? 'Logging in...' : <><FiLogIn /> Join Playground</>}
                    </button>
                </div>
            </div>
        );
    }

    // ---------- MAIN PLAYGROUND ----------
    const timerClass = timeLeft <= 10 ? 'danger' : timeLeft <= 30 ? 'warning' : '';
    const para = settings?.paragraph || '';
    const myRank = participants.find(p => p.id === student.id)?.rank || '-';
    const sessionWarning = sessionTimeLeft < 5 * 60 * 1000; // 5 min warning

    return (
        <div className="page-container fade-in">
            {/* Welcome & Status Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800 }}>
                        Welcome, {student.name}! 👋
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>ID: {student.id} • Rank: #{myRank}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Session Countdown */}
                    <div style={{
                        padding: '8px 16px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '13px',
                        background: sessionWarning ? 'rgba(239,68,68,0.1)' : 'rgba(0,212,255,0.1)',
                        color: sessionWarning ? 'var(--accent-danger)' : 'var(--accent-primary)',
                        border: `1px solid ${sessionWarning ? 'rgba(239,68,68,0.3)' : 'rgba(0,212,255,0.3)'}`,
                        display: 'flex', alignItems: 'center', gap: '6px',
                        animation: sessionWarning ? 'pulse 1s infinite' : 'none',
                    }}>
                        <FiClock size={14} />
                        Session: {formatSessionTime(sessionTimeLeft)}
                    </div>
                    <span style={{
                        padding: '6px 14px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '12px',
                        background: typingActive ? 'rgba(5,150,105,0.1)' : countdown ? 'rgba(245,158,11,0.1)' : 'rgba(107,114,128,0.1)',
                        color: typingActive ? 'var(--accent-success)' : countdown ? 'var(--accent-warning)' : 'var(--text-muted)',
                        border: `1px solid ${typingActive ? 'rgba(5,150,105,0.3)' : countdown ? 'rgba(245,158,11,0.3)' : 'rgba(107,114,128,0.3)'}`,
                    }}>
                        {typingActive ? '🟢 LIVE' : countdown ? '🟡 GET READY' : finished ? '🏁 FINISHED' : '⏳ WAITING FOR ADMIN'}
                    </span>
                    <button onClick={handleLogout} className="btn btn-sm btn-danger" title="Logout"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FiLogOut size={14} /> Logout
                    </button>
                </div>
            </div>

            {/* Countdown Overlay */}
            {countdown && countdown > 0 && (
                <div style={{
                    textAlign: 'center', padding: '60px', marginBottom: '24px',
                    background: 'var(--accent-gradient-light)', borderRadius: 'var(--radius-xl)',
                    border: '2px solid rgba(37,99,235,0.2)',
                }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        Competition starts in
                    </div>
                    <div style={{
                        fontFamily: 'var(--font-display)', fontSize: '96px', fontWeight: 900,
                        background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        animation: 'countUp 0.3s ease',
                    }}>
                        {countdown}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '16px' }}>
                        Get ready to type! 🔥
                    </div>
                </div>
            )}

            {/* Waiting Screen */}
            {!typingActive && !countdown && !finished && settings?.status !== 'active' && (
                <div className="glass-card" style={{ textAlign: 'center', padding: '60px' }}>
                    <div style={{ fontSize: '56px', marginBottom: '16px' }}>⏳</div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '8px' }}>
                        Waiting for Admin to Start...
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        The competition will begin when your admin clicks Start. Stay on this page!
                    </p>
                    <div className="live-pulse" style={{ width: '12px', height: '12px', margin: '16px auto 0' }} />
                </div>
            )}

            {/* Timer & Stats */}
            {(typingActive || finished) && (
                <>
                    <div className={`timer ${timerClass}`} style={{ marginBottom: '16px', fontSize: '42px' }}>
                        {finished ? '00:00' : formatTime(timeLeft)}
                    </div>

                    <div className="live-stats" style={{ marginBottom: '16px', justifyContent: 'center' }}>
                        <div className="live-stat-item">
                            <div className="live-stat-value" style={{ color: 'var(--accent-primary)' }}>{wpm}</div>
                            <div className="live-stat-label"><FiZap size={10} /> WPM</div>
                        </div>
                        <div className="live-stat-item">
                            <div className="live-stat-value" style={{ color: accuracy >= 90 ? 'var(--accent-success)' : 'var(--accent-warning)' }}>{accuracy}%</div>
                            <div className="live-stat-label"><FiTarget size={10} /> Accuracy</div>
                        </div>
                        <div className="live-stat-item">
                            <div className="live-stat-value" style={{ color: 'var(--rank-gold)' }}>{score}</div>
                            <div className="live-stat-label"><FiAward size={10} /> Score</div>
                        </div>
                        <div className="live-stat-item">
                            <div className="live-stat-value" style={{ color: 'var(--accent-danger)' }}>{mistakes}</div>
                            <div className="live-stat-label"><FiHash size={10} /> Errors</div>
                        </div>
                        <div className="live-stat-item">
                            <div className="live-stat-value">{backspaceCount}</div>
                            <div className="live-stat-label"><FiDelete size={10} /> Backsp</div>
                        </div>
                    </div>

                    {/* Typing Area */}
                    <div ref={typingRef} className="typing-area" tabIndex={0}
                        onKeyDown={handleKeyDown}
                        onClick={() => typingActive && typingRef.current?.focus()}
                        style={{ marginBottom: '24px' }}>
                        {para.split('').map((char, i) => (
                            <span key={i} className={`char ${charStates[i] || 'pending'} ${i === charIndex && typingActive ? 'current' : ''}`}>
                                {char}
                            </span>
                        ))}
                    </div>
                </>
            )}

            {/* Winner Celebration */}
            {finished && (() => {
                const isWinner = myRank === 1;
                const prize = settings?.prize || 0;
                return (
                    <div className="glass-card" style={{
                        textAlign: 'center', padding: '40px', marginBottom: '24px',
                        border: isWinner ? '2px solid var(--rank-gold)' : '1px solid var(--bg-glass-border)',
                        background: isWinner ? 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(217,119,6,0.05))' : undefined,
                        position: 'relative', overflow: 'hidden',
                    }}>
                        {/* Confetti background for winner */}
                        {isWinner && (
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', opacity: 0.5,
                                background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(251,191,36,0.05) 10px, rgba(251,191,36,0.05) 20px)',
                            }} />
                        )}

                        <div style={{ fontSize: isWinner ? '72px' : '48px', marginBottom: '12px', position: 'relative' }}>
                            {isWinner ? '🏆' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '🎉'}
                        </div>

                        <h2 style={{
                            fontFamily: 'var(--font-display)', fontSize: isWinner ? '32px' : '24px', fontWeight: 900,
                            background: isWinner ? 'linear-gradient(135deg, #fbbf24, #d97706)' : 'var(--accent-gradient)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            marginBottom: '8px', position: 'relative',
                        }}>
                            {isWinner ? `🎉 Congratulations ${student.name}! 🎉` : `You finished #${myRank}!`}
                        </h2>

                        {isWinner && (
                            <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--rank-gold)', marginBottom: '8px', position: 'relative' }}>
                                🥇 1st Place Winner! You are the CHAMPION! 🥇
                            </p>
                        )}

                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', margin: '20px 0', flexWrap: 'wrap', position: 'relative' }}>
                            {[
                                { label: 'WPM', value: wpm, color: 'var(--accent-primary)' },
                                { label: 'Accuracy', value: `${accuracy}%`, color: 'var(--accent-success)' },
                                { label: 'Score', value: score, color: 'var(--rank-gold)' },
                                { label: 'Rank', value: `#${myRank}`, color: 'var(--accent-secondary)' },
                            ].map((s, i) => (
                                <div key={i} style={{ padding: '12px 20px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: s.color }}>{s.value}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {isWinner && prize > 0 && (
                            <div style={{
                                padding: '16px 24px', borderRadius: 'var(--radius-lg)', margin: '16px auto', maxWidth: '400px',
                                background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)', position: 'relative',
                            }}>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginBottom: '4px' }}>
                                    💰 Prize: ₹{prize}
                                </div>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                                    🎉 Badhai ho! Aapke account me ₹{prize} 24 se 48 hours me transfer kiye jayenge.
                                </p>
                            </div>
                        )}

                        {isWinner && prize === 0 && (
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px', position: 'relative' }}>
                                🏅 You dominated this competition! Great typing! 🔥
                            </p>
                        )}
                    </div>
                );
            })()}

            {/* Live Rankings */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{
                    padding: '14px 20px', borderBottom: '1px solid var(--bg-glass-border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                        <FiRadio style={{ marginRight: '8px' }} /> Live Rankings
                    </h3>
                    {typingActive && <span style={{ fontSize: '11px', color: 'var(--accent-success)', fontWeight: 600 }}>🔴 Live</span>}
                </div>
                {participants.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No participants yet</div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Rank</th><th>Name</th><th>WPM</th><th>Accuracy</th><th>Score</th><th>Progress</th>
                            </tr>
                        </thead>
                        <tbody>
                            {participants.map(p => (
                                <tr key={p.id} style={{ background: p.id === student.id ? 'var(--accent-gradient-light)' : undefined }}>
                                    <td style={{
                                        fontFamily: 'var(--font-display)', fontWeight: 800,
                                        color: p.rank <= 3 ? ['var(--rank-gold)', 'var(--rank-silver)', 'var(--rank-bronze)'][p.rank - 1] : 'var(--text-muted)'
                                    }}>
                                        {p.rank <= 3 ? ['🥇', '🥈', '🥉'][p.rank - 1] : `#${p.rank}`}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{p.name} {p.id === student.id ? '(You)' : ''}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-primary)' }}>{p.wpm || 0}</td>
                                    <td style={{
                                        fontFamily: 'var(--font-mono)',
                                        color: (p.accuracy || 0) >= 90 ? 'var(--accent-success)' : 'var(--accent-warning)'
                                    }}>{p.accuracy || 0}%</td>
                                    <td style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--rank-gold)' }}>{p.score || 0}</td>
                                    <td>
                                        <div style={{ width: '60px', height: '6px', background: 'var(--bg-glass-border)', borderRadius: '3px' }}>
                                            <div style={{ width: `${p.progress || 0}%`, height: '100%', background: 'var(--accent-gradient)', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
