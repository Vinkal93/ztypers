import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FiUser, FiMail, FiPhone, FiSend, FiCheckCircle, FiZap, FiTarget } from 'react-icons/fi';

export default function Enroll() {
    const [form, setForm] = useState({
        name: '', email: '', phone: '', age: '', city: '',
        currentSpeed: '', preferredLevel: 'beginner',
        experience: '', goal: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await addDoc(collection(db, 'enrollments'), {
                ...form,
                age: parseInt(form.age) || 0,
                currentSpeed: parseInt(form.currentSpeed) || 0,
                status: 'new',
                createdAt: new Date().toISOString(),
            });
            setSubmitted(true);
        } catch (err) {
            setError('Error submitting form: ' + err.message);
        }
        setSubmitting(false);
    };

    if (submitted) {
        return (
            <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div className="glass-card fade-in" style={{ maxWidth: '500px', width: '100%', padding: '48px', textAlign: 'center' }}>
                    <div style={{ fontSize: '72px', marginBottom: '16px' }}>🎉</div>
                    <h1 style={{
                        fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, marginBottom: '12px',
                        background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        Enrollment Successful!
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.7, marginBottom: '24px' }}>
                        Thank you <strong>{form.name}</strong>! Your enrollment has been submitted.
                        Our admin will review your details and assign you to a batch soon.
                        You will receive your Student ID and Password shortly.
                    </p>
                    <div style={{
                        padding: '16px', borderRadius: 'var(--radius-md)',
                        background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)',
                    }}>
                        <FiCheckCircle style={{ color: 'var(--accent-success)', marginRight: '8px' }} />
                        <span style={{ color: 'var(--accent-success)', fontWeight: 600, fontSize: '14px' }}>
                            Application received! Check with your admin for next steps.
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container fade-in">
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <span style={{ fontSize: '48px' }}>📝</span>
                    <h1 style={{
                        fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 900, marginTop: '12px',
                        background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        Enroll Now
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '15px' }}>
                        Join Z Typers and compete with other typists! Fill in your details below.
                    </p>
                </div>

                {error && (
                    <div style={{
                        padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px',
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        color: 'var(--accent-danger)', fontSize: '13px',
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '32px' }}>
                    <div className="form-group">
                        <label className="input-label"><FiUser style={{ marginRight: '6px' }} /> Full Name *</label>
                        <input type="text" className="input" placeholder="e.g., Rahul Sharma" required
                            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="form-group">
                            <label className="input-label"><FiMail style={{ marginRight: '6px' }} /> Email</label>
                            <input type="email" className="input" placeholder="email@example.com"
                                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="input-label"><FiPhone style={{ marginRight: '6px' }} /> Phone *</label>
                            <input type="tel" className="input" placeholder="9876543210" required
                                value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="form-group">
                            <label className="input-label">Age *</label>
                            <input type="number" className="input" placeholder="e.g., 14" required min="5" max="60"
                                value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="input-label">City</label>
                            <input type="text" className="input" placeholder="e.g., Mumbai"
                                value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="form-group">
                            <label className="input-label"><FiZap style={{ marginRight: '6px' }} /> Current Typing Speed (WPM)</label>
                            <input type="number" className="input" placeholder="e.g., 30"
                                value={form.currentSpeed} onChange={e => setForm({ ...form, currentSpeed: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="input-label"><FiTarget style={{ marginRight: '6px' }} /> Preferred Level *</label>
                            <select className="input" required value={form.preferredLevel}
                                onChange={e => setForm({ ...form, preferredLevel: e.target.value })}>
                                <option value="beginner">🟢 Beginner (0-20 WPM)</option>
                                <option value="intermediate">🟡 Intermediate (20-40 WPM)</option>
                                <option value="advanced">🔴 Advanced (40+ WPM)</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="input-label">Typing Experience</label>
                        <select className="input" value={form.experience}
                            onChange={e => setForm({ ...form, experience: e.target.value })}>
                            <option value="">Select...</option>
                            <option value="none">No experience</option>
                            <option value="basic">Basic (can type slowly)</option>
                            <option value="moderate">Moderate (comfortable typing)</option>
                            <option value="expert">Expert (touch typing)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="input-label">Your Goal</label>
                        <textarea className="input" placeholder="Why do you want to join? What is your goal?"
                            rows={3} value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} />
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}
                        style={{ width: '100%', marginTop: '8px', fontSize: '16px' }}>
                        {submitting ? 'Submitting...' : <><FiSend /> Submit Enrollment</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
