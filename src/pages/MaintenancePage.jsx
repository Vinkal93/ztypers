import { useState, useEffect } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FiTool, FiClock } from 'react-icons/fi';

export default function MaintenancePage({ message }) {
    const [dots, setDots] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(145deg, #0a0a1a 0%, #0d1127 40%, #1a0a2e 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Inter', system-ui, sans-serif",
            overflow: 'hidden', position: 'relative',
        }}>
            {/* Animated background circles */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                {[...Array(6)].map((_, i) => (
                    <div key={i} style={{
                        position: 'absolute',
                        width: `${200 + i * 80}px`, height: `${200 + i * 80}px`,
                        borderRadius: '50%',
                        border: '1px solid rgba(124,58,237,0.08)',
                        top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        animation: `pulse-ring ${4 + i}s ease-in-out infinite alternate`,
                    }} />
                ))}
            </div>

            <div style={{
                textAlign: 'center', maxWidth: '500px', padding: '40px',
                position: 'relative', zIndex: 1,
            }}>
                {/* Animated gear icon */}
                <div style={{
                    width: '100px', height: '100px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(59,130,246,0.15))',
                    border: '2px solid rgba(124,58,237,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 28px',
                    animation: 'gear-spin 8s linear infinite',
                }}>
                    <FiTool size={40} style={{ color: '#7c3aed' }} />
                </div>

                <h1 style={{
                    fontSize: '36px', fontWeight: 900, marginBottom: '12px',
                    background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.5px',
                }}>
                    Under Maintenance
                </h1>

                <p style={{
                    fontSize: '16px', color: 'rgba(255,255,255,0.6)',
                    lineHeight: 1.7, marginBottom: '32px',
                }}>
                    {message || 'We are currently performing scheduled maintenance. Please check back shortly.'}
                </p>

                {/* Status indicator */}
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '10px 20px', borderRadius: '100px',
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.15)',
                }}>
                    <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: '#f59e0b',
                        animation: 'blink 1.5s infinite',
                    }} />
                    <span style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 600 }}>
                        Maintenance in progress{dots}
                    </span>
                </div>

                {/* Footer */}
                <div style={{ marginTop: '40px', fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>
                    <FiClock size={12} style={{ marginRight: '4px' }} />
                    We'll be back soon. Thank you for your patience.
                </div>
            </div>

            <style>{`
                @keyframes pulse-ring {
                    0% { opacity: 0.3; transform: translate(-50%, -50%) scale(0.95); }
                    100% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.05); }
                }
                @keyframes gear-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
            `}</style>
        </div>
    );
}
