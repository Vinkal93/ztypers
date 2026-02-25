import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, setDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { calculateWPM, calculateAccuracy, calculateFinalScore, formatTime } from '../lib/ranking';
import { blockCopyPaste } from '../lib/antiCheat';
import { FiLogIn, FiZap, FiTarget, FiAward, FiClock, FiUser, FiKey, FiUsers, FiHash, FiDelete } from 'react-icons/fi';

export default function Playground() {
    // Auth state
    const [student, setStudent] = useState(null);
    const [loginForm, setLoginForm] = useState({ studentId: '', password: '' });
    const [loginError, setLoginError] = useState('');

    // Competition state
    const [activeComp, setActiveComp] = useState(null);
    const [paragraph, setParagraph] = useState('');
    const [status, setStatus] = useState('waiting'); // waiting, countdown, active, finished
    const [serverCountdown, setServerCountdown] = useState(null);

    // Typing state
    const [charIndex, setCharIndex] = useState(0);
    const [charStates, setCharStates] = useState([]);
    const [startTime, setStartTime] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [countdown, setCountdown] = useState(0);
    const typingRef = useRef(null);

    // Stats
    const [wpm, setWpm] = useState(0);
    const [accuracy, setAccuracy] = useState(100);
    const [correctChars, setCorrectChars] = useState(0);
    const [totalTyped, setTotalTyped] = useState(0);
    const [correctWords, setCorrectWords] = useState(0);
    const [mistakes, setMistakes] = useState(0);
    const [backspaceCount, setBackspaceCount] = useState(0);
    const [score, setScore] = useState(0);
    const [keystrokeLog, setKeystrokeLog] = useState([]);
    const [wrongWords, setWrongWords] = useState([]);

    // All participants (live)
    const [participants, setParticipants] = useState([]);

    // Student Login
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');
        try {
            const q = query(collection(db, 'students'),
                where('studentId', '==', loginForm.studentId),
                where('password', '==', loginForm.password));
            const snap = await getDocs(q);
            if (snap.empty) {
                setLoginError('Invalid Student ID or Password');
                return;
            }
            const studentData = { id: snap.docs[0].id, ...snap.docs[0].data() };
            setStudent(studentData);
            localStorage.setItem('ztypers-student', JSON.stringify(studentData));
        } catch (err) {
            setLoginError('Login failed. Try again.');
        }
    };

    // Restore session
    useEffect(() => {
        const saved = localStorage.getItem('ztypers-student');
        if (saved) {
            try { setStudent(JSON.parse(saved)); } catch (e) { }
        }
    }, []);

    // Listen for active playground competition
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'playground'), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setActiveComp(data);
                if (data.paragraph) setParagraph(data.paragraph);
                if (data.duration) setTimeLeft(data.duration);
                if (data.status === 'active' && status !== 'active' && status !== 'finished') {
                    // Admin started — begin countdown then typing
                    startTypingSequence(data.countdownSeconds || 3, data.duration || 60);
                }
                if (data.status === 'countdown') {
                    setServerCountdown(data.countdownSeconds || 10);
                }
                if (data.status === 'waiting') {
                    setStatus('waiting');
                    resetTyping(data.paragraph || '', data.duration || 60);
                }
                if (data.status === 'ended') {
                    setStatus('finished');
                }
            }
        });
        return () => unsub();
    }, []);

    // Listen for participants
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
        const cleanup = typingRef.current ? blockCopyPaste(typingRef.current) : null;
        return () => cleanup?.();
    }, [student]);

    const resetTyping = (para, dur) => {
        setParagraph(para);
        setCharStates(para.split('').map(() => 'pending'));
        setCharIndex(0);
        setTimeLeft(dur);
        setStartTime(null);
        setWpm(0); setAccuracy(100); setCorrectChars(0); setTotalTyped(0);
        setCorrectWords(0); setMistakes(0); setBackspaceCount(0); setScore(0);
        setKeystrokeLog([]); setWrongWords([]);
    };

    const startTypingSequence = (countdownSec, dur) => {
        setStatus('countdown');
        setCountdown(countdownSec);
        let count = countdownSec;
        const interval = setInterval(() => {
            count--;
            setCountdown(count);
            if (count <= 0) {
                clearInterval(interval);
                setStatus('active');
                setStartTime(Date.now());
                setTimeLeft(dur);
                typingRef.current?.focus();
            }
        }, 1000);
    };

    // Timer
    useEffect(() => {
        if (status !== 'active' || !startTime) return;
        const dur = activeComp?.duration || 60;
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const remaining = Math.max(0, dur - elapsed);
            setTimeLeft(remaining);
            if (remaining <= 0) {
                setStatus('finished');
                clearInterval(interval);
                submitResults();
            }
        }, 100);
        return () => clearInterval(interval);
    }, [status, startTime]);

    // Live stats
    useEffect(() => {
        if (status !== 'active' || !startTime) return;
        const elapsed = (Date.now() - startTime) / 1000;
        setWpm(calculateWPM(correctWords, elapsed));
        setAccuracy(calculateAccuracy(correctChars, totalTyped));
        setScore(calculateFinalScore(calculateWPM(correctWords, elapsed), calculateAccuracy(correctChars, totalTyped)));
    }, [charIndex, correctChars, totalTyped, correctWords]);

    // Push live data every 2 seconds
    useEffect(() => {
        if (status !== 'active' || !student) return;
        const interval = setInterval(() => pushLiveData(), 2000);
        return () => clearInterval(interval);
    }, [status, wpm, accuracy, score]);

    const pushLiveData = async () => {
        if (!student) return;
        try {
            await setDoc(doc(db, 'playground_participants', student.id), {
                name: student.name,
                studentId: student.studentId,
                wpm, accuracy, score,
                totalKeystrokes: totalTyped, mistakes, backspaceCount,
                lastUpdate: Date.now(),
            }, { merge: true });
        } catch (err) {
            console.error('Error pushing data:', err);
        }
    };

    const submitResults = async () => {
        if (!student) return;
        try {
            await setDoc(doc(db, 'playground_participants', student.id), {
                name: student.name,
                studentId: student.studentId,
                wpm, accuracy, score,
                totalKeystrokes: totalTyped, mistakes, backspaceCount,
                wrongWords, keystrokeLog: keystrokeLog.slice(0, 500),
                finished: true, completedAt: new Date().toISOString(),
            });
        } catch (err) {
            console.error('Error:', err);
        }
    };

    const handleKeyDown = useCallback((e) => {
        if (status !== 'active') return;
        const timestamp = Date.now();
        const key = e.key;

        if (key === 'Tab') { e.preventDefault(); return; }

        if (key === 'Backspace') {
            e.preventDefault();
            if (activeComp?.backspaceEnabled === false) return;
            setBackspaceCount(prev => prev + 1);
            if (charIndex > 0) {
                setCharIndex(prev => prev - 1);
                setCharStates(prev => { const n = [...prev]; n[charIndex - 1] = 'pending'; return n; });
            }
            setKeystrokeLog(prev => [...prev, { key: '⌫', timestamp, correct: null }]);
            return;
        }

        if (key.length !== 1) return;
        e.preventDefault();
        if (charIndex >= paragraph.length) return;

        const expected = paragraph[charIndex];
        const isCorrect = key === expected;

        setCharStates(prev => { const n = [...prev]; n[charIndex] = isCorrect ? 'correct' : 'incorrect'; return n; });
        setTotalTyped(prev => prev + 1);
        if (isCorrect) setCorrectChars(prev => prev + 1);
        else setMistakes(prev => prev + 1);

        if (expected === ' ' || charIndex === paragraph.length - 1) {
            const wordStart = paragraph.lastIndexOf(' ', charIndex - 1) + 1;
            const wordStates = charStates.slice(wordStart, charIndex);
            if (wordStates.every(s => s === 'correct') && isCorrect) {
                setCorrectWords(prev => prev + 1);
            } else {
                const word = paragraph.slice(wordStart, charIndex + 1).trim();
                setWrongWords(prev => [...prev, { word, position: wordStart }]);
            }
        }

        setCharIndex(prev => prev + 1);
        setKeystrokeLog(prev => [...prev, { key, expected, timestamp, correct: isCorrect }]);
        if (charIndex + 1 >= paragraph.length) { setStatus('finished'); submitResults(); }
    }, [status, charIndex, paragraph, charStates, activeComp]);

    const timerClass = timeLeft <= 10 ? 'danger' : timeLeft <= 30 ? 'warning' : '';

    // ======= LOGIN SCREEN =======
    if (!student) {
        return (
            <div style={{
                minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px',
            }}>
                <div className="glass-card fade-in" style={{ maxWidth: '420px', width: '100%', padding: '40px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <span style={{ fontSize: '48px', display: 'block' }}>🎮</span>
                        <h1 style={{
                            fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, marginTop: '12px',
                            background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>Playground Login</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '14px' }}>
                            Enter your Student ID and Password given by your admin
                        </p>
                    </div>

                    {loginError && (
                        <div style={{
                            padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '20px',
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                            color: 'var(--accent-danger)', fontSize: '13px',
                        }}>{loginError}</div>
                    )}

                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <label className="input-label"><FiUser style={{ marginRight: '6px' }} />Student ID</label>
                            <input type="text" className="input" placeholder="e.g., ZT1234"
                                value={loginForm.studentId} onChange={e => setLoginForm({ ...loginForm, studentId: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="input-label"><FiKey style={{ marginRight: '6px' }} />Password</label>
                            <input type="password" className="input" placeholder="Enter your password"
                                value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} required />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px' }}>
                            <FiLogIn /> Enter Playground
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // ======= PLAYGROUND =======
    return (
        <div className="page-container fade-in">
            {/* Welcome Header */}
            <div className="glass-card" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="avatar avatar-lg">{student.name?.[0]}</div>
                    <div>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '22px' }}>
                            Welcome, {student.name}! 👋
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                            ID: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{student.studentId}</span>
                        </p>
                    </div>
                </div>
                <button onClick={() => { setStudent(null); localStorage.removeItem('ztypers-student'); }} className="btn btn-secondary btn-sm">
                    Logout
                </button>
            </div>

            {/* Status Banner */}
            {status === 'waiting' && (
                <div className="glass-card" style={{ textAlign: 'center', padding: '40px', marginBottom: '24px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '24px', marginBottom: '8px' }}>
                        Waiting for Admin to Start
                    </h2>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        The competition will begin once the admin starts it. Stay on this page!
                    </p>
                    {activeComp?.paragraph && (
                        <div style={{ marginTop: '20px', padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--text-muted)' }}>
                            Duration: <strong>{activeComp.duration || 60}s</strong> ·
                            Backspace: <strong>{activeComp.backspaceEnabled !== false ? '✅ Allowed' : '❌ Disabled'}</strong>
                        </div>
                    )}
                </div>
            )}

            {/* Countdown */}
            {status === 'countdown' && (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{
                        fontSize: '120px', fontFamily: 'var(--font-display)', fontWeight: 900,
                        background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        animation: 'countUp 0.5s ease',
                    }}>{countdown}</div>
                    <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginTop: '16px' }}>Get Ready!</p>
                </div>
            )}

            {/* Active Typing */}
            {(status === 'active' || status === 'finished') && (
                <>
                    {/* Timer */}
                    <div className={`timer ${timerClass}`} style={{ marginBottom: '20px' }}>
                        {status === 'active' ? formatTime(timeLeft) : '00:00'}
                    </div>

                    {/* Live Stats */}
                    <div className="live-stats" style={{ marginBottom: '20px', justifyContent: 'center' }}>
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
                            <div className="live-stat-value" style={{ color: 'var(--text-secondary)' }}>{backspaceCount}</div>
                            <div className="live-stat-label"><FiDelete size={10} /> Backsp</div>
                        </div>
                    </div>

                    {/* Typing Area */}
                    <div ref={typingRef} className="typing-area" tabIndex={0}
                        onKeyDown={handleKeyDown}
                        onClick={() => status === 'active' && typingRef.current?.focus()}
                        style={{ marginBottom: '24px', outline: 'none' }}>
                        {paragraph.split('').map((char, i) => (
                            <span key={i} className={`char ${charStates[i] || 'pending'} ${i === charIndex && status === 'active' ? 'current' : ''}`}>
                                {char}
                            </span>
                        ))}
                    </div>

                    {/* Finished */}
                    {status === 'finished' && (
                        <div className="glass-card" style={{ textAlign: 'center', padding: '32px' }}>
                            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '24px', marginBottom: '16px' }}>
                                🏁 Typing Complete!
                            </h2>
                            <div className="live-stats" style={{ justifyContent: 'center', marginBottom: '16px' }}>
                                <div className="live-stat-item">
                                    <div className="live-stat-value" style={{ color: 'var(--accent-primary)', fontSize: '32px' }}>{wpm}</div>
                                    <div className="live-stat-label">WPM</div>
                                </div>
                                <div className="live-stat-item">
                                    <div className="live-stat-value" style={{ color: 'var(--accent-success)', fontSize: '32px' }}>{accuracy}%</div>
                                    <div className="live-stat-label">Accuracy</div>
                                </div>
                                <div className="live-stat-item">
                                    <div className="live-stat-value" style={{ color: 'var(--rank-gold)', fontSize: '32px' }}>{score}</div>
                                    <div className="live-stat-label">Score</div>
                                </div>
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Your results are saved. Check the Live section for rankings!</p>
                        </div>
                    )}
                </>
            )}

            {/* Live Participants */}
            {participants.length > 0 && (
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginTop: '24px' }}>
                    <div style={{
                        padding: '16px 24px', borderBottom: '1px solid var(--bg-glass-border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                            <FiUsers style={{ marginRight: '8px' }} /> Live Rankings
                        </h3>
                        <span style={{ fontSize: '12px', color: 'var(--accent-success)', fontWeight: 600 }}>Real-time ✓</span>
                    </div>
                    {participants.map((p, i) => (
                        <div key={p.id} style={{
                            display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 24px',
                            borderBottom: '1px solid var(--bg-glass-border)',
                            background: p.studentId === student.studentId ? 'var(--accent-gradient-light)' : 'transparent',
                        }}>
                            <span style={{
                                fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '18px', minWidth: '40px',
                                color: p.rank === 1 ? 'var(--rank-gold)' : p.rank === 2 ? 'var(--rank-silver)' : p.rank === 3 ? 'var(--rank-bronze)' : 'var(--text-muted)',
                            }}>
                                {p.rank <= 3 ? ['🥇', '🥈', '🥉'][p.rank - 1] : `#${p.rank}`}
                            </span>
                            <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '13px' }}>{p.name?.[0]}</div>
                            <div style={{ flex: 1 }}>
                                <span style={{ fontWeight: 600, fontSize: '14px' }}>{p.name}</span>
                                {p.studentId === student.studentId && <span style={{ fontSize: '11px', color: 'var(--accent-primary)', marginLeft: '8px' }}>(You)</span>}
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-primary)' }}>{p.wpm}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: p.accuracy >= 90 ? 'var(--accent-success)' : 'var(--accent-warning)', fontSize: '13px' }}>{p.accuracy}%</span>
                            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--rank-gold)' }}>{p.score}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
