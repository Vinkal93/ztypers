import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { FiArrowLeft, FiChevronRight, FiAward, FiUsers, FiX, FiBarChart2 } from 'react-icons/fi';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function BatchHistory() {
    const navigate = useNavigate();
    const [batches, setBatches] = useState([]);
    const [history, setHistory] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [selectedComp, setSelectedComp] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);

    useEffect(() => {
        const unsub1 = onSnapshot(collection(db, 'batches'), (snap) => {
            setBatches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const unsub2 = onSnapshot(collection(db, 'competition_history'), (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => (b.endedAt || '').localeCompare(a.endedAt || ''));
            setHistory(data);
            setLoading(false);
        });
        const unsub3 = onSnapshot(collection(db, 'students'), (snap) => {
            setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => { unsub1(); unsub2(); unsub3(); };
    }, []);

    const getBatchHistory = (batchId) => history.filter(h => h.batchId === batchId);
    const getStudentHistory = (studentId) => history.filter(h => h.participants?.some(p => p.studentId === studentId || p.id === studentId));

    // --------------- SCREEN 1: Batch List ---------------
    if (!selectedBatch) {
        return (
            <div className="page-container fade-in">
                <button onClick={() => navigate('/admin')} className="btn btn-secondary" style={{ marginBottom: '24px' }}>
                    <FiArrowLeft /> Back to Dashboard
                </button>
                <div className="page-header" style={{ marginBottom: '24px' }}>
                    <h1 className="page-title">📊 Batch History</h1>
                    <p className="page-subtitle">View competition history organized by batches</p>
                </div>

                {loading ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
                ) : batches.length === 0 ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '48px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>No Batches</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Create batches first to see history here.</p>
                    </div>
                ) : (
                    <div className="grid-2">
                        {batches.map(batch => {
                            const batchComps = getBatchHistory(batch.id);
                            return (
                                <div key={batch.id} className="glass-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                                    onClick={() => setSelectedBatch(batch)}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700 }}>
                                                📦 {batch.name}
                                            </h3>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                                                <FiUsers size={12} /> {(batch.studentIds || []).length} students •
                                                <FiAward size={12} /> {batchComps.length} competitions
                                            </p>
                                        </div>
                                        <FiChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // --------------- SCREEN 2: Batch Competitions ---------------
    if (selectedBatch && !selectedStudent) {
        const batchComps = getBatchHistory(selectedBatch.id);
        const batchStudents = students.filter(s => (selectedBatch.studentIds || []).includes(s.id));

        return (
            <div className="page-container fade-in">
                <button onClick={() => { setSelectedBatch(null); setSelectedComp(null); }} className="btn btn-secondary" style={{ marginBottom: '24px' }}>
                    <FiArrowLeft /> Back to Batches
                </button>
                <div className="page-header" style={{ marginBottom: '24px' }}>
                    <h1 className="page-title">📦 {selectedBatch.name}</h1>
                    <p className="page-subtitle">{batchComps.length} competitions • {batchStudents.length} students</p>
                </div>

                {/* Students in Batch */}
                <div className="glass-card" style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '16px' }}>
                        <FiUsers style={{ marginRight: '8px' }} /> Students
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {batchStudents.map(s => (
                            <button key={s.id} onClick={() => setSelectedStudent(s)} className="btn btn-sm btn-secondary"
                                style={{ cursor: 'pointer' }}>
                                {s.name} <FiBarChart2 size={12} />
                            </button>
                        ))}
                        {batchStudents.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No students in this batch</span>}
                    </div>
                </div>

                {/* Competition History */}
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--bg-glass-border)' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Competition History</h3>
                    </div>
                    {batchComps.length === 0 ? (
                        <div className="empty-state" style={{ padding: '40px' }}>
                            <div className="empty-state-icon">🏆</div>
                            <div className="empty-state-title">No competitions yet</div>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Winner</th>
                                    <th>WPM</th>
                                    <th>Participants</th>
                                    <th>Duration</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {batchComps.map(comp => {
                                    const winner = comp.participants?.sort((a, b) => (b.score || 0) - (a.score || 0))[0];
                                    return (
                                        <tr key={comp.id}>
                                            <td style={{ fontSize: '13px' }}>{comp.endedAt ? new Date(comp.endedAt).toLocaleDateString() : '-'}</td>
                                            <td style={{ fontWeight: 600 }}>🏆 {winner?.name || '-'}</td>
                                            <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{winner?.wpm || 0}</td>
                                            <td>{comp.participants?.length || 0}</td>
                                            <td style={{ fontFamily: 'var(--font-mono)' }}>{comp.duration || 60}s</td>
                                            <td>
                                                <button onClick={() => setSelectedComp(selectedComp?.id === comp.id ? null : comp)}
                                                    className="btn btn-sm btn-secondary">
                                                    {selectedComp?.id === comp.id ? 'Hide' : 'View'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Expanded Competition Details */}
                {selectedComp && (
                    <div className="glass-card fade-in" style={{ marginTop: '16px' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '16px' }}>
                            📊 Competition Results — {selectedComp.endedAt ? new Date(selectedComp.endedAt).toLocaleDateString() : ''}
                        </h3>
                        <table className="data-table">
                            <thead>
                                <tr><th>Rank</th><th>Name</th><th>WPM</th><th>Accuracy</th><th>Score</th><th>Mistakes</th></tr>
                            </thead>
                            <tbody>
                                {(selectedComp.participants || [])
                                    .sort((a, b) => (b.score || 0) - (a.score || 0))
                                    .map((p, i) => (
                                        <tr key={i} style={{ background: i === 0 ? 'rgba(251,191,36,0.06)' : undefined }}>
                                            <td style={{
                                                fontFamily: 'var(--font-display)', fontWeight: 800,
                                                color: i < 3 ? ['var(--rank-gold)', 'var(--rank-silver)', 'var(--rank-bronze)'][i] : 'var(--text-muted)',
                                            }}>
                                                {i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{p.name}</td>
                                            <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{p.wpm || 0}</td>
                                            <td style={{ fontFamily: 'var(--font-mono)', color: (p.accuracy || 0) >= 90 ? 'var(--accent-success)' : 'var(--accent-warning)' }}>{p.accuracy || 0}%</td>
                                            <td style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--rank-gold)' }}>{p.score || 0}</td>
                                            <td style={{ color: 'var(--accent-danger)' }}>{p.mistakes || 0}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    }

    // --------------- SCREEN 3: Student Performance ---------------
    if (selectedStudent) {
        const studentComps = getStudentHistory(selectedStudent.id);
        const studentPerformances = studentComps.map(comp => {
            const p = comp.participants?.find(p => p.studentId === selectedStudent.id || p.id === selectedStudent.id);
            return { date: comp.endedAt, wpm: p?.wpm || 0, accuracy: p?.accuracy || 0, score: p?.score || 0, mistakes: p?.mistakes || 0 };
        }).reverse();

        const chartData = {
            labels: studentPerformances.map((_, i) => `Comp ${i + 1}`),
            datasets: [
                {
                    label: 'WPM',
                    data: studentPerformances.map(p => p.wpm),
                    backgroundColor: 'rgba(0,212,255,0.6)',
                    borderColor: '#00d4ff',
                    borderWidth: 2,
                    borderRadius: 6,
                },
                {
                    label: 'Score',
                    data: studentPerformances.map(p => p.score),
                    backgroundColor: 'rgba(251,191,36,0.6)',
                    borderColor: '#fbbf24',
                    borderWidth: 2,
                    borderRadius: 6,
                },
            ],
        };

        const accuracyData = {
            labels: ['Correct', 'Mistakes'],
            datasets: [{
                data: [
                    studentPerformances.reduce((a, b) => a + b.accuracy, 0) / (studentPerformances.length || 1),
                    100 - (studentPerformances.reduce((a, b) => a + b.accuracy, 0) / (studentPerformances.length || 1)),
                ],
                backgroundColor: ['rgba(16,185,129,0.7)', 'rgba(239,68,68,0.7)'],
                borderColor: ['#10b981', '#ef4444'],
                borderWidth: 2,
            }],
        };

        const avgWPM = studentPerformances.length ? Math.round(studentPerformances.reduce((a, b) => a + b.wpm, 0) / studentPerformances.length * 10) / 10 : 0;
        const avgAcc = studentPerformances.length ? Math.round(studentPerformances.reduce((a, b) => a + b.accuracy, 0) / studentPerformances.length * 10) / 10 : 0;
        const bestWPM = studentPerformances.length ? Math.max(...studentPerformances.map(p => p.wpm)) : 0;

        return (
            <div className="page-container fade-in">
                <button onClick={() => setSelectedStudent(null)} className="btn btn-secondary" style={{ marginBottom: '24px' }}>
                    <FiArrowLeft /> Back to {selectedBatch.name}
                </button>

                <div className="page-header" style={{ marginBottom: '24px' }}>
                    <h1 className="page-title">📊 {selectedStudent.name}'s Performance</h1>
                    <p className="page-subtitle">ID: {selectedStudent.studentId} • {studentComps.length} competitions</p>
                </div>

                {/* Stats Cards */}
                <div className="grid-4" style={{ marginBottom: '24px' }}>
                    {[
                        { label: 'Avg WPM', value: avgWPM, color: '#00d4ff', icon: '⚡' },
                        { label: 'Best WPM', value: bestWPM, color: '#fbbf24', icon: '🏆' },
                        { label: 'Avg Accuracy', value: `${avgAcc}%`, color: '#10b981', icon: '🎯' },
                        { label: 'Competitions', value: studentComps.length, color: '#7c3aed', icon: '📊' },
                    ].map((s, i) => (
                        <div key={i} className="glass-card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', marginBottom: '4px' }}>{s.icon}</div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Charts */}
                {studentPerformances.length > 0 ? (
                    <div className="grid-2" style={{ marginBottom: '24px' }}>
                        <div className="glass-card">
                            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '16px' }}>📈 WPM & Score Progress</h3>
                            <Bar data={chartData} options={{
                                responsive: true,
                                plugins: { legend: { labels: { color: 'var(--text-secondary)' } } },
                                scales: {
                                    x: { ticks: { color: 'var(--text-muted)' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                                    y: { ticks: { color: 'var(--text-muted)' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                                },
                            }} />
                        </div>
                        <div className="glass-card">
                            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '16px' }}>🎯 Average Accuracy</h3>
                            <div style={{ maxWidth: '250px', margin: '0 auto' }}>
                                <Doughnut data={accuracyData} options={{
                                    responsive: true,
                                    plugins: { legend: { labels: { color: 'var(--text-secondary)' } } },
                                }} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
                        <p style={{ color: 'var(--text-muted)' }}>No competition data yet for this student.</p>
                    </div>
                )}

                {/* Competition History Table */}
                {studentPerformances.length > 0 && (
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--bg-glass-border)' }}>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>All Results</h3>
                        </div>
                        <table className="data-table">
                            <thead><tr><th>#</th><th>Date</th><th>WPM</th><th>Accuracy</th><th>Score</th><th>Mistakes</th></tr></thead>
                            <tbody>
                                {studentPerformances.map((p, i) => (
                                    <tr key={i}>
                                        <td style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{i + 1}</td>
                                        <td style={{ fontSize: '13px' }}>{p.date ? new Date(p.date).toLocaleDateString() : '-'}</td>
                                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 700 }}>{p.wpm}</td>
                                        <td style={{ fontFamily: 'var(--font-mono)', color: p.accuracy >= 90 ? 'var(--accent-success)' : 'var(--accent-warning)' }}>{p.accuracy}%</td>
                                        <td style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--rank-gold)' }}>{p.score}</td>
                                        <td style={{ color: 'var(--accent-danger)' }}>{p.mistakes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    }
}
