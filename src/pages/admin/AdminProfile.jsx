import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { FiUser, FiShield, FiDroplet, FiSave, FiCheck, FiAlertCircle, FiImage, FiMail, FiPhone, FiEdit3 } from 'react-icons/fi';

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

    // Save profile
    const handleSaveProfile = async () => {
        setProfileSaving(true);
        setProfileMsg('');
        try {
            // Update user doc
            await setDoc(doc(db, 'users', user.uid), { name: profileName }, { merge: true });
            // Update institute doc
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

    const tabs = [
        { id: 'profile', label: 'Profile', icon: <FiUser size={16} /> },
        { id: 'security', label: 'Security', icon: <FiShield size={16} /> },
        { id: 'branding', label: 'Branding', icon: <FiDroplet size={16} /> },
    ];

    return (
        <div className="page-container fade-in">
            <div style={{ marginBottom: '32px' }}>
                <h1 className="page-title">👤 Admin Profile</h1>
                <p className="page-subtitle">Manage your account, security, and institute branding</p>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'var(--bg-glass)', padding: '4px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--bg-glass-border)', maxWidth: '500px' }}>
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            padding: '12px 16px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                            fontWeight: 700, fontSize: '13px', transition: 'all 0.2s ease',
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

                    {/* Color Picker */}
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

                    {/* Color Preview */}
                    <div style={{ padding: '20px', borderRadius: 'var(--radius-lg)', marginBottom: '20px', background: `${accentColor}10`, border: `2px solid ${accentColor}30` }}>
                        <div style={{ fontWeight: 700, marginBottom: '8px', color: accentColor }}>Preview</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ padding: '6px 14px', borderRadius: 'var(--radius-full)', background: accentColor, color: '#fff', fontSize: '12px', fontWeight: 700 }}>Primary Button</span>
                            <span style={{ padding: '6px 14px', borderRadius: 'var(--radius-full)', background: `${accentColor}15`, color: accentColor, fontSize: '12px', fontWeight: 700, border: `1px solid ${accentColor}30` }}>Secondary</span>
                            <span style={{ padding: '6px 14px', borderRadius: 'var(--radius-full)', background: 'var(--bg-input)', fontSize: '12px', fontWeight: 700, color: accentColor }}>Badge</span>
                        </div>
                    </div>

                    {/* Logo URL */}
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
        </div>
    );
}
