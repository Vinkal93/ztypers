import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, setDoc, onSnapshot, collection, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { calculateWPM, calculateAccuracy, calculateFinalScore, formatTime } from '../lib/ranking';
import { blockCopyPaste } from '../lib/antiCheat';
import { FiZap, FiTarget, FiClock, FiHash, FiDelete, FiAward, FiLogIn, FiRadio } from 'react-icons/fi';

export default function Playground() {
    const typingRef = useRef(null);

    // Student login
    const [studentId, setStudentId] = useState('');
    const [password, setPassword] = useState('');
    const [student, setStudent] = useState(null);
    const [loginError, setLoginError] = useState('');
    const [loggingIn, setLoggingIn] = useState(false);

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
                setStudent({ id: studentDoc.id, ...studentDoc.data() });
            }
        } catch (err) {
            setLoginError('Error: ' + (err.message || 'Something went wrong'));
        }
        setLoggingIn(false);
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
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{
                        padding: '6px 14px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '12px',
                        background: typingActive ? 'rgba(5,150,105,0.1)' : countdown ? 'rgba(245,158,11,0.1)' : 'rgba(107,114,128,0.1)',
                        color: typingActive ? 'var(--accent-success)' : countdown ? 'var(--accent-warning)' : 'var(--text-muted)',
                        border: `1px solid ${typingActive ? 'rgba(5,150,105,0.3)' : countdown ? 'rgba(245,158,11,0.3)' : 'rgba(107,114,128,0.3)'}`,
                    }}>
                        {typingActive ? '🟢 LIVE' : countdown ? '🟡 GET READY' : finished ? '🏁 FINISHED' : '⏳ WAITING FOR ADMIN'}
                    </span>
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

            {/* Finished */}
            {finished && (
                <div className="glass-card" style={{ textAlign: 'center', padding: '32px', marginBottom: '24px' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>
                        🎉 Your Rank: #{myRank}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)' }}>WPM: {wpm} • Accuracy: {accuracy}% • Score: {score}</p>
                </div>
            )}

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
