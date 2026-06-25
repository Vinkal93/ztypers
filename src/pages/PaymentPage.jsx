import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import usePayment from '../hooks/usePayment';
import { FiArrowLeft, FiCreditCard, FiCalendar, FiClock, FiDollarSign, FiShield, FiCheckCircle, FiDownload } from 'react-icons/fi';

const downloadReceipt = ({ eventTitle, amount, paymentId, name, email, phone }) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow popups to download the receipt');
        return;
    }
    const date = new Date().toLocaleString();
    const receiptHtml = `
        <html>
        <head>
            <title>Payment Receipt - Z Typers</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    padding: 40px;
                    color: #333;
                    background-color: #fff;
                }
                .receipt-container {
                    max-width: 600px;
                    margin: 0 auto;
                    border: 1px solid #e0e0e0;
                    padding: 30px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }
                .header {
                    text-align: center;
                    border-bottom: 2px solid #7c3aed;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .logo {
                    font-size: 28px;
                    font-weight: 800;
                    color: #7c3aed;
                    margin-bottom: 5px;
                }
                .title {
                    font-size: 16px;
                    color: #666;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .section {
                    margin-bottom: 25px;
                }
                .section-title {
                    font-weight: 700;
                    font-size: 14px;
                    color: #7c3aed;
                    border-bottom: 1px solid #f0f0f0;
                    padding-bottom: 5px;
                    margin-bottom: 12px;
                    text-transform: uppercase;
                }
                .row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    font-size: 14px;
                }
                .label {
                    color: #666;
                }
                .value {
                    font-weight: 600;
                    color: #111;
                }
                .value.mono {
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 13px;
                }
                .total-row {
                    border-top: 2px dashed #e0e0e0;
                    padding-top: 15px;
                    margin-top: 15px;
                }
                .total-label {
                    font-size: 16px;
                    font-weight: 700;
                }
                .total-value {
                    font-size: 20px;
                    font-weight: 800;
                    color: #10b981;
                }
                .footer {
                    text-align: center;
                    margin-top: 40px;
                    font-size: 12px;
                    color: #999;
                    border-top: 1px solid #f0f0f0;
                    padding-top: 15px;
                }
                .badge {
                    background-color: #d1fae5;
                    color: #065f46;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 700;
                    display: inline-block;
                }
                @media print {
                    body { padding: 0; }
                    .receipt-container { 
                        border: none; 
                        box-shadow: none; 
                        max-width: 100%;
                    }
                }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <div class="header">
                    <div class="logo">⚡ Z TYPERS</div>
                    <div class="title">Official E-Receipt</div>
                </div>
                
                <div class="section">
                    <div class="section-title">Receipt Details</div>
                    <div class="row">
                        <span class="label">Date & Time</span>
                        <span class="value">${date}</span>
                    </div>
                    <div class="row">
                        <span class="label">Payment ID</span>
                        <span class="value mono">${paymentId}</span>
                    </div>
                    <div class="row">
                        <span class="label">Status</span>
                        <span class="value"><span class="badge">SUCCESSFUL</span></span>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">User Details</div>
                    <div class="row">
                        <span class="label">Name</span>
                        <span class="value">${name}</span>
                    </div>
                    ${email ? `
                    <div class="row">
                        <span class="label">Email</span>
                        <span class="value">${email}</span>
                    </div>
                    ` : ''}
                    ${phone ? `
                    <div class="row">
                        <span class="label">Phone</span>
                        <span class="value">${phone}</span>
                    </div>
                    ` : ''}
                </div>

                <div class="section">
                    <div class="section-title">Item Details</div>
                    <div class="row">
                        <span class="label">Event/Competition</span>
                        <span class="value">${eventTitle}</span>
                    </div>
                    <div class="row">
                        <span class="label">Description</span>
                        <span class="value">Event Registration Fee</span>
                    </div>
                    
                    <div class="row total-row">
                        <span class="total-label">Total Amount Paid</span>
                        <span class="total-value">₹${amount}</span>
                    </div>
                </div>

                <div class="footer">
                    <p>Thank you for your registration!</p>
                    <p>This is a computer-generated receipt and does not require a physical signature.</p>
                    <p>© ${new Date().getFullYear()} Z Typers. All rights reserved.</p>
                </div>
            </div>
            <script>
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
    `;
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
};

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

            if (event.entryFee > 0) {
                if (!isPaymentConfigured) {
                    throw new Error('Payment gateway is not configured for this institute. Please contact the administrator.');
                }
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
            setSuccessData({
                eventTitle: event.title,
                amount: event.entryFee,
                paymentId,
                name: enrollForm.name.trim(),
                email: enrollForm.email.trim(),
                phone: enrollForm.phone.trim(),
            });
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
                    <button onClick={() => downloadReceipt(successData)} className="btn btn-secondary" style={{ width: '100%', padding: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <FiDownload /> Download Receipt
                    </button>
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
