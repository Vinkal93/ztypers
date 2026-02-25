import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { calculateWPM, calculateAccuracy, calculateFinalScore, formatTime } from '../lib/ranking';
import { blockCopyPaste, detectTabSwitch } from '../lib/antiCheat';
import { paragraphs } from '../constants/theme';
import { FiZap, FiTarget, FiClock, FiAward, FiAlertTriangle } from 'react-icons/fi';

export default function Compete() {
    const { compId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const typingAreaRef = useRef(null);

    // Competition state
    const [competition, setCompetition] = useState(null);
    const [paragraph, setParagraph] = useState('');
    const [status, setStatus] = useState('loading'); // loading, waiting, countdown, active, finished

    // Typing state
    const [typed, setTyped] = useState('');
    const [charIndex, setCharIndex] = useState(0);
    const [charStates, setCharStates] = useState([]); // 'correct' | 'incorrect' | 'pending'
    const [startTime, setStartTime] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [duration, setDuration] = useState(60);

    // Stats
    const [wpm, setWpm] = useState(0);
    const [accuracy, setAccuracy] = useState(100);
    const [correctChars, setCorrectChars] = useState(0);
    const [totalTyped, setTotalTyped] = useState(0);
    const [correctWords, setCorrectWords] = useState(0);
    const [mistakes, setMistakes] = useState(0);
    const [backspaceCount, setBackspaceCount] = useState(0);
    const [score, setScore] = useState(0);

    // Logging
    const [keystrokeLog, setKeystrokeLog] = useState([]);
    const [wrongWords, setWrongWords] = useState([]);
    const [tabSwitches, setTabSwitches] = useState(0);
    const [countdown, setCountdown] = useState(3);

    // Load competition data
    useEffect(() => {
        if (!compId) return;
        const unsub = onSnapshot(doc(db, 'competitions', compId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setCompetition(data);
                setParagraph(data.paragraph || paragraphs[Math.floor(Math.random() * paragraphs.length)]);
                setDuration(data.duration || 60);
                setTimeLeft(data.duration || 60);
                if (data.status === 'active') {
                    setStatus('waiting');
                } else if (data.status === 'ended') {
                    setStatus('finished');
                }
            }
        });
        return () => unsub();
    }, [compId]);

    // Initialize char states
    useEffect(() => {
        if (paragraph) {
            setCharStates(paragraph.split('').map(() => 'pending'));
        }
    }, [paragraph]);

    // Anti-cheat
    useEffect(() => {
        const cleanupPaste = typingAreaRef.current ? blockCopyPaste(typingAreaRef.current) : null;
        const cleanupTab = detectTabSwitch(
            () => setTabSwitches(prev => prev + 1),
            null
        );
        return () => {
            cleanupPaste?.();
            cleanupTab?.();
        };
    }, []);

    // Timer
    useEffect(() => {
        if (status !== 'active' || !startTime) return;
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const remaining = Math.max(0, duration - elapsed);
            setTimeLeft(remaining);
            if (remaining <= 0) {
                setStatus('finished');
                clearInterval(interval);
                submitResults();
            }
        }, 100);
        return () => clearInterval(interval);
    }, [status, startTime, duration]);

    // Live stats calculation
    useEffect(() => {
        if (status !== 'active' || !startTime) return;
        const elapsed = (Date.now() - startTime) / 1000;
        const currentWPM = calculateWPM(correctWords, elapsed);
        const currentAccuracy = calculateAccuracy(correctChars, totalTyped);
        const currentScore = calculateFinalScore(currentWPM, currentAccuracy);
        setWpm(currentWPM);
        setAccuracy(currentAccuracy);
        setScore(currentScore);
    }, [charIndex, correctChars, totalTyped, correctWords]);

    // Push data to Firebase every 3 seconds
    useEffect(() => {
        if (status !== 'active') return;
        const interval = setInterval(() => {
            pushLiveData();
        }, 3000);
        return () => clearInterval(interval);
    }, [status, wpm, accuracy, score]);

    const pushLiveData = async () => {
        if (!user || !compId) return;
        try {
            await setDoc(doc(db, 'competitions', compId, 'participants', user.uid), {
                name: user.displayName || 'Anonymous',
                wpm,
                accuracy,
                score,
                totalKeystrokes: totalTyped,
                mistakes,
                backspaceCount,
                tabSwitches,
                lastUpdate: Date.now(),
            }, { merge: true });
        } catch (err) {
            console.error('Error pushing live data:', err);
        }
    };

    const submitResults = async () => {
        if (!user || !compId) return;
        const elapsed = startTime ? (Date.now() - startTime) / 1000 : duration;
        const finalWPM = calculateWPM(correctWords, elapsed);
        const finalAccuracy = calculateAccuracy(correctChars, totalTyped);
        const finalScore = calculateFinalScore(finalWPM, finalAccuracy);

        try {
            await setDoc(doc(db, 'competitions', compId, 'participants', user.uid), {
                name: user.displayName || 'Anonymous',
                email: user.email,
                wpm: finalWPM,
                accuracy: finalAccuracy,
                score: finalScore,
                totalKeystrokes: totalTyped,
                mistakes,
                backspaceCount,
                wrongWords,
                keystrokeLog,
                tabSwitches,
                completedAt: new Date().toISOString(),
                finished: true,
            });
        } catch (err) {
            console.error('Error submitting results:', err);
        }
    };

    const startCountdown = () => {
        setStatus('countdown');
        setCountdown(3);
        let count = 3;
        const interval = setInterval(() => {
            count--;
            setCountdown(count);
            if (count <= 0) {
                clearInterval(interval);
                setStatus('active');
                setStartTime(Date.now());
                inputRef.current?.focus();
            }
        }, 1000);
    };

    const handleKeyDown = useCallback((e) => {
        if (status !== 'active') return;

        const timestamp = Date.now();
        const key = e.key;

        // Prevent default for tab
        if (key === 'Tab') { e.preventDefault(); return; }

        if (key === 'Backspace') {
            e.preventDefault();
            // Check if admin disabled backspace
            if (competition?.backspaceEnabled === false) {
                return; // Backspace disabled by admin
            }
            setBackspaceCount(prev => prev + 1);
            if (charIndex > 0) {
                setCharIndex(prev => prev - 1);
                setCharStates(prev => {
                    const newStates = [...prev];
                    newStates[charIndex - 1] = 'pending';
                    return newStates;
                });
            }
            setKeystrokeLog(prev => [...prev, { key: '⌫', timestamp, correct: null }]);
            return;
        }

        if (key.length !== 1) return; // Ignore modifier keys
        e.preventDefault();

        if (charIndex >= paragraph.length) return;

        const expected = paragraph[charIndex];
        const isCorrect = key === expected;

        setCharStates(prev => {
            const newStates = [...prev];
            newStates[charIndex] = isCorrect ? 'correct' : 'incorrect';
            return newStates;
        });

        setTotalTyped(prev => prev + 1);
        if (isCorrect) {
            setCorrectChars(prev => prev + 1);
        } else {
            setMistakes(prev => prev + 1);
        }

        // Word completion check
        if (expected === ' ' || charIndex === paragraph.length - 1) {
            const wordStart = paragraph.lastIndexOf(' ', charIndex - 1) + 1;
            const word = paragraph.slice(wordStart, charIndex + 1).trim();
            const wordStates = charStates.slice(wordStart, charIndex + 1);
            const allCorrect = wordStates.every(s => s === 'correct') && isCorrect;
            if (allCorrect) {
                setCorrectWords(prev => prev + 1);
            } else {
                setWrongWords(prev => [...prev, { word, position: wordStart }]);
            }
        }

        setCharIndex(prev => prev + 1);
        setKeystrokeLog(prev => [...prev, { key, expected, timestamp, correct: isCorrect }]);

        // Check if finished typing all text
        if (charIndex + 1 >= paragraph.length) {
            setStatus('finished');
            submitResults();
        }
    }, [status, charIndex, paragraph, charStates]);

    const timerClass = timeLeft <= 10 ? 'danger' : timeLeft <= 30 ? 'warning' : '';

    if (status === 'loading') {
        return (
            <div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}>
                <div className="timer" style={{ animation: 'pulse 1.5s infinite' }}>Loading...</div>
            </div>
        );
    }

    return (
        <div className="page-container fade-in">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 className="page-title" style={{ fontSize: '24px' }}>
                        {competition?.title || 'Typing Competition'}
                    </h1>
                    <p className="page-subtitle">Type the text below as fast and accurately as you can</p>
                </div>
                {competition?.prize && (
                    <div className="glass-card" style={{ padding: '12px 20px', textAlign: 'center' }}>
                        <div style={{ color: 'var(--rank-gold)', fontWeight: 800, fontSize: '20px' }}>₹{competition.prize}</div>
                        <div className="stat-label">Prize</div>
                    </div>
                )}
            </div>

            {/* Warning for tab switches */}
            {tabSwitches > 0 && (
                <div style={{
                    padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '16px',
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                    color: 'var(--accent-warning)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                    <FiAlertTriangle /> You switched tabs {tabSwitches} time(s). This is flagged for review.
                </div>
            )}

            {/* Timer */}
            <div className={`timer ${timerClass}`} style={{ marginBottom: '24px' }}>
                {status === 'countdown' ? (
                    <span style={{ animation: 'countUp 0.5s ease' }}>{countdown}</span>
                ) : status === 'active' ? (
                    formatTime(timeLeft)
                ) : status === 'waiting' ? (
                    'Ready?'
                ) : (
                    '00:00'
                )}
            </div>

            {/* Live Stats */}
            {(status === 'active' || status === 'finished') && (
                <div className="live-stats" style={{ marginBottom: '24px', justifyContent: 'center' }}>
                    <div className="live-stat-item">
                        <div className="live-stat-value" style={{ color: 'var(--accent-primary)' }}>
                            <FiZap style={{ marginRight: '4px' }} />{wpm}
                        </div>
                        <div className="live-stat-label">WPM</div>
                    </div>
                    <div className="live-stat-item">
                        <div className="live-stat-value" style={{ color: accuracy >= 90 ? 'var(--accent-success)' : accuracy >= 70 ? 'var(--accent-warning)' : 'var(--accent-danger)' }}>
                            <FiTarget style={{ marginRight: '4px' }} />{accuracy}%
                        </div>
                        <div className="live-stat-label">Accuracy</div>
                    </div>
                    <div className="live-stat-item">
                        <div className="live-stat-value" style={{ color: 'var(--rank-gold)' }}>
                            <FiAward style={{ marginRight: '4px' }} />{score}
                        </div>
                        <div className="live-stat-label">Score</div>
                    </div>
                    <div className="live-stat-item">
                        <div className="live-stat-value" style={{ color: 'var(--accent-danger)' }}>{mistakes}</div>
                        <div className="live-stat-label">Mistakes</div>
                    </div>
                    <div className="live-stat-item">
                        <div className="live-stat-value" style={{ color: 'var(--text-secondary)' }}>{backspaceCount}</div>
                        <div className="live-stat-label">Backspaces</div>
                    </div>
                </div>
            )}

            {/* Typing Area */}
            <div
                ref={typingAreaRef}
                className="typing-area"
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onClick={() => status === 'active' && typingAreaRef.current?.focus()}
                style={{ marginBottom: '24px', cursor: status === 'active' ? 'text' : 'default', outline: 'none' }}
            >
                {paragraph.split('').map((char, i) => (
                    <span
                        key={i}
                        className={`char ${charStates[i] || 'pending'} ${i === charIndex && status === 'active' ? 'current' : ''}`}
                    >
                        {char}
                    </span>
                ))}

                {/* Hidden input for mobile keyboard */}
                <input
                    ref={inputRef}
                    type="text"
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                />
            </div>

            {/* Action Buttons */}
            {status === 'waiting' && (
                <div style={{ textAlign: 'center' }}>
                    <button onClick={startCountdown} className="btn btn-primary btn-lg">
                        <FiZap /> Start Typing
                    </button>
                </div>
            )}

            {status === 'finished' && (
                <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>
                        🏁 Competition Complete!
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Your results have been submitted.</p>
                    <div className="live-stats" style={{ justifyContent: 'center', marginBottom: '24px' }}>
                        <div className="live-stat-item">
                            <div className="live-stat-value" style={{ color: 'var(--accent-primary)' }}>{wpm}</div>
                            <div className="live-stat-label">Final WPM</div>
                        </div>
                        <div className="live-stat-item">
                            <div className="live-stat-value" style={{ color: 'var(--accent-success)' }}>{accuracy}%</div>
                            <div className="live-stat-label">Accuracy</div>
                        </div>
                        <div className="live-stat-item">
                            <div className="live-stat-value" style={{ color: 'var(--rank-gold)' }}>{score}</div>
                            <div className="live-stat-label">Final Score</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button onClick={() => navigate(`/leaderboard/${compId}`)} className="btn btn-primary">
                            <FiAward /> View Leaderboard
                        </button>
                        <button onClick={() => navigate('/home')} className="btn btn-secondary">
                            Back to Home
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
