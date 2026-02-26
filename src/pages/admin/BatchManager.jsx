import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { FiArrowLeft, FiPlus, FiTrash2, FiUsers, FiEdit2, FiCheck, FiX, FiPlay } from 'react-icons/fi';

export default function BatchManager() {
    const navigate = useNavigate();
    const [batches, setBatches] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newBatch, setNewBatch] = useState('');
    const [saving, setSaving] = useState(false);
    const [assignModal, setAssignModal] = useState(null);
    const [selectedStudents, setSelectedStudents] = useState([]);

    useEffect(() => {
        const unsub1 = onSnapshot(collection(db, 'batches'), (snap) => {
            setBatches(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
            setLoading(false);
        });
        const unsub2 = onSnapshot(collection(db, 'students'), (snap) => {
            setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        });
        return () => { unsub1(); unsub2(); };
    }, []);

    const createBatch = async () => {
        if (!newBatch.trim()) return;
        setSaving(true);
        try {
            await addDoc(collection(db, 'batches'), {
                name: newBatch.trim(),
                studentIds: [],
                createdAt: new Date().toISOString(),
            });
            setNewBatch('');
            setShowCreate(false);
        } catch (err) {
            alert('Error: ' + err.message);
        }
        setSaving(false);
    };

    const deleteBatch = async (id) => {
        if (!confirm('Delete this batch?')) return;
        try {
            // Remove batch assignment from all students in this batch
            const batch = batches.find(b => b.id === id);
            if (batch?.studentIds) {
                for (const sid of batch.studentIds) {
                    await updateDoc(doc(db, 'students', sid), { batchId: '' }).catch(() => { });
                }
            }
            await deleteDoc(doc(db, 'batches', id));
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const openAssign = (batch) => {
        setAssignModal(batch);
        setSelectedStudents(batch.studentIds || []);
    };

    const toggleStudent = (sid) => {
        setSelectedStudents(prev =>
            prev.includes(sid) ? prev.filter(s => s !== sid) : [...prev, sid]
        );
    };

    const saveAssignment = async () => {
        if (!assignModal) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, 'batches', assignModal.id), { studentIds: selectedStudents });
            // Update student docs with batchId
            for (const s of students) {
                if (selectedStudents.includes(s.id)) {
                    await updateDoc(doc(db, 'students', s.id), { batchId: assignModal.id, batchName: assignModal.name }).catch(() => { });
                } else if (s.batchId === assignModal.id) {
                    await updateDoc(doc(db, 'students', s.id), { batchId: '', batchName: '' }).catch(() => { });
                }
            }
            setAssignModal(null);
        } catch (err) {
            alert('Error: ' + err.message);
        }
        setSaving(false);
    };

    const getStudentNames = (ids) => {
        if (!ids || ids.length === 0) return 'No students assigned';
        return ids.map(id => students.find(s => s.id === id)?.name || id).join(', ');
    };

    return (
        <div className="page-container fade-in">
            <button onClick={() => navigate('/admin')} className="btn btn-secondary" style={{ marginBottom: '24px' }}>
                <FiArrowLeft /> Back to Dashboard
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 className="page-title">📦 Batch Manager</h1>
                    <p className="page-subtitle">Create batches, assign students, and manage groups</p>
                </div>
                <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary">
                    <FiPlus /> Create Batch
                </button>
            </div>

            {/* Create Batch Form */}
            {showCreate && (
                <div className="glass-card" style={{ marginBottom: '24px', maxWidth: '400px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '16px' }}>New Batch</h3>
                    <div className="form-group">
                        <label className="input-label">Batch Name</label>
                        <input type="text" className="input" placeholder="e.g., Batch A, Morning Batch"
                            value={newBatch} onChange={e => setNewBatch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && createBatch()} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={createBatch} className="btn btn-primary" disabled={saving || !newBatch.trim()}>
                            {saving ? 'Creating...' : <><FiPlus /> Create</>}
                        </button>
                        <button onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancel</button>
                    </div>
                </div>
            )}

            {/* Batches List */}
            {loading ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
            ) : batches.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '48px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '8px' }}>No Batches Yet</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Create your first batch to organize students!</p>
                </div>
            ) : (
                <div className="grid-2">
                    {batches.map(batch => (
                        <div key={batch.id} className="glass-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div>
                                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700 }}>
                                        📦 {batch.name}
                                    </h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                                        <FiUsers size={12} style={{ marginRight: '4px' }} />
                                        {(batch.studentIds || []).length} students
                                    </p>
                                </div>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px', lineHeight: 1.5 }}>
                                {getStudentNames(batch.studentIds)}
                            </p>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button onClick={() => openAssign(batch)} className="btn btn-sm btn-primary">
                                    <FiUsers size={14} /> Assign Students
                                </button>
                                <button onClick={() => navigate(`/admin/playground?batch=${batch.id}`)} className="btn btn-sm btn-success">
                                    <FiPlay size={14} /> Start
                                </button>
                                <button onClick={() => deleteBatch(batch.id)} className="btn btn-sm btn-danger">
                                    <FiTrash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Assign Students Modal */}
            {assignModal && (
                <>
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.6)', zIndex: 999, backdropFilter: 'blur(4px)',
                    }} onClick={() => setAssignModal(null)} />
                    <div style={{
                        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        width: '90%', maxWidth: '500px', maxHeight: '80vh', overflow: 'auto',
                        zIndex: 1000, borderRadius: 'var(--radius-xl)',
                        background: 'var(--bg-card)', border: '1px solid var(--bg-glass-border)',
                        padding: '24px', boxShadow: 'var(--shadow-lg)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                                Assign to {assignModal.name}
                            </h3>
                            <button onClick={() => setAssignModal(null)} className="btn btn-sm btn-secondary"><FiX /></button>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                            Select students for this batch ({selectedStudents.length} selected)
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                            {students.map(s => (
                                <div key={s.id} onClick={() => toggleStudent(s.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                                        borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                        background: selectedStudents.includes(s.id) ? 'rgba(0,212,255,0.1)' : 'var(--bg-input)',
                                        border: `1px solid ${selectedStudents.includes(s.id) ? 'rgba(0,212,255,0.3)' : 'var(--bg-glass-border)'}`,
                                        transition: 'all 0.2s ease',
                                    }}>
                                    <div style={{
                                        width: '22px', height: '22px', borderRadius: '6px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: selectedStudents.includes(s.id) ? 'var(--accent-primary)' : 'var(--bg-glass-border)',
                                        color: selectedStudents.includes(s.id) ? '#fff' : 'transparent',
                                        fontSize: '14px', transition: 'all 0.2s ease',
                                    }}>
                                        <FiCheck size={14} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{s.name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                            {s.studentId} {s.batchName ? `• ${s.batchName}` : ''}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={saveAssignment} className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                                {saving ? 'Saving...' : <><FiCheck /> Save Assignment</>}
                            </button>
                            <button onClick={() => setAssignModal(null)} className="btn btn-secondary">Cancel</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
