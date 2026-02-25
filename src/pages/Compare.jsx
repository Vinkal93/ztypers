import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FiBarChart2, FiSearch } from 'react-icons/fi';

export default function Compare() {
    const [students, setStudents] = useState([]);
    const [studentA, setStudentA] = useState(null);
    const [studentB, setStudentB] = useState(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStudents();
    }, []);

    const loadStudents = async () => {
        try {
            const snap = await getDocs(collection(db, 'users'));
            const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setStudents(users);
        } catch (err) {
            console.error('Error:', err);
        }
        setLoading(false);
    };

    const filteredStudents = students.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase())
    );

    const CompareCard = ({ student, label }) => (
        <div className="glass-card" style={{ flex: 1 }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div className="avatar avatar-lg" style={{ margin: '0 auto 12px', width: '70px', height: '70px', fontSize: '28px' }}>
                    {student?.name?.[0] || '?'}
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px' }}>{student?.name || 'Select Student'}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{student?.email || ''}</p>
            </div>
            {student && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <StatRow label="Best WPM" value={student.bestWPM || 0} color="var(--accent-primary)" />
                    <StatRow label="Total Competitions" value={student.totalCompetitions || 0} color="var(--accent-secondary)" />
                    <StatRow label="Global Rank" value={student.rank || '-'} color="var(--rank-gold)" />
                </div>
            )}
        </div>
    );

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <h1 className="page-title"><FiBarChart2 style={{ marginRight: '8px' }} /> Compare Students</h1>
                <p className="page-subtitle">Side-by-side performance comparison</p>
            </div>

            {/* Search */}
            <div style={{ marginBottom: '24px', position: 'relative' }}>
                <FiSearch style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="text" className="input" placeholder="Search students by name or email..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    style={{ paddingLeft: '40px', maxWidth: '500px' }} />
            </div>

            {/* Student Selector */}
            <div className="grid-2" style={{ marginBottom: '24px' }}>
                <div>
                    <label className="input-label">Student A</label>
                    <select className="input" value={studentA?.id || ''} onChange={e => {
                        const s = students.find(s => s.id === e.target.value);
                        setStudentA(s);
                    }}>
                        <option value="">Select student...</option>
                        {filteredStudents.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="input-label">Student B</label>
                    <select className="input" value={studentB?.id || ''} onChange={e => {
                        const s = students.find(s => s.id === e.target.value);
                        setStudentB(s);
                    }}>
                        <option value="">Select student...</option>
                        {filteredStudents.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Comparison */}
            <div style={{ display: 'flex', gap: '24px', alignItems: 'stretch', flexWrap: 'wrap' }}>
                <CompareCard student={studentA} label="A" />
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '28px', fontWeight: 800, color: 'var(--text-muted)',
                    fontFamily: 'var(--font-display)', minWidth: '60px',
                }}>
                    VS
                </div>
                <CompareCard student={studentB} label="B" />
            </div>

            {/* Visual Comparison Bars */}
            {studentA && studentB && (
                <div className="glass-card" style={{ marginTop: '24px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '20px' }}>Performance Comparison</h3>
                    <ComparisonBar label="Best WPM" valueA={studentA.bestWPM || 0} valueB={studentB.bestWPM || 0}
                        nameA={studentA.name} nameB={studentB.name} />
                    <ComparisonBar label="Total Competitions" valueA={studentA.totalCompetitions || 0} valueB={studentB.totalCompetitions || 0}
                        nameA={studentA.name} nameB={studentB.name} />
                </div>
            )}
        </div>
    );
}

function StatRow({ label, value, color }) {
    return (
        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-glass)'
        }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{label}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '18px', color }}>{value}</span>
        </div>
    );
}

function ComparisonBar({ label, valueA, valueB, nameA, nameB }) {
    const max = Math.max(valueA, valueB, 1);
    const pctA = (valueA / max) * 100;
    const pctB = (valueB / max) * 100;

    return (
        <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>{label}</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ width: '80px', fontSize: '12px', color: 'var(--text-muted)' }}>{nameA}</span>
                <div style={{ flex: 1, height: '24px', borderRadius: '12px', background: 'var(--bg-glass)', overflow: 'hidden' }}>
                    <div style={{
                        width: `${pctA}%`, height: '100%', borderRadius: '12px',
                        background: 'linear-gradient(90deg, #00d4ff, #7c3aed)',
                        transition: 'width 0.8s ease', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px',
                        fontSize: '11px', fontWeight: 700, color: 'white',
                    }}>{valueA}</div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ width: '80px', fontSize: '12px', color: 'var(--text-muted)' }}>{nameB}</span>
                <div style={{ flex: 1, height: '24px', borderRadius: '12px', background: 'var(--bg-glass)', overflow: 'hidden' }}>
                    <div style={{
                        width: `${pctB}%`, height: '100%', borderRadius: '12px',
                        background: 'linear-gradient(90deg, #ec4899, #f59e0b)',
                        transition: 'width 0.8s ease', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px',
                        fontSize: '11px', fontWeight: 700, color: 'white',
                    }}>{valueB}</div>
                </div>
            </div>
        </div>
    );
}
