import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { FiAward, FiZap, FiTarget, FiUsers, FiDollarSign, FiCalendar, FiCheck, FiClock, FiTrash2, FiEdit2, FiX, FiAlertTriangle } from 'react-icons/fi';

export default function Winners() {
    const { user, isAdmin } = useAuth();
    const admin = user && isAdmin();
    const [winners, setWinners] = useState([]);
    const [selected, setSelected] = useState(null);
    const [editPayment, setEditPayment] = useState(null);
    const [paymentForm, setPaymentForm] = useState({ amountPaid: 0, paymentStatus: 'pending' });

    // Delete confirmation states
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteStep, setDeleteStep] = useState(0);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'winners'), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            setWinners(list);
        });
        return () => unsub();
    }, []);

    const formatDate = (iso) => {
        if (!iso) return '-';
        const d = new Date(iso);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // Payment management
    const openPaymentEdit = (w) => {
        setEditPayment(w);
        setPaymentForm({
            amountPaid: w.amountPaid || 0,
            paymentStatus: w.paymentStatus || 'pending',
        });
    };

    const savePayment = async () => {
        if (!editPayment) return;
        try {
            await updateDoc(doc(db, 'winners', editPayment.id), {
                amountPaid: paymentForm.amountPaid,
                paymentStatus: paymentForm.paymentStatus,
                paymentUpdatedAt: new Date().toISOString(),
            });
            setEditPayment(null);
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    // Multi-step delete
    const startDelete = (w) => {
        setDeleteTarget(w);
        setDeleteStep(1);
        setDeleteConfirmText('');
    };

    const cancelDelete = () => {
        setDeleteTarget(null);
        setDeleteStep(0);
        setDeleteConfirmText('');
    };

    const confirmDelete = async () => {
        if (deleteStep === 1) {
            setDeleteStep(2);
        } else if (deleteStep === 2) {
            if (deleteConfirmText !== 'DELETE') return;
            setDeleteStep(3);
        } else if (deleteStep === 3) {
            try {
                await deleteDoc(doc(db, 'winners', deleteTarget.id));
                cancelDelete();
            } catch (err) {
                alert('Error: ' + err.message);
            }
        }
    };

    const getPaymentBadge = (w) => {
        const status = w.paymentStatus || 'pending';
        if (status === 'paid') return { bg: 'rgba(5,150,105,0.1)', color: '#059669', border: 'rgba(5,150,105,0.3)', text: '✅ Paid', icon: <FiCheck size={12} /> };
        if (status === 'partial') return { bg: 'rgba(245,158,11,0.1)', color: '#d97706', border: 'rgba(245,158,11,0.3)', text: '⏳ Partial', icon: <FiClock size={12} /> };
        return { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.3)', text: '⏳ Pending', icon: <FiClock size={12} /> };
    };

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <h1 className="page-title">🏆 Hall of Fame</h1>
                <p className="page-subtitle">All past competition winners — with performance, prizes & payment status</p>
            </div>

            {/* Stats */}
            {winners.length > 0 && (
                <div className="grid-4" style={{ marginBottom: '24px' }}>
                    {[
                        { icon: <FiAward size={20} />, val: winners.length, label: 'Competitions', color: '#d97706' },
                        { icon: <FiDollarSign size={20} />, val: `₹${winners.reduce((s, w) => s + (w.prize || 0), 0)}`, label: 'Total Prizes', color: '#059669' },
                        { icon: <FiZap size={20} />, val: Math.max(...winners.map(w => w.wpm || 0)), label: 'Best WPM Ever', color: '#2563eb' },
                        { icon: <FiUsers size={20} />, val: winners.reduce((s, w) => s + (w.totalParticipants || 0), 0), label: 'Total Participants', color: '#7c3aed' },
                    ].map((s, i) => (
                        <div key={i} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px' }}>
                            <div style={{
                                width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
                                background: `${s.color}15`, color: s.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>{s.icon}</div>
                            <div>
                                <div className="stat-value" style={{ fontSize: '22px' }}>{s.val}</div>
                                <div className="stat-label">{s.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Payment Edit Modal */}
            {editPayment && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}
                    onClick={() => setEditPayment(null)}>
                    <div className="glass-card" style={{ maxWidth: '420px', width: '100%', padding: '32px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>💰 Payment for {editPayment.name}</h3>
                            <button onClick={() => setEditPayment(null)} className="btn-icon"><FiX size={18} /></button>
                        </div>
                        <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', marginBottom: '16px', fontSize: '13px' }}>
                            Prize: <strong>₹{editPayment.prize || 0}</strong> • Score: {editPayment.score} • WPM: {editPayment.wpm}
                        </div>
                        <div className="form-group">
                            <label className="input-label">Payment Status</label>
                            <select className="input" value={paymentForm.paymentStatus}
                                onChange={e => setPaymentForm({ ...paymentForm, paymentStatus: e.target.value })}>
                                <option value="pending">⏳ Pending</option>
                                <option value="partial">⏳ Partial Payment</option>
                                <option value="paid">✅ Fully Paid</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="input-label">Amount Paid (₹)</label>
                            <input type="number" className="input" value={paymentForm.amountPaid}
                                onChange={e => setPaymentForm({ ...paymentForm, amountPaid: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={savePayment} className="btn btn-primary" style={{ flex: 1 }}>
                                <FiCheck /> Save Payment
                            </button>
                            <button onClick={() => setEditPayment(null)} className="btn btn-secondary">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}
                    onClick={cancelDelete}>
                    <div className="glass-card" style={{ maxWidth: '440px', width: '100%', padding: '32px', border: '2px solid var(--accent-danger)' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <FiAlertTriangle size={48} style={{ color: 'var(--accent-danger)', marginBottom: '12px' }} />
                            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--accent-danger)' }}>
                                {deleteStep === 1 ? '⚠️ Are you sure?' : deleteStep === 2 ? '🔴 Final Confirmation' : '⏳ Deleting...'}
                            </h3>
                        </div>

                        {deleteStep === 1 && (
                            <>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', marginBottom: '20px' }}>
                                    You are about to delete <strong>{deleteTarget.name}</strong>'s winner record.
                                    This action <strong>cannot be undone</strong>. This data will be permanently removed from the website.
                                </p>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={confirmDelete} className="btn btn-danger" style={{ flex: 1 }}>
                                        <FiTrash2 /> Yes, Continue Delete
                                    </button>
                                    <button onClick={cancelDelete} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                                </div>
                            </>
                        )}

                        {deleteStep === 2 && (
                            <>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>
                                    Type <strong style={{ color: 'var(--accent-danger)' }}>DELETE</strong> below to confirm permanent deletion of <strong>{deleteTarget.name}</strong>'s record:
                                </p>
                                <input type="text" className="input" placeholder='Type "DELETE" here'
                                    value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)}
                                    style={{ textAlign: 'center', fontSize: '18px', fontWeight: 700, letterSpacing: '2px', marginBottom: '16px' }} />
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={confirmDelete} className="btn btn-danger" style={{ flex: 1 }}
                                        disabled={deleteConfirmText !== 'DELETE'}>
                                        <FiTrash2 /> Permanently Delete
                                    </button>
                                    <button onClick={cancelDelete} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                                </div>
                            </>
                        )}

                        {deleteStep === 3 && (
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                <p style={{ color: 'var(--accent-success)', fontWeight: 600, marginBottom: '12px' }}>✅ Record deleted successfully.</p>
                                <button onClick={cancelDelete} className="btn btn-secondary">Close</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Selected Winner Detail */}
            {selected && (
                <div className="glass-card" style={{ marginBottom: '24px', border: '2px solid var(--rank-gold)', textAlign: 'center', padding: '32px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏆</div>
                    <h2 style={{
                        fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 900,
                        background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                    }}>
                        {selected.name}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                        {formatDate(selected.date)} • {selected.totalParticipants} participants • {selected.difficulty || 'medium'}
                    </p>

                    <div className="grid-3" style={{ marginBottom: '20px' }}>
                        {[
                            { label: 'WPM', value: selected.wpm || 0, color: 'var(--accent-primary)' },
                            { label: 'Accuracy', value: `${selected.accuracy || 0}%`, color: 'var(--accent-success)' },
                            { label: 'Score', value: selected.score || 0, color: 'var(--rank-gold)' },
                            { label: 'Mistakes', value: selected.mistakes || 0, color: 'var(--accent-danger)' },
                            { label: 'Prize', value: selected.prize ? `₹${selected.prize}` : 'Free', color: '#059669' },
                            { label: 'Payment', value: (selected.paymentStatus || 'pending') === 'paid' ? '✅ Paid' : '⏳ Pending', color: (selected.paymentStatus || 'pending') === 'paid' ? '#059669' : '#ef4444' },
                        ].map((s, i) => (
                            <div key={i} style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: s.color }}>{s.value}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {(selected.runnerUp || selected.thirdPlace) && (
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {selected.runnerUp && (
                                <span style={{
                                    padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: '13px', fontWeight: 600,
                                    background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.3)', color: 'var(--rank-silver)'
                                }}>
                                    🥈 {selected.runnerUp.name} — {selected.runnerUp.wpm} WPM
                                </span>
                            )}
                            {selected.thirdPlace && (
                                <span style={{
                                    padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: '13px', fontWeight: 600,
                                    background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.3)', color: 'var(--rank-bronze)'
                                }}>
                                    🥉 {selected.thirdPlace.name} — {selected.thirdPlace.wpm} WPM
                                </span>
                            )}
                        </div>
                    )}

                    <button onClick={() => setSelected(null)} className="btn btn-secondary" style={{ marginTop: '16px' }}>Close</button>
                </div>
            )}

            {/* Winners Table */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bg-glass-border)' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>🏅 All Winners</h3>
                </div>
                {winners.length === 0 ? (
                    <div className="empty-state" style={{ padding: '60px' }}>
                        <div className="empty-state-icon">🏆</div>
                        <div className="empty-state-title">No Winners Yet</div>
                        <div className="empty-state-text">Winners will appear here after competitions end.</div>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>#</th><th>Winner</th><th>WPM</th><th>Accuracy</th><th>Score</th>
                                    <th>Prize</th><th>Payment</th><th>Difficulty</th><th>Date</th>
                                    {admin && <th>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {winners.map((w, i) => {
                                    const pb = getPaymentBadge(w);
                                    return (
                                        <tr key={w.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(w)}>
                                            <td style={{ fontWeight: 700, color: 'var(--rank-gold)' }}>{i + 1}</td>
                                            <td style={{ fontWeight: 700 }}>🏆 {w.name}</td>
                                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-primary)' }}>{w.wpm || 0}</td>
                                            <td style={{ fontFamily: 'var(--font-mono)', color: (w.accuracy || 0) >= 90 ? 'var(--accent-success)' : 'var(--accent-warning)' }}>{w.accuracy || 0}%</td>
                                            <td style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--rank-gold)' }}>{w.score || 0}</td>
                                            <td style={{ fontWeight: 700, color: w.prize ? '#059669' : 'var(--text-muted)' }}>
                                                {w.prize ? `₹${w.prize}` : 'Free'}
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '11px', fontWeight: 600,
                                                    background: pb.bg, color: pb.color, border: `1px solid ${pb.border}`,
                                                    display: 'inline-flex', alignItems: 'center', gap: '4px'
                                                }}>
                                                    {pb.icon} {pb.text}
                                                    {w.amountPaid > 0 && w.paymentStatus !== 'paid' && ` (₹${w.amountPaid})`}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '3px 8px', borderRadius: 'var(--radius-full)', fontSize: '11px', fontWeight: 600,
                                                    background: w.difficulty === 'easy' ? 'rgba(5,150,105,0.1)' : w.difficulty === 'hard' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                                    color: w.difficulty === 'easy' ? 'var(--accent-success)' : w.difficulty === 'hard' ? 'var(--accent-danger)' : 'var(--accent-warning)'
                                                }}>
                                                    {w.difficulty === 'easy' ? '🟢' : w.difficulty === 'hard' ? '🔴' : '🟡'} {w.difficulty || 'medium'}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(w.date)}</td>
                                            {admin && (
                                                <td onClick={e => e.stopPropagation()}>
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <button onClick={() => openPaymentEdit(w)} className="btn btn-sm btn-secondary" title="Edit Payment">
                                                            <FiEdit2 size={13} />
                                                        </button>
                                                        <button onClick={() => startDelete(w)} className="btn btn-sm btn-danger" title="Delete">
                                                            <FiTrash2 size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
