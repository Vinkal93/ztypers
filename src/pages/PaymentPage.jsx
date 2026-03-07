import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import usePayment from '../hooks/usePayment';
import { FiArrowLeft, FiCreditCard, FiCalendar, FiClock, FiDollarSign, FiShield, FiCheckCircle } from 'react-icons/fi';

export default function PaymentPage() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [enrollForm, setEnrollForm] = useState({ name: '', email: '', phone: '' });
    const [paymentStatus, setPaymentStatus] = useState(null); // null, 'processing', 'success', 'error'
    const [errorMsg, setErrorMsg] = useState('');
    const [successData, setSuccessData] = useState(null);

    const instituteId = event?.instituteId || null;
    const { isPaymentConfigured, startRazorpayPayment, processing } = usePayment(instituteId);

    useEffect(() => {
        if (!eventId) return;
        (async () => {
            try {
                const snap = await getDoc(doc(db, 'events', eventId));
                if (snap.exists()) {
                    setEvent({ id: snap.id, ...snap.data() });
                }
            } catch (err) {
                console.error('Error fetching event:', err);
            }
            setLoading(false);
        })();
    }, [eventId]);

    const handlePayment = async () => {
        if (!enrollForm.name.trim()) {
            setErrorMsg('Please enter your name');
            return;
        }
        if (!event) return;

        setPaymentStatus('processing');
        setErrorMsg('');

        try {
            let paymentDocId = null;
            let paymentId = null;

            if (event.entryFee > 0 && isPaymentConfigured) {
                const result = await startRazorpayPayment({
                    amount: event.entryFee,
                    description: `Entry Fee - ${event.title}`,
                    prefillName: enrollForm.name.trim(),
                    prefillEmail: enrollForm.email.trim(),
                    prefillPhone: enrollForm.phone.trim(),
                    metadata: { eventId, eventTitle: event.title, type: 'event_enrollment' },
                });
                paymentDocId = result.paymentDocId;
                paymentId = result.paymentId;
            }

            // Save enrollment
            await addDoc(collection(db, 'event_enrollments'), {
                eventId,
                name: enrollForm.name.trim(),
                email: enrollForm.email.trim(),
                phone: enrollForm.phone.trim(),
                enrolledAt: new Date().toISOString(),
                paid: event.entryFee > 0,
                paymentId: paymentId || null,
                paymentDocId: paymentDocId || null,
                amount: event.entryFee || 0,
            });

            // Track enrollment locally
            const localEnrolled = JSON.parse(localStorage.getItem('ztypers_event_enrollments') || '[]');
            localEnrolled.push(eventId);
            localStorage.setItem('ztypers_event_enrollments', JSON.stringify(localEnrolled));

            setPaymentStatus('success');
            setSuccessData({ eventTitle: event.title, amount: event.entryFee, paymentId });
        } catch (err) {
            setPaymentStatus('error');
            if (err.message === 'Payment cancelled by user') {
                setErrorMsg('Payment cancelled');
            } else {
                setErrorMsg(err.message || 'Payment failed');
            }
        }
    };

    if (loading) {
        return (
            <div className="page-container fade-in" style={{ textAlign: 'center', paddingTop: '120px' }}>
                <div className="timer">Loading event...</div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="page-container fade-in" style={{ textAlign: 'center', paddingTop: '80px' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Event Not Found</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>This event may have been removed</p>
                <button onClick={() => navigate('/events')} className="btn btn-primary">← Back to Events</button>
            </div>
        );
    }

    // Success view
    if (paymentStatus === 'success') {
        return (
            <div className="page-container fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
                <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '48px 36px', textAlign: 'center' }}>
                    <div style={{ fontSize: '72px', marginBottom: '16px' }}>✅</div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '26px', marginBottom: '8px' }}>
                        Payment Successful!
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '28px' }}>
                        You've been enrolled in <strong>{successData?.eventTitle}</strong>
                    </p>
                    <div style={{
                        background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '24px',
                    }}>
                        {successData?.amount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Amount Paid</span>
                                <span style={{ fontWeight: 800, fontSize: '18px', color: 'var(--accent-success)' }}>₹{successData.amount}</span>
                            </div>
                        )}
                        {successData?.paymentId && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Payment ID</span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    {successData.paymentId}
                                </span>
                            </div>
                        )}
                    </div>
                    <button onClick={() => navigate('/events')} className="btn btn-primary" style={{ width: '100%', padding: '14px' }}>
                        ← Back to Events
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container fade-in" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', minHeight: '70vh', paddingTop: '40px' }}>
            <div style={{ maxWidth: '520px', width: '100%' }}>
                {/* Back button */}
                <button onClick={() => navigate('/events')}
                    style={{
                        background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600,
                        marginBottom: '24px', padding: 0,
                    }}>
                    <FiArrowLeft size={16} /> Back to Events
                </button>

                {/* Event Summary Card */}
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '20px' }}>
                    <div style={{
                        background: 'var(--accent-gradient)', padding: '24px 28px',
                    }}>
                        <h1 style={{
                            fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '22px',
                            color: '#fff', margin: 0, lineHeight: 1.3,
                        }}>
                            {event.title}
                        </h1>
                        {event.description && (
                            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', marginTop: '8px', lineHeight: 1.5 }}>
                                {event.description}
                            </p>
                        )}
                    </div>
                    <div style={{ padding: '20px 28px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {[
                                { icon: <FiCalendar size={14} />, label: event.eventDate ? new Date(event.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBA' },
                                { icon: <FiClock size={14} />, label: event.eventTime || 'TBA' },
                                { icon: <FiDollarSign size={14} />, label: event.entryFee > 0 ? `₹${event.entryFee}` : 'Free' },
                                { icon: <FiShield size={14} />, label: event.difficulty || 'Medium' },
                            ].map((info, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)',
                                    fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600,
                                }}>
                                    {info.icon} {info.label}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Payment / Enrollment Form */}
                <div className="glass-card" style={{ padding: '28px' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiCreditCard /> {event.entryFee > 0 ? 'Complete Payment' : 'Enroll'}
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Your Name *</label>
                            <input type="text" className="input" placeholder="Enter your name" value={enrollForm.name}
                                onChange={e => setEnrollForm(p => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Email (optional)</label>
                            <input type="email" className="input" placeholder="your@email.com" value={enrollForm.email}
                                onChange={e => setEnrollForm(p => ({ ...p, email: e.target.value }))} />
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Phone (optional)</label>
                            <input type="tel" className="input" placeholder="+91 XXXXXXXXXX" value={enrollForm.phone}
                                onChange={e => setEnrollForm(p => ({ ...p, phone: e.target.value }))} />
                        </div>
                    </div>

                    {/* Price Summary */}
                    {event.entryFee > 0 && (
                        <div style={{
                            padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px',
                            background: 'var(--bg-input)', border: '1px solid var(--bg-glass-border)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Entry Fee</span>
                                <span style={{ fontSize: '24px', fontWeight: 900, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                    ₹{event.entryFee}
                                </span>
                            </div>
                        </div>
                    )}

                    {errorMsg && (
                        <div style={{
                            padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px',
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                            color: 'var(--accent-danger)', fontSize: '13px', fontWeight: 600,
                        }}>
                            ❌ {errorMsg}
                        </div>
                    )}

                    <button onClick={handlePayment} className="btn btn-primary"
                        disabled={processing || paymentStatus === 'processing' || !enrollForm.name.trim()}
                        style={{
                            width: '100%', padding: '16px', fontSize: '15px', fontWeight: 700,
                            background: 'var(--accent-gradient)', borderRadius: 'var(--radius-md)',
                        }}>
                        {processing || paymentStatus === 'processing' ? (
                            '⏳ Processing...'
                        ) : event.entryFee > 0 ? (
                            <>💳 Pay ₹{event.entryFee} & Enroll</>
                        ) : (
                            <><FiCheckCircle style={{ marginRight: '6px' }} /> Enroll Now</>
                        )}
                    </button>

                    {/* Security note */}
                    <div style={{ textAlign: 'center', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <FiShield size={12} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Secure payment powered by configured gateway</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
