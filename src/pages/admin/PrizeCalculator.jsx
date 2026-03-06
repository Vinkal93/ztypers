import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import {
    FiArrowLeft, FiUsers, FiDollarSign, FiAward, FiLock, FiUnlock,
    FiRefreshCw, FiCheck, FiTrendingUp, FiTarget, FiStar, FiZap,
} from 'react-icons/fi';

// ── Confetti Canvas ─────────────────────────────────────────
function ConfettiCanvas({ active }) {
    const canvasRef = useRef(null);
    const particlesRef = useRef([]);
    const animRef = useRef(null);

    useEffect(() => {
        if (!active || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const colors = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#fbbf24'];
        const particles = [];
        for (let i = 0; i < 200; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                w: Math.random() * 10 + 5,
                h: Math.random() * 6 + 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                vy: Math.random() * 3 + 2,
                vx: (Math.random() - 0.5) * 4,
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 10,
                opacity: 1,
            });
        }
        particlesRef.current = particles;

        let frame = 0;
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let alive = false;
            particles.forEach(p => {
                if (p.opacity <= 0) return;
                alive = true;
                p.y += p.vy;
                p.x += p.vx;
                p.rotation += p.rotSpeed;
                if (frame > 120) p.opacity -= 0.008;

                ctx.save();
                ctx.globalAlpha = p.opacity;
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            });
            frame++;
            if (alive && frame < 300) {
                animRef.current = requestAnimationFrame(animate);
            }
        };
        animate();

        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [active]);

    if (!active) return null;
    return (
        <canvas ref={canvasRef} style={{
            position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none',
        }} />
    );
}

// ── Smart Prize Calculation ─────────────────────────────────
function calculateSmartPrize(totalPool) {
    // Probability distribution:
    // 75% → ~50%, 20% → up to 55%, 5% → up to 60%
    const roll = Math.random();
    let percentage;
    if (roll < 0.75) {
        // Around 50% (48-52%)
        percentage = 0.48 + Math.random() * 0.04;
    } else if (roll < 0.95) {
        // Up to 55% (50-55%)
        percentage = 0.50 + Math.random() * 0.05;
    } else {
        // Up to 60% (55-60%)
        percentage = 0.55 + Math.random() * 0.05;
    }
    // Clamp 40%-60%
    percentage = Math.max(0.40, Math.min(0.60, percentage));
    return Math.round(totalPool * percentage);
}

// ── Distribution Presets ─────────────────────────────────────
const DISTRIBUTION_PRESETS = {
    1: [{ position: '1st', percentage: 100 }],
    2: [
        { position: '1st', percentage: 70 },
        { position: '2nd', percentage: 30 },
    ],
    3: [
        { position: '1st', percentage: 70 },
        { position: '2nd', percentage: 20 },
        { position: '3rd', percentage: 10 },
    ],
};

export default function PrizeCalculator() {
    const navigate = useNavigate();
    const { compId } = useParams();
    const { userData } = useAuth();

    // Input state
    const [numStudents, setNumStudents] = useState('');
    const [pricePerStudent, setPricePerStudent] = useState('');
    const [winnerCount, setWinnerCount] = useState(3);

    // Calculated state
    const [generatedPrize, setGeneratedPrize] = useState(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [isLocked, setIsLocked] = useState(false);

    // Competition data (if editing existing)
    const [competition, setCompetition] = useState(null);
    const [competitions, setCompetitions] = useState([]);
    const [selectedCompId, setSelectedCompId] = useState(compId || '');
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState({ type: '', text: '' });

    // Load competitions list
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'competitions'), snap => {
            const comps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            comps.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            setCompetitions(comps);
        });
        return () => unsub();
    }, []);

    // Load existing prize data if competition is selected
    useEffect(() => {
        if (!selectedCompId) { setCompetition(null); return; }
        const comp = competitions.find(c => c.id === selectedCompId);
        if (comp) {
            setCompetition(comp);
            if (comp.prizeData) {
                setNumStudents(String(comp.prizeData.numStudents || ''));
                setPricePerStudent(String(comp.prizeData.pricePerStudent || ''));
                setGeneratedPrize(comp.prizeData.generatedPrize || null);
                setWinnerCount(comp.prizeData.winnerCount || 3);
                setIsLocked(comp.prizeData.locked || false);
            }
        }
    }, [selectedCompId, competitions]);

    const totalPool = (parseInt(numStudents) || 0) * (parseInt(pricePerStudent) || 0);

    const handleGenerate = () => {
        if (totalPool <= 0 || isLocked) return;
        const prize = calculateSmartPrize(totalPool);
        setGeneratedPrize(prize);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
    };

    const handleRegenerate = () => {
        if (isLocked) return;
        handleGenerate();
    };

    const distribution = generatedPrize
        ? DISTRIBUTION_PRESETS[winnerCount].map(d => ({
            ...d,
            amount: Math.round((generatedPrize * d.percentage) / 100),
        }))
        : [];

    const handleLockAndSave = async () => {
        if (!selectedCompId || !generatedPrize) {
            setSaveMsg({ type: 'error', text: 'Select a competition and generate prize first.' });
            return;
        }
        if (isLocked) {
            setSaveMsg({ type: 'error', text: 'Prize is already locked for this competition.' });
            return;
        }

        setSaving(true);
        try {
            const prizeData = {
                numStudents: parseInt(numStudents) || 0,
                pricePerStudent: parseInt(pricePerStudent) || 0,
                totalPool,
                generatedPrize,
                winnerCount,
                distribution: distribution.map(d => ({ position: d.position, percentage: d.percentage, amount: d.amount })),
                locked: true,
                lockedAt: new Date().toISOString(),
                lockedBy: userData?.email || 'admin',
            };

            await setDoc(doc(db, 'competitions', selectedCompId), { prizeData }, { merge: true });
            setIsLocked(true);
            setSaveMsg({ type: 'success', text: '🔒 Prize locked and saved to competition!' });
        } catch (err) {
            setSaveMsg({ type: 'error', text: 'Error: ' + err.message });
        }
        setSaving(false);
    };

    const prizePercentage = totalPool > 0 && generatedPrize ? ((generatedPrize / totalPool) * 100).toFixed(1) : 0;

    return (
        <div className="page-container fade-in">
            <ConfettiCanvas active={showConfetti} />

            <button onClick={() => navigate('/admin')} className="btn btn-secondary" style={{ marginBottom: '24px' }}>
                <FiArrowLeft /> Back to Dashboard
            </button>

            <div className="page-header">
                <h1 className="page-title">🏆 Prize Calculator</h1>
                <p className="page-subtitle">Auto-calculate prizes for competitions — fair, transparent, and locked before start</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '1000px' }}>
                {/* ═══ LEFT: INPUT PANEL ═══ */}
                <div className="glass-card" style={{ padding: '28px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiTarget size={18} /> Setup
                    </h3>

                    {/* Competition Selector */}
                    <div className="form-group">
                        <label className="input-label">📋 Link to Competition</label>
                        <select className="input" value={selectedCompId} onChange={e => { setSelectedCompId(e.target.value); setGeneratedPrize(null); setIsLocked(false); }}
                            disabled={isLocked}>
                            <option value="">— Select Competition —</option>
                            {competitions.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.title || 'Untitled'} {c.prizeData?.locked ? '🔒' : ''} ({c.date || 'No date'})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Students */}
                    <div className="form-group">
                        <label className="input-label"><FiUsers size={13} style={{ marginRight: '6px' }} />Number of Students</label>
                        <input type="number" className="input" placeholder="e.g., 100" min={1}
                            value={numStudents} onChange={e => setNumStudents(e.target.value)} disabled={isLocked} />
                    </div>

                    {/* Price per Student */}
                    <div className="form-group">
                        <label className="input-label"><FiDollarSign size={13} style={{ marginRight: '6px' }} />Price per Student (₹)</label>
                        <input type="number" className="input" placeholder="e.g., 10" min={1}
                            value={pricePerStudent} onChange={e => setPricePerStudent(e.target.value)} disabled={isLocked} />
                    </div>

                    {/* Total Pool Display */}
                    <div style={{
                        padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '16px',
                        background: 'var(--accent-gradient-light)', border: '1px solid var(--bg-glass-border)',
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                            Total Prize Pool
                        </div>
                        <div style={{
                            fontSize: '32px', fontWeight: 900,
                            background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>
                            ₹{totalPool.toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {numStudents || 0} students × ₹{pricePerStudent || 0}
                        </div>
                    </div>

                    {/* Winner Count */}
                    <div className="form-group">
                        <label className="input-label"><FiAward size={13} style={{ marginRight: '6px' }} />Winner Distribution</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {[1, 2, 3].map(n => (
                                <button key={n} type="button" onClick={() => !isLocked && setWinnerCount(n)}
                                    style={{
                                        flex: 1, padding: '12px 8px', borderRadius: 'var(--radius-md)', cursor: isLocked ? 'not-allowed' : 'pointer',
                                        border: winnerCount === n ? '2px solid var(--accent-primary)' : '1px solid var(--bg-glass-border)',
                                        background: winnerCount === n ? 'var(--accent-gradient-light)' : 'var(--bg-input)',
                                        textAlign: 'center', transition: 'all 0.2s ease',
                                    }}>
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: winnerCount === n ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                                        {n === 1 ? '🥇' : n === 2 ? '🥇🥈' : '🥇🥈🥉'}
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        {n} Winner{n > 1 ? 's' : ''}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Generate Button */}
                    <button onClick={handleGenerate} className="btn btn-primary btn-lg"
                        disabled={totalPool <= 0 || isLocked}
                        style={{ width: '100%', marginTop: '8px', fontSize: '15px', padding: '14px' }}>
                        {isLocked ? <><FiLock /> Prize Locked</> : <><FiZap /> Generate Prize</>}
                    </button>
                </div>

                {/* ═══ RIGHT: RESULT PANEL ═══ */}
                <div>
                    {/* Generated Prize Display */}
                    {generatedPrize !== null && (
                        <div className="glass-card" style={{
                            padding: '28px', textAlign: 'center', marginBottom: '16px',
                            border: isLocked ? '2px solid rgba(16,185,129,0.3)' : '1px solid var(--bg-glass-border)',
                            position: 'relative', overflow: 'hidden',
                        }}>
                            {/* Lock badge */}
                            {isLocked && (
                                <div style={{
                                    position: 'absolute', top: '12px', right: '12px',
                                    padding: '4px 10px', borderRadius: 'var(--radius-full)',
                                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                                    fontSize: '11px', fontWeight: 700, color: '#10b981',
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                }}>
                                    <FiLock size={11} /> Locked
                                </div>
                            )}

                            <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎉</div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                Total Prize for this Competition
                            </div>
                            <div style={{
                                fontSize: '48px', fontWeight: 900, lineHeight: 1,
                                background: 'linear-gradient(135deg, #7c3aed, #3b82f6, #10b981)',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                marginBottom: '8px',
                            }}>
                                ₹{generatedPrize.toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                {prizePercentage}% of ₹{totalPool.toLocaleString('en-IN')} pool
                            </div>

                            {/* Regenerate */}
                            {!isLocked && (
                                <button onClick={handleRegenerate} className="btn btn-secondary" style={{ fontSize: '12px' }}>
                                    <FiRefreshCw size={13} /> Regenerate
                                </button>
                            )}
                        </div>
                    )}

                    {/* Distribution Table */}
                    {distribution.length > 0 && (
                        <div className="glass-card" style={{ padding: '24px', marginBottom: '16px' }}>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FiTrendingUp size={16} /> Winner Distribution
                            </h3>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                {distribution.map((d, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '14px 18px', borderRadius: 'var(--radius-md)',
                                        background: i === 0 ? 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))' :
                                            i === 1 ? 'linear-gradient(135deg, rgba(148,163,184,0.08), rgba(148,163,184,0.02))' :
                                                'linear-gradient(135deg, rgba(180,83,9,0.08), rgba(180,83,9,0.02))',
                                        border: `1px solid ${i === 0 ? 'rgba(245,158,11,0.15)' : i === 1 ? 'rgba(148,163,184,0.15)' : 'rgba(180,83,9,0.15)'}`,
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ fontSize: '24px' }}>
                                                {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '14px' }}>{d.position} Place</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{d.percentage}% of prize</div>
                                            </div>
                                        </div>
                                        <div style={{
                                            fontSize: '22px', fontWeight: 900,
                                            color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#b45309',
                                        }}>
                                            ₹{d.amount.toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                ))}

                                {/* Total Bar */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '12px 18px', borderRadius: 'var(--radius-md)',
                                    background: 'var(--accent-gradient-light)', borderTop: '2px solid var(--accent-primary)',
                                    marginTop: '4px',
                                }}>
                                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)' }}>Total Distributed</div>
                                    <div style={{ fontWeight: 900, fontSize: '18px', color: 'var(--accent-primary)' }}>
                                        ₹{distribution.reduce((s, d) => s + d.amount, 0).toLocaleString('en-IN')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Lock & Save Button */}
                    {generatedPrize !== null && !isLocked && (
                        <button onClick={handleLockAndSave} className="btn btn-primary btn-lg" disabled={saving || !selectedCompId}
                            style={{
                                width: '100%', padding: '14px', fontSize: '15px',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                            }}>
                            {saving ? '⏳ Saving...' : <><FiLock /> Lock Prize & Save to Competition</>}
                        </button>
                    )}

                    {/* Save Message */}
                    {saveMsg.text && (
                        <div style={{
                            marginTop: '12px', padding: '12px 16px', borderRadius: 'var(--radius-md)',
                            background: saveMsg.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                            border: `1px solid ${saveMsg.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                            color: saveMsg.type === 'success' ? '#10b981' : '#ef4444',
                            fontSize: '13px', fontWeight: 600,
                        }}>
                            {saveMsg.text}
                        </div>
                    )}

                    {/* Summary Card */}
                    {selectedCompId && competition && (
                        <div className="glass-card" style={{ padding: '20px', marginTop: '16px' }}>
                            <h4 style={{ fontWeight: 800, fontSize: '13px', marginBottom: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                📊 Competition Summary
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {[
                                    { label: 'Competition', value: competition.title || 'Untitled', color: 'var(--text-primary)' },
                                    { label: 'Total Students', value: numStudents || '—', color: '#3b82f6' },
                                    { label: 'Entry Fee', value: `₹${pricePerStudent || 0}`, color: '#7c3aed' },
                                    { label: 'Total Pool', value: `₹${totalPool.toLocaleString('en-IN')}`, color: '#f59e0b' },
                                    { label: 'Generated Prize', value: generatedPrize ? `₹${generatedPrize.toLocaleString('en-IN')}` : '—', color: '#10b981' },
                                    { label: 'Distribution', value: `${winnerCount} Winner${winnerCount > 1 ? 's' : ''}`, color: '#ec4899' },
                                    { label: 'Status', value: isLocked ? '🔒 Locked' : '🔓 Open', color: isLocked ? '#10b981' : '#f59e0b' },
                                    { label: 'Date', value: competition.date || '—', color: 'var(--text-muted)' },
                                ].map((item, i) => (
                                    <div key={i} style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)' }}>
                                        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '2px' }}>{item.label}</div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: item.color }}>{item.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ RULES INFO ═══ */}
            <div className="glass-card" style={{ maxWidth: '1000px', padding: '20px', marginTop: '24px' }}>
                <h4 style={{ fontWeight: 800, fontSize: '14px', marginBottom: '12px' }}>📜 Prize Rules</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                    {[
                        { icon: '🎯', text: 'Prize is always between 40% and 60% of Total Pool' },
                        { icon: '📊', text: '75% chance → ~50% | 20% chance → ~55% | 5% chance → ~60%' },
                        { icon: '🔒', text: 'Once locked, prize cannot be changed for that competition' },
                        { icon: '💰', text: 'Distribution always stays within the generated prize amount' },
                        { icon: '🏆', text: 'Winners receive prizes after competition ends' },
                        { icon: '📝', text: 'New prize can only be generated for new competitions' },
                    ].map((r, i) => (
                        <div key={i} style={{
                            padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-input)', fontSize: '12px', color: 'var(--text-secondary)',
                            display: 'flex', alignItems: 'flex-start', gap: '8px',
                        }}>
                            <span style={{ fontSize: '16px', flexShrink: 0 }}>{r.icon}</span>
                            <span>{r.text}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
