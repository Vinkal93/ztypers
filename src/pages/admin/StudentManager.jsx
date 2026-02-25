import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { FiArrowLeft, FiUserPlus, FiTrash2, FiUsers, FiKey, FiCopy, FiCheck } from 'react-icons/fi';

export default function StudentManager() {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', studentId: '', password: '' });
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState('');

    useEffect(() => {
        const q = query(collection(db, 'students'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const generateId = () => {
        const prefix = 'ZT';
        const num = String(Math.floor(1000 + Math.random() * 9000));
        return `${prefix}${num}`;
    };

    const generatePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let pass = '';
        for (let i = 0; i < 6; i++) pass += chars[Math.floor(Math.random() * chars.length)];
        return pass;
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await addDoc(collection(db, 'students'), {
                name: form.name,
                studentId: form.studentId || generateId(),
                password: form.password || generatePassword(),
                bestWPM: 0,
                totalCompetitions: 0,
                createdAt: new Date().toISOString(),
            });
            setForm({ name: '', studentId: '', password: '' });
            setShowForm(false);
        } catch (err) {
            console.error('Error:', err);
            alert('Error adding student');
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this student?')) return;
        try {
            await deleteDoc(doc(db, 'students', id));
        } catch (err) {
            console.error('Error:', err);
        }
    };

    const copyCredentials = (student) => {
        const text = `Student: ${student.name}\nID: ${student.studentId}\nPassword: ${student.password}`;
        navigator.clipboard.writeText(text);
        setCopied(student.id);
        setTimeout(() => setCopied(''), 2000);
    };

    return (
        <div className="page-container fade-in">
            <button onClick={() => navigate('/admin')} className="btn btn-secondary" style={{ marginBottom: '24px' }}>
                <FiArrowLeft /> Back to Dashboard
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 className="page-title">👨‍🎓 Student Manager</h1>
                    <p className="page-subtitle">Create and manage student accounts for Playground access</p>
                </div>
                <button onClick={() => { setShowForm(!showForm); setForm({ name: '', studentId: generateId(), password: generatePassword() }); }}
                    className="btn btn-primary">
                    <FiUserPlus /> Add Student
                </button>
            </div>

            {/* Add Form */}
            {showForm && (
                <div className="glass-card" style={{ marginBottom: '24px', maxWidth: '500px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '16px' }}>New Student</h3>
                    <form onSubmit={handleAdd}>
                        <div className="form-group">
                            <label className="input-label">Student Name</label>
                            <input type="text" className="input" placeholder="e.g., Rahul Sharma"
                                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="input-label"><FiKey style={{ marginRight: '4px' }} /> Student ID</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input type="text" className="input" value={form.studentId}
                                        onChange={e => setForm({ ...form, studentId: e.target.value })} required />
                                    <button type="button" onClick={() => setForm({ ...form, studentId: generateId() })}
                                        className="btn btn-sm btn-secondary" style={{ whiteSpace: 'nowrap' }}>🎲</button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="input-label"><FiKey style={{ marginRight: '4px' }} /> Password</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input type="text" className="input" value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })} required />
                                    <button type="button" onClick={() => setForm({ ...form, password: generatePassword() })}
                                        className="btn btn-sm btn-secondary" style={{ whiteSpace: 'nowrap' }}>🎲</button>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Saving...' : <><FiUserPlus /> Add Student</>}
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Students List */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{
                    padding: '16px 24px', borderBottom: '1px solid var(--bg-glass-border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                        <FiUsers style={{ marginRight: '8px' }} /> All Students ({students.length})
                    </h3>
                </div>
                {students.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">👨‍🎓</div>
                        <div className="empty-state-title">No students yet</div>
                        <div className="empty-state-text">Add students so they can log into the Playground</div>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Student ID</th>
                                <th>Password</th>
                                <th>Best WPM</th>
                                <th>Competitions</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map(s => (
                                <tr key={s.id}>
                                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 600 }}>{s.studentId}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{s.password}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{s.bestWPM || 0}</td>
                                    <td>{s.totalCompetitions || 0}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button onClick={() => copyCredentials(s)} className="btn btn-sm btn-secondary"
                                                title="Copy credentials">
                                                {copied === s.id ? <FiCheck size={14} style={{ color: 'var(--accent-success)' }} /> : <FiCopy size={14} />}
                                            </button>
                                            <button onClick={() => handleDelete(s.id)} className="btn btn-sm btn-danger" title="Delete">
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
