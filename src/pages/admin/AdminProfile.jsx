import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { FiUser, FiShield, FiDroplet, FiSave, FiCheck, FiAlertCircle, FiImage, FiMail, FiPhone, FiEdit3, FiCreditCard, FiEye, FiEyeOff, FiKey, FiTrash2, FiAlertTriangle } from 'react-icons/fi';

const ACCENT_PRESETS = [
    { name: 'Ocean Blue', value: '#2563eb' },
    { name: 'Violet', value: '#7c3aed' },
    { name: 'Emerald', value: '#059669' },
    { name: 'Rose', value: '#e11d48' },
    { name: 'Amber', value: '#d97706' },
    { name: 'Cyan', value: '#0891b2' },
    { name: 'Fuchsia', value: '#c026d3' },
    { name: 'Teal', value: '#0d9488' },
];

export default function AdminProfile() {
    const { user, userData, institute, changePassword, updateInstitute } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');

    // Profile state
    const [profileName, setProfileName] = useState('');
    const [instituteName, setInstituteName] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMsg, setProfileMsg] = useState('');

    // Security state
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [securitySaving, setSecuritySaving] = useState(false);
    const [securityMsg, setSecurityMsg] = useState({ type: '', text: '' });

    // Branding state
    const [accentColor, setAccentColor] = useState('#2563eb');
    const [logoUrl, setLogoUrl] = useState('');
    const [brandingSaving, setBrandingSaving] = useState(false);
    const [brandingMsg, setBrandingMsg] = useState('');

    // Payment state
    const [razorpayKeyId, setRazorpayKeyId] = useState('');
    const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
    const [paymentMode, setPaymentMode] = useState('test');
    const [showSecret, setShowSecret] = useState(false);
    const [paymentSaving, setPaymentSaving] = useState(false);
    const [paymentMsg, setPaymentMsg] = useState({ type: '', text: '' });
    const [paymentLoaded, setPaymentLoaded] = useState(false);
    const [activeGateway, setActiveGateway] = useState('razorpay');
    const [stripePublicKey, setStripePublicKey] = useState('');
    const [stripeSecretKey, setStripeSecretKey] = useState('');
    const [showStripeSecret, setShowStripeSecret] = useState(false);
    // Cashfree
    const [cashfreeAppId, setCashfreeAppId] = useState('');
    const [cashfreeSecretKey, setCashfreeSecretKey] = useState('');
    const [showCashfreeSecret, setShowCashfreeSecret] = useState(false);
    // PayU
    const [payuMerchantKey, setPayuMerchantKey] = useState('');
    const [payuMerchantSalt, setPayuMerchantSalt] = useState('');
    const [showPayuSalt, setShowPayuSalt] = useState(false);

    // Danger Zone state
    const [dangerStep, setDangerStep] = useState(0); // 0=idle, 1=confirm1, 2=type, 3=final
    const [dangerConfirmText, setDangerConfirmText] = useState('');
    const [dangerDeleting, setDangerDeleting] = useState(false);
    const [dangerMsg, setDangerMsg] = useState({ type: '', text: '' });

    // Load initial data
    useEffect(() => {
        if (userData) {
            setProfileName(userData.name || '');
            setContactEmail(userData.email || '');
        }
        if (institute) {
            setInstituteName(institute.name || '');
            setContactPhone(institute.contactPhone || '');
            setAccentColor(institute.accentColor || '#2563eb');
            setLogoUrl(institute.logoUrl || '');
        }
    }, [userData, institute]);

    // Load payment settings when payment tab is selected
    useEffect(() => {
        if (activeTab === 'payment' && !paymentLoaded && userData?.instituteId) {
            (async () => {
                try {
                    const payDoc = await getDoc(doc(db, 'institutes', userData.instituteId, 'settings', 'payment'));
                    if (payDoc.exists()) {
                        const data = payDoc.data();
                        setRazorpayKeyId(data.razorpayKeyId || '');
                        setRazorpayKeySecret(data.razorpayKeySecret || '');
                        setPaymentMode(data.paymentMode || 'test');
                        setActiveGateway(data.activeGateway || 'razorpay');
                        setStripePublicKey(data.stripePublicKey || '');
                        setStripeSecretKey(data.stripeSecretKey || '');
                        setCashfreeAppId(data.cashfreeAppId || '');
                        setCashfreeSecretKey(data.cashfreeSecretKey || '');
                        setPayuMerchantKey(data.payuMerchantKey || '');
                        setPayuMerchantSalt(data.payuMerchantSalt || '');
                    }
                    setPaymentLoaded(true);
                } catch (err) {
                    console.error('Error loading payment settings:', err);
                    setPaymentLoaded(true);
                }
            })();
        }
    }, [activeTab, paymentLoaded, userData]);

    // Save profile
    const handleSaveProfile = async () => {
        setProfileSaving(true);
        setProfileMsg('');
        try {
            await setDoc(doc(db, 'users', user.uid), { name: profileName }, { merge: true });
            await updateInstitute({ name: instituteName, contactPhone, contactEmail });
            setProfileMsg('Profile updated successfully!');
            setTimeout(() => setProfileMsg(''), 3000);
        } catch (err) {
            setProfileMsg('Error: ' + err.message);
        }
        setProfileSaving(false);
    };

    // Change password
    const handleChangePassword = async () => {
        if (newPw !== confirmPw) {
            setSecurityMsg({ type: 'error', text: 'Passwords do not match!' });
            return;
        }
        if (newPw.length < 6) {
            setSecurityMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
            return;
        }
        setSecuritySaving(true);
        setSecurityMsg({ type: '', text: '' });
        try {
            await changePassword(currentPw, newPw);
            setSecurityMsg({ type: 'success', text: 'Password changed successfully!' });
            setCurrentPw(''); setNewPw(''); setConfirmPw('');
        } catch (err) {
            setSecurityMsg({ type: 'error', text: err.message || 'Failed to change password' });
        }
        setSecuritySaving(false);
    };

    // Save branding
    const handleSaveBranding = async () => {
        setBrandingSaving(true);
        setBrandingMsg('');
        try {
            await updateInstitute({ accentColor, logoUrl });
            setBrandingMsg('Branding saved!');
            setTimeout(() => setBrandingMsg(''), 3000);
        } catch (err) {
            setBrandingMsg('Error: ' + err.message);
        }
        setBrandingSaving(false);
    };

    // Save payment settings
    const handleSavePayment = async () => {
        if (activeGateway === 'razorpay' && !razorpayKeyId.trim()) {
            setPaymentMsg({ type: 'error', text: 'Razorpay Key ID is required.' }); return;
        }
        if (activeGateway === 'stripe' && !stripePublicKey.trim()) {
            setPaymentMsg({ type: 'error', text: 'Stripe Publishable Key is required.' }); return;
        }
        if (activeGateway === 'cashfree' && !cashfreeAppId.trim()) {
            setPaymentMsg({ type: 'error', text: 'Cashfree App ID is required.' }); return;
        }
        if (activeGateway === 'payu' && !payuMerchantKey.trim()) {
            setPaymentMsg({ type: 'error', text: 'PayU Merchant Key is required.' }); return;
        }
        setPaymentSaving(true);
        setPaymentMsg({ type: '', text: '' });
        try {
            await setDoc(doc(db, 'institutes', userData.instituteId, 'settings', 'payment'), {
                activeGateway,
                razorpayKeyId: razorpayKeyId.trim(),
                razorpayKeySecret: razorpayKeySecret.trim(),
                stripePublicKey: stripePublicKey.trim(),
                stripeSecretKey: stripeSecretKey.trim(),
                cashfreeAppId: cashfreeAppId.trim(),
                cashfreeSecretKey: cashfreeSecretKey.trim(),
                payuMerchantKey: payuMerchantKey.trim(),
                payuMerchantSalt: payuMerchantSalt.trim(),
                paymentMode,
                updatedAt: new Date().toISOString(),
                updatedBy: user.uid,
            });
            setPaymentMsg({ type: 'success', text: 'Payment settings saved securely!' });
            setTimeout(() => setPaymentMsg({ type: '', text: '' }), 4000);
        } catch (err) {
            setPaymentMsg({ type: 'error', text: 'Error: ' + err.message });
        }
        setPaymentSaving(false);
    };

    // Danger Zone — Erase My Data
    const handleEraseMyData = async () => {
        if (!userData?.instituteId) return;
        setDangerDeleting(true);
        setDangerMsg({ type: '', text: '' });
        try {
            const instId = userData.instituteId;
            // Delete subcollections: students, settings, payments
            const subcollections = ['students', 'settings', 'payments', 'competitions', 'batches'];
            for (const sub of subcollections) {
                const snap = await getDocs(collection(db, 'institutes', instId, sub));
                const batch = writeBatch(db);
                snap.docs.forEach(d => batch.delete(d.ref));
                if (snap.docs.length > 0) await batch.commit();
            }
            // Delete events belonging to this institute
            const eventsSnap = await getDocs(collection(db, 'events'));
            const eventBatch = writeBatch(db);
            eventsSnap.docs.filter(d => d.data().instituteId === instId).forEach(d => eventBatch.delete(d.ref));
            await eventBatch.commit();
            // Delete institute doc
            await deleteDoc(doc(db, 'institutes', instId));
            // Delete user doc
            await deleteDoc(doc(db, 'users', user.uid));

            setDangerMsg({ type: 'success', text: 'All your data has been erased. You will be logged out.' });
            setDangerStep(0);
            // Auto logout after 3 seconds
            setTimeout(() => { window.location.href = '/'; }, 3000);
        } catch (err) {
            setDangerMsg({ type: 'error', text: 'Error: ' + err.message });
        }
        setDangerDeleting(false);
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: <FiUser size={16} /> },
        { id: 'security', label: 'Security', icon: <FiShield size={16} /> },
        { id: 'branding', label: 'Branding', icon: <FiDroplet size={16} /> },
        { id: 'payment', label: 'Payment', icon: <FiCreditCard size={16} /> },
        { id: 'danger', label: 'Danger Zone', icon: <FiAlertTriangle size={16} /> },
    ];

    return (
        <div className="page-container fade-in">
            <div style={{ marginBottom: '32px' }}>
                <h1 className="page-title">👤 Admin Profile</h1>
                <p className="page-subtitle">Manage your account, security, branding, and payment settings</p>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'var(--bg-glass)', padding: '4px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--bg-glass-border)', maxWidth: '600px', flexWrap: 'wrap' }}>
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            padding: '12px 16px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                            fontWeight: 700, fontSize: '13px', transition: 'all 0.2s ease', minWidth: '100px',
                            background: activeTab === t.id ? 'var(--accent-gradient)' : 'transparent',
                            color: activeTab === t.id ? '#fff' : 'var(--text-secondary)',
                        }}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* =================== PROFILE TAB =================== */}
            {activeTab === 'profile' && (
                <div className="glass-card" style={{ maxWidth: '600px', padding: '32px' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FiEdit3 /> Basic Information
                    </h2>

                    <div className="form-group">
                        <label className="input-label"><FiUser size={13} style={{ marginRight: '6px' }} />Your Name</label>
                        <input type="text" className="input" value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Your full name" />
                    </div>

                    <div className="form-group">
                        <label className="input-label"><FiEdit3 size={13} style={{ marginRight: '6px' }} />Institute Name</label>
                        <input type="text" className="input" value={instituteName} onChange={e => setInstituteName(e.target.value)} placeholder="Your institute name" />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="input-label"><FiMail size={13} style={{ marginRight: '6px' }} />Contact Email</label>
                            <input type="email" className="input" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="input-label"><FiPhone size={13} style={{ marginRight: '6px' }} />Contact Phone</label>
                            <input type="tel" className="input" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+91 XXXXXXXXXX" />
                        </div>
                    </div>

                    {profileMsg && (
                        <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)', color: 'var(--accent-success)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FiCheck /> {profileMsg}
                        </div>
                    )}

                    <button onClick={handleSaveProfile} className="btn btn-primary" disabled={profileSaving}
                        style={{ width: '100%', padding: '14px', marginTop: '8px' }}>
                        {profileSaving ? 'Saving...' : <><FiSave /> Save Profile</>}
                    </button>
                </div>
            )}

            {/* =================== SECURITY TAB =================== */}
            {activeTab === 'security' && (
                <div className="glass-card" style={{ maxWidth: '600px', padding: '32px' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FiShield /> Change Password
                    </h2>

                    <div className="form-group">
                        <label className="input-label">Current Password</label>
                        <input type="password" className="input" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••" />
                    </div>
                    <div className="form-group">
                        <label className="input-label">New Password</label>
                        <input type="password" className="input" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 6 characters" />
                    </div>
                    <div className="form-group">
                        <label className="input-label">Confirm New Password</label>
                        <input type="password" className="input" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Re-enter new password" />
                    </div>

                    {securityMsg.text && (
                        <div style={{
                            padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px',
                            background: securityMsg.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(5,150,105,0.1)',
                            border: `1px solid ${securityMsg.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(5,150,105,0.3)'}`,
                            color: securityMsg.type === 'error' ? 'var(--accent-danger)' : 'var(--accent-success)',
                            fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                        }}>
                            {securityMsg.type === 'error' ? <FiAlertCircle /> : <FiCheck />} {securityMsg.text}
                        </div>
                    )}

                    <button onClick={handleChangePassword} className="btn btn-primary" disabled={securitySaving || !currentPw || !newPw}
                        style={{ width: '100%', padding: '14px', marginTop: '8px' }}>
                        {securitySaving ? 'Changing...' : <><FiShield /> Change Password</>}
                    </button>
                </div>
            )}

            {/* =================== BRANDING TAB =================== */}
            {activeTab === 'branding' && (
                <div className="glass-card" style={{ maxWidth: '600px', padding: '32px' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FiDroplet /> Institute Branding
                    </h2>

                    <div className="form-group">
                        <label className="input-label">Accent Color</label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                            {ACCENT_PRESETS.map(p => (
                                <button key={p.value} onClick={() => setAccentColor(p.value)} title={p.name}
                                    style={{
                                        width: '40px', height: '40px', borderRadius: 'var(--radius-md)', border: accentColor === p.value ? '3px solid var(--text-primary)' : '2px solid var(--bg-glass-border)',
                                        background: p.value, cursor: 'pointer', transition: 'all 0.2s ease',
                                        transform: accentColor === p.value ? 'scale(1.15)' : 'scale(1)',
                                        boxShadow: accentColor === p.value ? `0 0 12px ${p.value}60` : 'none',
                                    }} />
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                                style={{ width: '50px', height: '40px', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: 'transparent' }} />
                            <input type="text" className="input" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                                style={{ flex: 1, fontFamily: 'var(--font-mono)' }} placeholder="#2563eb" />
                        </div>
                    </div>

                    <div style={{ padding: '20px', borderRadius: 'var(--radius-lg)', marginBottom: '20px', background: `${accentColor}10`, border: `2px solid ${accentColor}30` }}>
                        <div style={{ fontWeight: 700, marginBottom: '8px', color: accentColor }}>Preview</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ padding: '6px 14px', borderRadius: 'var(--radius-full)', background: accentColor, color: '#fff', fontSize: '12px', fontWeight: 700 }}>Primary Button</span>
                            <span style={{ padding: '6px 14px', borderRadius: 'var(--radius-full)', background: `${accentColor}15`, color: accentColor, fontSize: '12px', fontWeight: 700, border: `1px solid ${accentColor}30` }}>Secondary</span>
                            <span style={{ padding: '6px 14px', borderRadius: 'var(--radius-full)', background: 'var(--bg-input)', fontSize: '12px', fontWeight: 700, color: accentColor }}>Badge</span>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="input-label"><FiImage size={13} style={{ marginRight: '6px' }} />Logo URL</label>
                        <input type="url" className="input" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" />
                        {logoUrl && (
                            <div style={{ marginTop: '12px', padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                <img src={logoUrl} alt="Logo Preview" style={{ maxWidth: '120px', maxHeight: '80px', objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
                            </div>
                        )}
                    </div>

                    {brandingMsg && (
                        <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)', color: 'var(--accent-success)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FiCheck /> {brandingMsg}
                        </div>
                    )}

                    <button onClick={handleSaveBranding} className="btn btn-primary" disabled={brandingSaving}
                        style={{ width: '100%', padding: '14px', marginTop: '8px' }}>
                        {brandingSaving ? 'Saving...' : <><FiSave /> Save Branding</>}
                    </button>
                </div>
            )}

            {/* =================== PAYMENT TAB =================== */}
            {activeTab === 'payment' && (
                <div className="glass-card" style={{ maxWidth: '600px', padding: '32px' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FiCreditCard /> Payment Gateway Settings
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
                        Configure your Razorpay credentials securely. These keys are stored in your institute's private settings in Firebase.
                    </p>

                    {/* Security notice */}
                    <div style={{
                        padding: '14px 18px', borderRadius: 'var(--radius-md)', marginBottom: '24px',
                        background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)',
                        display: 'flex', alignItems: 'flex-start', gap: '10px',
                    }}>
                        <FiShield size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--accent-primary)', marginBottom: '4px' }}>🔒 Secure Storage</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                Your API keys are stored in a secure Firestore subcollection linked to your institute ID. Only authenticated admins can access them.
                            </div>
                        </div>
                    </div>

                    {/* Gateway Selector */}
                    <div className="form-group">
                        <label className="input-label">Select Payment Gateway</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                            {[{ id: 'razorpay', label: '💳 Razorpay', desc: 'India' },
                            { id: 'stripe', label: '🌍 Stripe', desc: 'Global' },
                            { id: 'cashfree', label: '💰 Cashfree', desc: 'India' },
                            { id: 'payu', label: '🏦 PayU', desc: 'India' }].map(g => (
                                <button key={g.id} onClick={() => setActiveGateway(g.id)}
                                    style={{
                                        padding: '14px', borderRadius: 'var(--radius-md)',
                                        border: activeGateway === g.id ? '2px solid var(--accent-primary)' : '1px solid var(--bg-glass-border)',
                                        background: activeGateway === g.id ? 'var(--accent-gradient-light)' : 'var(--bg-input)',
                                        cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s ease',
                                    }}>
                                    <div style={{ fontWeight: 700, fontSize: '13px', color: activeGateway === g.id ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{g.label}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{g.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Mode selector */}
                    <div className="form-group">
                        <label className="input-label">Environment Mode</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {[{ id: 'test', label: '🧪 Test Mode', desc: 'For development' }, { id: 'live', label: '🟢 Live Mode', desc: 'Real payments' }].map(m => (
                                <button key={m.id} onClick={() => setPaymentMode(m.id)}
                                    style={{
                                        flex: 1, padding: '14px', borderRadius: 'var(--radius-md)', border: paymentMode === m.id ? '2px solid var(--accent-primary)' : '1px solid var(--bg-glass-border)',
                                        background: paymentMode === m.id ? 'var(--accent-gradient-light)' : 'var(--bg-input)',
                                        cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s ease',
                                    }}>
                                    <div style={{ fontWeight: 700, fontSize: '13px', color: paymentMode === m.id ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{m.label}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{m.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Razorpay Section */}
                    {(activeGateway === 'razorpay' || activeGateway === 'both') && (
                        <div style={{ padding: '18px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', marginBottom: '16px', border: '1px solid var(--bg-glass-border)' }}>
                            <div style={{ fontWeight: 800, fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Razorpay Config</div>
                            <div className="form-group">
                                <label className="input-label"><FiKey size={13} style={{ marginRight: '6px' }} />Key ID *</label>
                                <input type="text" className="input" value={razorpayKeyId} onChange={e => setRazorpayKeyId(e.target.value)}
                                    placeholder={paymentMode === 'test' ? 'rzp_test_xxxxxxxxxxxx' : 'rzp_live_xxxxxxxxxxxx'}
                                    style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="input-label"><FiKey size={13} style={{ marginRight: '6px' }} />Key Secret</label>
                                <div style={{ position: 'relative' }}>
                                    <input type={showSecret ? 'text' : 'password'} className="input" value={razorpayKeySecret}
                                        onChange={e => setRazorpayKeySecret(e.target.value)}
                                        placeholder="Enter your secret key"
                                        style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', paddingRight: '50px' }} />
                                    <button onClick={() => setShowSecret(!showSecret)}
                                        style={{
                                            position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                                            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '8px',
                                        }}>
                                        {showSecret ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stripe Section */}
                    {(activeGateway === 'stripe' || activeGateway === 'both') && (
                        <div style={{ padding: '18px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', marginBottom: '16px', border: '1px solid var(--bg-glass-border)' }}>
                            <div style={{ fontWeight: 800, fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stripe Config</div>
                            <div className="form-group">
                                <label className="input-label"><FiKey size={13} style={{ marginRight: '6px' }} />Publishable Key *</label>
                                <input type="text" className="input" value={stripePublicKey} onChange={e => setStripePublicKey(e.target.value)}
                                    placeholder={paymentMode === 'test' ? 'pk_test_xxxxxxxxxxxx' : 'pk_live_xxxxxxxxxxxx'}
                                    style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="input-label"><FiKey size={13} style={{ marginRight: '6px' }} />Secret Key</label>
                                <div style={{ position: 'relative' }}>
                                    <input type={showStripeSecret ? 'text' : 'password'} className="input" value={stripeSecretKey}
                                        onChange={e => setStripeSecretKey(e.target.value)}
                                        placeholder="Enter your Stripe secret key"
                                        style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', paddingRight: '50px' }} />
                                    <button onClick={() => setShowStripeSecret(!showStripeSecret)}
                                        style={{
                                            position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                                            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '8px',
                                        }}>
                                        {showStripeSecret ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Cashfree Section */}
                    {activeGateway === 'cashfree' && (
                        <div style={{ padding: '18px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', marginBottom: '16px', border: '1px solid var(--bg-glass-border)' }}>
                            <div style={{ fontWeight: 800, fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cashfree Config</div>
                            <div className="form-group">
                                <label className="input-label"><FiKey size={13} style={{ marginRight: '6px' }} />App ID *</label>
                                <input type="text" className="input" value={cashfreeAppId} onChange={e => setCashfreeAppId(e.target.value)}
                                    placeholder="Your Cashfree App ID"
                                    style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="input-label"><FiKey size={13} style={{ marginRight: '6px' }} />Secret Key</label>
                                <div style={{ position: 'relative' }}>
                                    <input type={showCashfreeSecret ? 'text' : 'password'} className="input" value={cashfreeSecretKey}
                                        onChange={e => setCashfreeSecretKey(e.target.value)}
                                        placeholder="Enter your Cashfree secret key"
                                        style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', paddingRight: '50px' }} />
                                    <button onClick={() => setShowCashfreeSecret(!showCashfreeSecret)}
                                        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '8px' }}>
                                        {showCashfreeSecret ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PayU Section */}
                    {activeGateway === 'payu' && (
                        <div style={{ padding: '18px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', marginBottom: '16px', border: '1px solid var(--bg-glass-border)' }}>
                            <div style={{ fontWeight: 800, fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PayU Config</div>
                            <div className="form-group">
                                <label className="input-label"><FiKey size={13} style={{ marginRight: '6px' }} />Merchant Key *</label>
                                <input type="text" className="input" value={payuMerchantKey} onChange={e => setPayuMerchantKey(e.target.value)}
                                    placeholder="Your PayU Merchant Key"
                                    style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="input-label"><FiKey size={13} style={{ marginRight: '6px' }} />Merchant Salt</label>
                                <div style={{ position: 'relative' }}>
                                    <input type={showPayuSalt ? 'text' : 'password'} className="input" value={payuMerchantSalt}
                                        onChange={e => setPayuMerchantSalt(e.target.value)}
                                        placeholder="Enter your PayU salt"
                                        style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', paddingRight: '50px' }} />
                                    <button onClick={() => setShowPayuSalt(!showPayuSalt)}
                                        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '8px' }}>
                                        {showPayuSalt ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {paymentMsg.text && (
                        <div style={{
                            padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px',
                            background: paymentMsg.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(5,150,105,0.1)',
                            border: `1px solid ${paymentMsg.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(5,150,105,0.3)'}`,
                            color: paymentMsg.type === 'error' ? 'var(--accent-danger)' : 'var(--accent-success)',
                            fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                        }}>
                            {paymentMsg.type === 'error' ? <FiAlertCircle /> : <FiCheck />} {paymentMsg.text}
                        </div>
                    )}

                    <button onClick={handleSavePayment} className="btn btn-primary" disabled={paymentSaving}
                        style={{ width: '100%', padding: '14px', marginTop: '8px' }}>
                        {paymentSaving ? 'Saving...' : <><FiSave /> Save Payment Settings</>}
                    </button>
                </div>
            )}

            {/* =================== DANGER ZONE TAB =================== */}
            {activeTab === 'danger' && (
                <div className="glass-card" style={{ maxWidth: '600px', padding: '32px' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-danger)' }}>
                        <FiAlertTriangle /> Danger Zone
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px', lineHeight: 1.6 }}>
                        ⚠️ This section contains irreversible actions. <strong>Erase My Data</strong> will permanently delete your institute, students, events, competitions, payments, and user data. This action <strong>cannot be undone</strong>.
                    </p>

                    <div style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '2px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)' }}>
                        <div style={{ fontWeight: 800, fontSize: '16px', color: '#ef4444', marginBottom: '8px' }}>🗑️ Erase My Data</div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.6 }}>
                            This will permanently delete <strong>only your data</strong>: your institute, all students, events, competitions, batches, payment records, and your user account. Other admins' data will NOT be affected.
                        </p>

                        {dangerMsg.text && (
                            <div style={{
                                padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px',
                                background: dangerMsg.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(5,150,105,0.1)',
                                border: `1px solid ${dangerMsg.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(5,150,105,0.3)'}`,
                                color: dangerMsg.type === 'error' ? '#ef4444' : 'var(--accent-success)',
                                fontSize: '13px', fontWeight: 600,
                            }}>
                                {dangerMsg.text}
                            </div>
                        )}

                        {/* Step 0: Initial Button */}
                        {dangerStep === 0 && (
                            <button onClick={() => setDangerStep(1)}
                                style={{
                                    width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', border: '2px solid rgba(239,68,68,0.4)',
                                    background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer',
                                    fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                }}>
                                <FiTrash2 size={16} /> Erase My Data
                            </button>
                        )}

                        {/* Step 1: First Confirmation */}
                        {dangerStep === 1 && (
                            <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <p style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444', marginBottom: '12px' }}>⚠️ Are you sure you want to delete ALL your data?</p>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>This is permanent and cannot be reversed.</p>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => setDangerStep(0)}
                                        style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-glass-border)', background: 'var(--bg-input)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>
                                        Cancel
                                    </button>
                                    <button onClick={() => setDangerStep(2)}
                                        style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>
                                        Yes, Continue
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Type CONFIRM DELETE */}
                        {dangerStep === 2 && (
                            <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <p style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444', marginBottom: '8px' }}>Type "CONFIRM DELETE" to proceed:</p>
                                <input type="text" value={dangerConfirmText} onChange={e => setDangerConfirmText(e.target.value)}
                                    placeholder="CONFIRM DELETE"
                                    style={{
                                        width: '100%', padding: '12px', borderRadius: 'var(--radius-md)',
                                        border: '2px solid rgba(239,68,68,0.3)', background: 'var(--bg-input)',
                                        color: 'var(--text-primary)', fontSize: '14px', fontWeight: 700, textAlign: 'center',
                                        letterSpacing: '2px', boxSizing: 'border-box', outline: 'none',
                                    }} />
                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                    <button onClick={() => { setDangerStep(0); setDangerConfirmText(''); }}
                                        style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-glass-border)', background: 'var(--bg-input)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>
                                        Cancel
                                    </button>
                                    <button onClick={() => { if (dangerConfirmText === 'CONFIRM DELETE') setDangerStep(3); }}
                                        disabled={dangerConfirmText !== 'CONFIRM DELETE'}
                                        style={{
                                            flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', border: 'none',
                                            background: dangerConfirmText === 'CONFIRM DELETE' ? '#ef4444' : 'rgba(239,68,68,0.3)',
                                            color: '#fff', cursor: dangerConfirmText === 'CONFIRM DELETE' ? 'pointer' : 'not-allowed',
                                            fontWeight: 700, fontSize: '12px',
                                        }}>
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Final Confirmation */}
                        {dangerStep === 3 && (
                            <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.4)' }}>
                                <p style={{ fontSize: '14px', fontWeight: 800, color: '#ef4444', marginBottom: '8px', textAlign: 'center' }}>🚨 FINAL WARNING 🚨</p>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', textAlign: 'center', lineHeight: 1.6 }}>
                                    This will permanently erase ALL your institute data. Click "ERASE EVERYTHING" to proceed. This cannot be undone.
                                </p>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => { setDangerStep(0); setDangerConfirmText(''); }}
                                        style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-glass-border)', background: 'var(--bg-input)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>
                                        ← Go Back
                                    </button>
                                    <button onClick={handleEraseMyData} disabled={dangerDeleting}
                                        style={{
                                            flex: 1, padding: '12px', borderRadius: 'var(--radius-md)', border: 'none',
                                            background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: '#fff',
                                            cursor: dangerDeleting ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '12px',
                                        }}>
                                        {dangerDeleting ? '⏳ ERASING...' : '🗑️ ERASE EVERYTHING'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
