import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { FiArrowLeft, FiDownload, FiUser, FiMail, FiPhone, FiX, FiTrash2, FiCheck, FiClock, FiEye } from 'react-icons/fi';
import * as XLSX from 'xlsx';

export default function EnrollmentManager() {
    const navigate = useNavigate();
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEnrollment, setSelectedEnrollment] = useState(null);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'enrollments'), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            setEnrollments(list);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const updateStatus = async (id, status) => {
        try {
            await updateDoc(doc(db, 'enrollments', id), { status, reviewedAt: new Date().toISOString() });
            if (selectedEnrollment?.id === id) {
                setSelectedEnrollment(prev => ({ ...prev, status }));
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const deleteEnrollment = async (id) => {
        if (!confirm('Delete this enrollment?')) return;
        try {
            await deleteDoc(doc(db, 'enrollments', id));
            if (selectedEnrollment?.id === id) setSelectedEnrollment(null);
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const exportToXLSX = () => {
        const data = filteredEnrollments.map(e => ({
            Name: e.name || '',
            Email: e.email || '',
            Phone: e.phone || '',
            Age: e.age || '',
            City: e.city || '',
            'Current Speed (WPM)': e.currentSpeed || '',
            'Preferred Level': e.preferredLevel || '',
            Experience: e.experience || '',
            Goal: e.goal || '',
            Status: e.status || 'new',
            'Enrolled At': e.createdAt ? new Date(e.createdAt).toLocaleString() : '',
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Enrollments');
        XLSX.writeFile(wb, `ZTypers_Enrollments_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const filteredEnrollments = filter === 'all' ? enrollments : enrollments.filter(e => e.status === filter);

    const statusBadge = (status) => {
        const styles = {
            new: { bg: 'rgba(0,212,255,0.1)', color: '#00d4ff', border: 'rgba(0,212,255,0.3)' },
            reviewed: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
            approved: { bg: 'rgba(5,150,105,0.1)', color: '#059669', border: 'rgba(5,150,105,0.3)' },
        };
        const s = styles[status] || styles.new;
        return (
            <span style={{
                padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '11px', fontWeight: 700,
                background: s.bg, color: s.color, border: `1px solid ${s.border}`, textTransform: 'uppercase',
            }}>
                {status || 'new'}
            </span>
        );
    };

    return (
        <div className="page-container fade-in">
            <button onClick={() => navigate('/admin')} className="btn btn-secondary" style={{ marginBottom: '24px' }}>
                <FiArrowLeft /> Back to Dashboard
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 className="page-title">📋 Enrollment Manager</h1>
                    <p className="page-subtitle">Review and manage new student enrollments</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <select className="input" style={{ width: 'auto', minWidth: '120px' }}
                        value={filter} onChange={e => setFilter(e.target.value)}>
                        <option value="all">All ({enrollments.length})</option>
                        <option value="new">New ({enrollments.filter(e => e.status === 'new').length})</option>
                        <option value="reviewed">Reviewed ({enrollments.filter(e => e.status === 'reviewed').length})</option>
                        <option value="approved">Approved ({enrollments.filter(e => e.status === 'approved').length})</option>
                    </select>
                    <button onClick={exportToXLSX} className="btn btn-primary" disabled={filteredEnrollments.length === 0}>
                        <FiDownload /> Export XLSX
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid-3" style={{ marginBottom: '24px' }}>
                {[
                    { label: 'Total Enrollments', value: enrollments.length, color: '#00d4ff', icon: '📋' },
                    { label: 'New (Pending)', value: enrollments.filter(e => e.status === 'new').length, color: '#f59e0b', icon: '🆕' },
                    { label: 'Approved', value: enrollments.filter(e => e.status === 'approved').length, color: '#059669', icon: '✅' },
                ].map((s, i) => (
                    <div key={i} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ fontSize: '28px' }}>{s.icon}</div>
                        <div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--bg-glass-border)' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                        All Enrollments ({filteredEnrollments.length})
                    </h3>
                </div>
                {filteredEnrollments.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px' }}>
                        <div className="empty-state-icon">📭</div>
                        <div className="empty-state-title">No enrollments found</div>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Phone</th>
                                <th>Age</th>
                                <th>Level</th>
                                <th>Speed</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEnrollments.map(e => (
                                <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedEnrollment(e)}>
                                    <td style={{ fontWeight: 600 }}>{e.name}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{e.phone || '-'}</td>
                                    <td>{e.age || '-'}</td>
                                    <td>
                                        <span style={{ fontSize: '12px', textTransform: 'capitalize' }}>
                                            {e.preferredLevel === 'beginner' ? '🟢' : e.preferredLevel === 'intermediate' ? '🟡' : '🔴'} {e.preferredLevel}
                                        </span>
                                    </td>
                                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{e.currentSpeed || '-'}</td>
                                    <td>{statusBadge(e.status)}</td>
                                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '-'}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '4px' }} onClick={ev => ev.stopPropagation()}>
                                            <button onClick={() => setSelectedEnrollment(e)} className="btn btn-sm btn-secondary" title="View">
                                                <FiEye size={14} />
                                            </button>
                                            <button onClick={() => deleteEnrollment(e.id)} className="btn btn-sm btn-danger" title="Delete">
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

            {/* Detail Modal */}
            {selectedEnrollment && (
                <>
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.6)', zIndex: 999, backdropFilter: 'blur(4px)',
                    }} onClick={() => setSelectedEnrollment(null)} />
                    <div style={{
                        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        width: '90%', maxWidth: '520px', maxHeight: '80vh', overflow: 'auto',
                        zIndex: 1000, borderRadius: 'var(--radius-xl)',
                        background: 'var(--bg-card)', border: '1px solid var(--bg-glass-border)',
                        padding: '28px', boxShadow: 'var(--shadow-lg)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px' }}>
                                📋 Student Details
                            </h3>
                            <button onClick={() => setSelectedEnrollment(null)} className="btn btn-sm btn-secondary"><FiX /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                            {[
                                { icon: <FiUser />, label: 'Name', value: selectedEnrollment.name },
                                { icon: <FiMail />, label: 'Email', value: selectedEnrollment.email || '-' },
                                { icon: <FiPhone />, label: 'Phone', value: selectedEnrollment.phone || '-' },
                                { icon: '🎂', label: 'Age', value: selectedEnrollment.age || '-' },
                                { icon: '🏙️', label: 'City', value: selectedEnrollment.city || '-' },
                                { icon: '⚡', label: 'Current Speed', value: selectedEnrollment.currentSpeed ? `${selectedEnrollment.currentSpeed} WPM` : '-' },
                                { icon: '🎯', label: 'Preferred Level', value: selectedEnrollment.preferredLevel || '-' },
                                { icon: '📝', label: 'Experience', value: selectedEnrollment.experience || '-' },
                                { icon: '🎯', label: 'Goal', value: selectedEnrollment.goal || '-' },
                                { icon: <FiClock />, label: 'Enrolled', value: selectedEnrollment.createdAt ? new Date(selectedEnrollment.createdAt).toLocaleString() : '-' },
                            ].map((item, i) => (
                                <div key={i} style={{
                                    display: 'flex', gap: '12px', padding: '10px 14px',
                                    borderRadius: 'var(--radius-md)', background: 'var(--bg-input)',
                                }}>
                                    <span style={{ color: 'var(--accent-primary)', minWidth: '20px' }}>{item.icon}</span>
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{item.label}</div>
                                        <div style={{ fontWeight: 500, fontSize: '14px', marginTop: '2px' }}>{item.value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Status:</span>
                            {statusBadge(selectedEnrollment.status)}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button onClick={() => updateStatus(selectedEnrollment.id, 'reviewed')} className="btn btn-sm btn-secondary" style={{ flex: 1 }}>
                                <FiEye size={14} /> Mark Reviewed
                            </button>
                            <button onClick={() => updateStatus(selectedEnrollment.id, 'approved')} className="btn btn-sm btn-success" style={{ flex: 1 }}>
                                <FiCheck size={14} /> Approve
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
