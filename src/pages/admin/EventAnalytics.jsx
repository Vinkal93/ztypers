import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useParams, Link } from 'react-router-dom';
import { FiUsers, FiDollarSign, FiDownload, FiArrowLeft, FiAward, FiBarChart2, FiFileText } from 'react-icons/fi';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import * as XLSX from 'xlsx';
import { generateCertificate } from '../../lib/certificateGenerator';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function EventAnalytics() {
    const { eventId } = useParams();
    const [event, setEvent] = useState(null);
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!eventId) return;
        // Fetch event
        const unsub1 = onSnapshot(collection(db, 'events'), (snap) => {
            const ev = snap.docs.find(d => d.id === eventId);
            if (ev) setEvent({ id: ev.id, ...ev.data() });
        });

        // Fetch enrollments
        const q = query(collection(db, 'event_enrollments'), where('eventId', '==', eventId));
        const unsub2 = onSnapshot(q, (snap) => {
            setEnrollments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });

        return () => { unsub1(); unsub2(); };
    }, [eventId]);

    const revenue = enrollments.length * (event?.entryFee || 0);

    const exportCSV = () => {
        const data = enrollments.map((e, i) => ({
            '#': i + 1,
            'Name': e.name,
            'Email': e.email || '-',
            'Phone': e.phone || '-',
            'Enrolled At': e.enrolledAt ? new Date(e.enrolledAt).toLocaleString() : '-',
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Enrollments');
        XLSX.writeFile(wb, `${event?.title || 'event'}_enrollments.xlsx`);
    };

    const handleDownloadCertificate = (enrollment) => {
        generateCertificate({
            studentName: enrollment.name,
            eventTitle: event?.title || 'Typing Competition',
            rank: '-',
            wpm: '-',
            date: event?.eventDate || new Date().toISOString().split('T')[0],
        });
    };

    // Chart data — enrollment timeline
    const enrollmentByDate = {};
    enrollments.forEach(e => {
        const date = e.enrolledAt ? new Date(e.enrolledAt).toLocaleDateString() : 'Unknown';
        enrollmentByDate[date] = (enrollmentByDate[date] || 0) + 1;
    });
    const chartData = {
        labels: Object.keys(enrollmentByDate),
        datasets: [{
            label: 'Enrollments',
            data: Object.values(enrollmentByDate),
            backgroundColor: 'rgba(37, 99, 235, 0.6)',
            borderColor: 'rgba(37, 99, 235, 1)',
            borderWidth: 1,
            borderRadius: 6,
        }],
    };
    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
            title: { display: true, text: 'Enrollment Timeline', font: { size: 14, weight: 'bold' } },
        },
        scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
    };

    if (loading) return <div className="page-container fade-in" style={{ textAlign: 'center', paddingTop: '100px' }}><div className="timer">Loading...</div></div>;

    return (
        <div className="page-container fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <Link to="/admin/events" style={{ color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                        <FiArrowLeft size={14} /> Back to Events
                    </Link>
                    <h1 className="page-title">📈 {event?.title || 'Event'} Analytics</h1>
                    <p className="page-subtitle">Track enrollments, revenue, and participant data</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={exportCSV} className="btn btn-secondary" disabled={enrollments.length === 0}>
                        <FiDownload /> Export Excel
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid-4" style={{ marginBottom: '28px' }}>
                {[
                    { icon: <FiUsers size={22} />, value: enrollments.length, label: 'Total Enrollments', color: '#2563eb' },
                    { icon: <FiDollarSign size={22} />, value: `₹${revenue}`, label: 'Total Revenue', color: '#059669' },
                    { icon: <FiAward size={22} />, value: `₹${event?.prize || 0}`, label: 'Prize Pool', color: '#d97706' },
                    { icon: <FiBarChart2 size={22} />, value: event?.difficulty || 'Medium', label: 'Difficulty', color: '#7c3aed' },
                ].map((s, i) => (
                    <div key={i} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '50px', height: '50px', borderRadius: 'var(--radius-md)',
                            background: `${s.color}15`, color: s.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{s.icon}</div>
                        <div>
                            <div className="stat-value" style={{ fontSize: '24px' }}>{s.value}</div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Chart */}
            {enrollments.length > 0 && (
                <div className="glass-card" style={{ marginBottom: '24px', padding: '20px' }}>
                    <Bar data={chartData} options={chartOptions} />
                </div>
            )}

            {/* Enrollment Table */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bg-glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px' }}>
                        <FiUsers style={{ marginRight: '8px' }} />Enrolled Participants
                    </h2>
                    <span className="badge badge-active">{enrollments.length} enrolled</span>
                </div>
                {enrollments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No enrollments yet</div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Enrolled At</th>
                                    <th>Certificate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {enrollments.map((e, i) => (
                                    <tr key={e.id}>
                                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)' }}>{i + 1}</td>
                                        <td style={{ fontWeight: 600 }}>{e.name}</td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{e.email || '-'}</td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{e.phone || '-'}</td>
                                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            {e.enrolledAt ? new Date(e.enrolledAt).toLocaleString() : '-'}
                                        </td>
                                        <td>
                                            <button onClick={() => handleDownloadCertificate(e)} className="btn btn-sm btn-secondary" title="Download Certificate">
                                                <FiFileText size={12} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
