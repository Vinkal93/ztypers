import { useState, useEffect, useRef, useCallback } from 'react';
import { calculateWPM, calculateAccuracy, calculateFinalScore, formatTime } from '../lib/ranking';
import { blockCopyPaste } from '../lib/antiCheat';
import { allPracticeParagraphs } from '../constants/practiceParagraphs';
import { FiZap, FiTarget, FiClock, FiRefreshCw, FiHash, FiDelete, FiAward } from 'react-icons/fi';
import Seo from '../components/Seo';

const TIME_OPTIONS = [15, 30, 60, 120, 300];

export default function Practice() {
    const typingRef = useRef(null);

    const [paragraph, setParagraph] = useState('');
    const [duration, setDuration] = useState(60);
    const [status, setStatus] = useState('ready'); // ready, active, finished

    const [charIndex, setCharIndex] = useState(0);
    const [charStates, setCharStates] = useState([]);
    const [startTime, setStartTime] = useState(null);
    const [timeLeft, setTimeLeft] = useState(60);

    const [wpm, setWpm] = useState(0);
    const [accuracy, setAccuracy] = useState(100);
    const [correctChars, setCorrectChars] = useState(0);
    const [totalTyped, setTotalTyped] = useState(0);
    const [correctWords, setCorrectWords] = useState(0);
    const [mistakes, setMistakes] = useState(0);
    const [backspaceCount, setBackspaceCount] = useState(0);
    const [score, setScore] = useState(0);

    useEffect(() => { loadNewParagraph(); }, []);

    useEffect(() => {
        const cleanup = typingRef.current ? blockCopyPaste(typingRef.current) : null;
        return () => cleanup?.();
    }, []);

    const loadNewParagraph = () => {
        const p = allPracticeParagraphs[Math.floor(Math.random() * allPracticeParagraphs.length)];
        setParagraph(p);
        setCharStates(p.split('').map(() => 'pending'));
        setCharIndex(0);
        setStatus('ready');
        setStartTime(null);
        setTimeLeft(duration);
        setWpm(0); setAccuracy(100); setCorrectChars(0); setTotalTyped(0);
        setCorrectWords(0); setMistakes(0); setBackspaceCount(0); setScore(0);
    };

    useEffect(() => {
        if (paragraph) {
            setCharStates(paragraph.split('').map(() => 'pending'));
            setTimeLeft(duration);
        }
    }, [duration]);

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
            }
        }, 100);
        return () => clearInterval(interval);
    }, [status, startTime, duration]);

    // Live stats
    useEffect(() => {
        if (status !== 'active' || !startTime) return;
        const elapsed = (Date.now() - startTime) / 1000;
        setWpm(calculateWPM(correctWords, elapsed));
        setAccuracy(calculateAccuracy(correctChars, totalTyped));
        setScore(calculateFinalScore(calculateWPM(correctWords, elapsed), calculateAccuracy(correctChars, totalTyped)));
    }, [charIndex, correctChars, totalTyped, correctWords]);

    // Instant start — just click "Start" and typing begins immediately
    const startTyping = () => {
        setStatus('active');
        setStartTime(Date.now());
        setTimeLeft(duration);
        setTimeout(() => typingRef.current?.focus(), 50);
    };

    const handleKeyDown = useCallback((e) => {
        if (status !== 'active') return;
        const key = e.key;
        const ts = Date.now();

        if (key === 'Tab') { e.preventDefault(); return; }

        if (key === 'Backspace') {
            e.preventDefault();
            setBackspaceCount(prev => prev + 1);
            if (charIndex > 0) {
                setCharIndex(prev => prev - 1);
                setCharStates(prev => { const n = [...prev]; n[charIndex - 1] = 'pending'; return n; });
            }
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
            }
        }

        setCharIndex(prev => prev + 1);
        if (charIndex + 1 >= paragraph.length) setStatus('finished');
    }, [status, charIndex, paragraph, charStates]);

    const timerClass = timeLeft <= 10 ? 'danger' : timeLeft <= 30 ? 'warning' : '';

    return (
        <div className="page-container fade-in">
            <Seo
                title="Practice Typing Speed Test | WPM Tracker"
                description="Improve your typing speed and accuracy for free. Test your WPM, view real-time error tracking, and become a faster typist with Z Typers."
                keywords="typing practice, typing speed test, WPM test, improve typing speed, free typing test, online typing tool, check typing speed"
                canonicalUrl="/practice"
            />
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 className="page-title">⌨️ Practice Typing</h1>
                    <p className="page-subtitle">Free typing tool — improve your speed and accuracy</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <a href="https://typingmaster2.vercel.app/" target="_blank" rel="noopener noreferrer"
                        className="btn btn-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📖 Learn Typing
                    </a>
                    <button onClick={loadNewParagraph} className="btn btn-secondary">
                        <FiRefreshCw size={15} /> New Text
                    </button>
                </div>
            </div>

            {/* Time Selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '8px' }}>
                    <FiClock size={14} style={{ marginRight: '4px' }} /> Duration:
                </span>
                {TIME_OPTIONS.map(t => (
                    <button key={t} onClick={() => { setDuration(t); setTimeLeft(t); }}
                        className={`tab ${duration === t ? 'active' : ''}`}
                        style={{ minWidth: '60px' }}>
                        {t < 60 ? `${t}s` : `${t / 60}m`}
                    </button>
                ))}
            </div>

            {/* Timer */}
            <div className={`timer ${timerClass}`} style={{ marginBottom: '20px', fontSize: '42px' }}>
                {status === 'active' ? formatTime(timeLeft) : status === 'ready' ? formatTime(duration) : '00:00'}
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
                <div className="live-stat-item">
                    <div className="live-stat-value" style={{ color: 'var(--text-secondary)' }}>{totalTyped}</div>
                    <div className="live-stat-label">Keystrokes</div>
                </div>
            </div>

            {/* Typing Area */}
            <div
                ref={typingRef}
                className="typing-area"
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onClick={() => { if (status === 'active') typingRef.current?.focus(); }}
                style={{ marginBottom: '24px' }}
            >
                {paragraph.split('').map((char, i) => (
                    <span key={i} className={`char ${charStates[i] || 'pending'} ${i === charIndex && status === 'active' ? 'current' : ''}`}>
                        {char}
                    </span>
                ))}
            </div>

            {/* Start / Reset */}
            {status === 'ready' && (
                <div style={{ textAlign: 'center' }}>
                    <button onClick={startTyping} className="btn btn-primary btn-lg" style={{ padding: '18px 48px', fontSize: '18px' }}>
                        <FiZap /> Start Typing
                    </button>
                    <p style={{ color: 'var(--text-muted)', marginTop: '12px', fontSize: '13px' }}>
                        Click start, then type the text above as fast as you can!
                    </p>
                </div>
            )}

            {/* Finished */}
            {status === 'finished' && (
                <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>
                        🎉 Practice Complete!
                    </h2>
                    <div className="live-stats" style={{ justifyContent: 'center', margin: '24px 0' }}>
                        <div className="live-stat-item">
                            <div className="live-stat-value" style={{ color: 'var(--accent-primary)', fontSize: '36px' }}>{wpm}</div>
                            <div className="live-stat-label">WPM</div>
                        </div>
                        <div className="live-stat-item">
                            <div className="live-stat-value" style={{ color: 'var(--accent-success)', fontSize: '36px' }}>{accuracy}%</div>
                            <div className="live-stat-label">Accuracy</div>
                        </div>
                        <div className="live-stat-item">
                            <div className="live-stat-value" style={{ color: 'var(--rank-gold)', fontSize: '36px' }}>{score}</div>
                            <div className="live-stat-label">Score</div>
                        </div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                        Score = WPM ({wpm}) × (Accuracy ({accuracy}%) / 100) = <span style={{ fontWeight: 800, color: 'var(--rank-gold)' }}>{score}</span>
                    </div>
                    <button onClick={loadNewParagraph} className="btn btn-primary btn-lg">
                        <FiRefreshCw /> Try Again
                    </button>
                </div>
            )}
        </div>
    );
}
