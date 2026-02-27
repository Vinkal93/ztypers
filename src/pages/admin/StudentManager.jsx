import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, setDoc, getDocs, deleteDoc, doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
    FiArrowLeft, FiUserPlus, FiTrash2, FiUsers, FiKey, FiCopy, FiCheck,
    FiEdit2, FiX, FiSave, FiLock, FiUnlock, FiAlertCircle, FiDownload,
} from 'react-icons/fi';

// ── Disable modal ──────────────────────────────────────────────
function DisableModal({ student, onConfirm, onClose }) {
    const [note, setNote] = useState('');
    const [status, setStatus] = useState('disabled');
    const [days, setDays] = useState('');
    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: '440px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                        🔒 Disable: {student.name}
                    </h3>
                    <button onClick={onClose} className="btn-icon"><FiX /></button>
                </div>

                <div className="form-group">
                    <label className="input-label">Status</label>
                    <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
                        <option value="disabled">Disabled</option>
                        <option value="suspended">Suspended</option>
                    </select>
                </div>

                <div className="form-group">
                    <label className="input-label">Reason / Note for Student</label>
                    <textarea className="input" rows={3} value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="e.g. Misbehaviour during competition. Contact admin to re-enable." />
                </div>

                <div className="form-group">
                    <label className="input-label">Auto Re-enable After (days, optional)</label>
                    <input type="number" className="input" min={1} max={365}
                        value={days} onChange={e => setDays(e.target.value)}
                        placeholder="e.g. 7 (leave blank for permanent)" />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => onConfirm({ status, note, days: days ? Number(days) : null })}
                        className="btn btn-danger" style={{ flex: 1 }}>
                        <FiLock size={14} /> Disable Account
                    </button>
                    <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                </div>
            </div>
        </div>
    );
}

// ── Status badge helper ────────────────────────────────────────
function StatusBadge({ status }) {
    const map = {
        active: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'rgba(16,185,129,0.3)', label: '✓ Active' },
        disabled: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.3)', label: '🔒 Disabled' },
        suspended: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)', label: '⏸ Suspended' },
    };
    const s = map[status] || map.active;
    return (
        <span style={{
            padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '11px',
            fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`,
        }}>{s.label}</span>
    );
}

export default function StudentManager() {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', studentId: '', password: '' });
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [disableTarget, setDisableTarget] = useState(null);
    const [searchQ, setSearchQ] = useState('');

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'students'), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            setStudents(list);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const generateId = async () => {
        const prefix = 'ZT';
        const existingIds = students.map(s => s.id);
        let attempts = 0;
        while (attempts < 20) {
            const num = String(Math.floor(1000 + Math.random() * 9000));
            const candidate = `${prefix}${num}`;
            if (!existingIds.includes(candidate)) return candidate;
            attempts++;
        }
        const snap = await getDocs(collection(db, 'students'));
        const allIds = snap.docs.map(d => d.id);
        let num = String(Math.floor(1000 + Math.random() * 9000));
        while (allIds.includes(`${prefix}${num}`)) num = String(Math.floor(1000 + Math.random() * 9000));
        return `${prefix}${num}`;
    };

    const generatePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let p = '';
        for (let i = 0; i < 6; i++) p += chars[Math.floor(Math.random() * chars.length)];
        return p;
    };

    const initForm = async () => {
        const newId = await generateId();
        setForm({ name: '', studentId: newId, password: generatePassword() });
        setShowForm(true);
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const sid = (form.studentId || await generateId()).toUpperCase();
            const pwd = form.password || generatePassword();
            const existing = await getDoc(doc(db, 'students', sid));
            if (existing.exists()) { alert(`Student ID ${sid} already exists! Generate a new one.`); setSaving(false); return; }
            await setDoc(doc(db, 'students', sid), {
                name: form.name, studentId: sid, password: pwd,
                bestWPM: 0, totalCompetitions: 0, status: 'active',
                badges: ['first_login'],
                createdAt: new Date().toISOString(),
            });
            setForm({ name: '', studentId: '', password: '' });
            setShowForm(false);
        } catch (err) { alert('Error: ' + err.message); }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        setDeleteConfirm(null);
        try { await deleteDoc(doc(db, 'students', id)); } catch (err) { console.error(err); }
    };

    const handleDisable = async ({ status, note, days }) => {
        if (!disableTarget) return;
        const update = {
            status,
            disableNote: note,
            disabledAt: new Date().toISOString(),
        };
        if (days) {
            const until = new Date();
            until.setDate(until.getDate() + days);
            update.disableUntil = until.toISOString();
        } else {
            update.disableUntil = null;
        }
        try {
            await updateDoc(doc(db, 'students', disableTarget.id), update);
        } catch (err) { alert('Error: ' + err.message); }
        setDisableTarget(null);
    };

    const handleEnable = async (s) => {
        try {
            await updateDoc(doc(db, 'students', s.id), {
                status: 'active', disableNote: '', disabledAt: null, disableUntil: null,
            });
        } catch (err) { alert('Error: ' + err.message); }
    };

    const startEdit = (s) => {
        setEditingId(s.id);
        setEditForm({ name: s.name, password: s.password });
    };
    const cancelEdit = () => { setEditingId(null); setEditForm({}); };
    const saveEdit = async (s) => {
        setSaving(true);
        try {
            await updateDoc(doc(db, 'students', s.id), { name: editForm.name, password: editForm.password });
            setEditingId(null);
        } catch (err) { alert('Error saving: ' + err.message); }
        setSaving(false);
    };

    const copyCredentials = (student) => {
        const text = `Student: ${student.name}\nID: ${student.studentId}\nPassword: ${student.password}`;
        navigator.clipboard.writeText(text);
        setCopied(student.id);
        setTimeout(() => setCopied(''), 2000);
    };

    const exportCSV = () => {
        const header = ['Name', 'Student ID', 'Password', 'Best WPM', 'Competitions', 'Status'];
        const rows = students.map(s => [s.name, s.studentId, s.password, s.bestWPM || 0, s.totalCompetitions || 0, s.status || 'active']);
        const csv = [header, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'students.csv'; a.click();
    };

    const filtered = students.filter(s =>
        (s.name || '').toLowerCase().includes(searchQ.toLowerCase()) ||
        (s.studentId || '').toLowerCase().includes(searchQ.toLowerCase())
    );

    const stats = {
        total: students.length,
        active: students.filter(s => (s.status || 'active') === 'active').length,
        disabled: students.filter(s => s.status === 'disabled' || s.status === 'suspended').length,
    };

    return (
        <div className="page-container fade-in">
            {disableTarget && (
                <DisableModal student={disableTarget} onConfirm={handleDisable} onClose={() => setDisableTarget(null)} />
            )}

            <button onClick={() => navigate('/admin')} className="btn btn-secondary" style={{ marginBottom: '24px' }}>
                <FiArrowLeft /> Back to Dashboard
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 className="page-title">👨‍🎓 Student Manager</h1>
                    <p className="page-subtitle">Manage student accounts, credentials, and access</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={exportCSV} className="btn btn-secondary" title="Export CSV">
                        <FiDownload size={15} /> Export
                    </button>
                    <button onClick={initForm} className="btn btn-primary">
                        <FiUserPlus /> Add Student
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {[
                    { label: 'Total Students', value: stats.total, color: 'var(--accent-primary)', icon: '👨‍🎓' },
                    { label: 'Active', value: stats.active, color: 'var(--accent-success)', icon: '✅' },
                    { label: 'Disabled/Suspended', value: stats.disabled, color: 'var(--accent-danger)', icon: '🔒' },
                ].map((s, i) => (
                    <div key={i} className="glass-card" style={{ flex: '1', minWidth: '140px', textAlign: 'center', padding: '16px', borderTop: `3px solid ${s.color}` }}>
                        <div style={{ fontSize: '22px' }}>{s.icon}</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div style={{ padding: '16px 20px', borderRadius: 'var(--radius-lg)', marginBottom: '16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--accent-danger)' }}>
                        🗑️ Delete <strong>{students.find(s => s.id === deleteConfirm)?.name}</strong>? This cannot be undone.
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleDelete(deleteConfirm)} className="btn btn-sm btn-danger">Yes, Delete</button>
                        <button onClick={() => setDeleteConfirm(null)} className="btn btn-sm btn-secondary">Cancel</button>
                    </div>
                </div>
            )}

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
                                    <button type="button" onClick={async () => setForm(f => ({ ...f, studentId: '' }))}
                                        className="btn btn-sm btn-secondary" style={{ whiteSpace: 'nowrap' }}
                                        title="Generate new ID"
                                        onClickCapture={async (e) => { e.preventDefault(); const id = await generateId(); setForm(f => ({ ...f, studentId: id })); }}>🎲</button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="input-label"><FiKey style={{ marginRight: '4px' }} /> Password</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input type="text" className="input" value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })} required />
                                    <button type="button" onClick={() => setForm(f => ({ ...f, password: generatePassword() }))}
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

            {/* Search */}
            <div className="glass-card" style={{ marginBottom: '16px' }}>
                <input type="text" className="input" placeholder="🔍 Search by name or ID..."
                    value={searchQ} onChange={e => setSearchQ(e.target.value)} />
            </div>

            {/* Students Table */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--bg-glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                        <FiUsers style={{ marginRight: '8px' }} /> All Students ({filtered.length})
                    </h3>
                </div>
                {filtered.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">👨‍🎓</div>
                        <div className="empty-state-title">No students yet</div>
                        <div className="empty-state-text">Add students so they can log into the Playground</div>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Student ID</th>
                                    <th>Password</th>
                                    <th>Status</th>
                                    <th>Best WPM</th>
                                    <th>Competitions</th>
                                    <th>Badges</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(s => {
                                    const st = s.status || 'active';
                                    return (
                                        <tr key={s.id} style={{ opacity: st !== 'active' ? 0.7 : 1 }}>
                                            {editingId === s.id ? (
                                                <>
                                                    <td>
                                                        <input type="text" className="input" value={editForm.name}
                                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                            style={{ minWidth: '120px', padding: '6px 10px', fontSize: '13px' }} />
                                                    </td>
                                                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 600 }}>{s.studentId}</td>
                                                    <td>
                                                        <input type="text" className="input" value={editForm.password}
                                                            onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                                            style={{ minWidth: '100px', padding: '6px 10px', fontSize: '13px' }} />
                                                    </td>
                                                    <td><StatusBadge status={st} /></td>
                                                    <td>{s.bestWPM || 0}</td>
                                                    <td>{s.totalCompetitions || 0}</td>
                                                    <td style={{ fontSize: '16px' }}>{(s.badges || []).map(b => ({ first_login: '👋', speedster_50: '⚡', speedster_100: '🚀', speedster_150: '🔥', accuracy_100: '🎯', winner: '🏆', competitor_5: '🎮', competitor_10: '💪' })[b] || '').join(' ')}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            <button onClick={() => saveEdit(s)} className="btn btn-sm btn-primary" disabled={saving}><FiSave size={14} /></button>
                                                            <button onClick={cancelEdit} className="btn btn-sm btn-secondary"><FiX size={14} /></button>
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td style={{ fontWeight: 600 }}>
                                                        {s.name}
                                                        {st !== 'active' && s.disableNote && (
                                                            <div style={{ fontSize: '11px', color: 'var(--accent-danger)', marginTop: '2px' }}>
                                                                <FiAlertCircle size={10} style={{ marginRight: '3px' }} />{s.disableNote.slice(0, 30)}…
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 600 }}>{s.studentId}</td>
                                                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{s.password}</td>
                                                    <td><StatusBadge status={st} /></td>
                                                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{s.bestWPM || 0}</td>
                                                    <td>{s.totalCompetitions || 0}</td>
                                                    <td style={{ fontSize: '16px', letterSpacing: '2px' }}>{(s.badges || []).map(b => ({ first_login: '👋', speedster_50: '⚡', speedster_100: '🚀', speedster_150: '🔥', accuracy_100: '🎯', winner: '🏆', competitor_5: '🎮', competitor_10: '💪' })[b] || '').join(' ')}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                            <button onClick={() => startEdit(s)} className="btn btn-sm btn-secondary" title="Edit"><FiEdit2 size={14} /></button>
                                                            <button onClick={() => copyCredentials(s)} className="btn btn-sm btn-secondary" title="Copy credentials">
                                                                {copied === s.id ? <FiCheck size={14} style={{ color: 'var(--accent-success)' }} /> : <FiCopy size={14} />}
                                                            </button>
                                                            {st === 'active' ? (
                                                                <button onClick={() => setDisableTarget(s)} className="btn btn-sm" title="Disable account"
                                                                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                                                                    <FiLock size={14} />
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => handleEnable(s)} className="btn btn-sm" title="Enable account"
                                                                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                                                                    <FiUnlock size={14} />
                                                                </button>
                                                            )}
                                                            <button onClick={() => setDeleteConfirm(s.id)} className="btn btn-sm btn-danger" title="Delete"><FiTrash2 size={14} /></button>
                                                        </div>
                                                    </td>
                                                </>
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
