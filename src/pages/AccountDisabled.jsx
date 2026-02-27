import { useNavigate } from 'react-router-dom';
import { FiLock, FiMail, FiAlertTriangle } from 'react-icons/fi';

export default function AccountDisabled({ note, adminNote, onBack }) {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-primary)', padding: '24px',
        }}>
            <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
                {/* Icon */}
                <div style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 24px', fontSize: '36px',
                }}>
                    🔒
                </div>

                <h1 style={{
                    fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 800,
                    color: 'var(--accent-danger)', marginBottom: '12px',
                }}>
                    Account Disabled
                </h1>

                <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
                    Your account has been temporarily disabled by the administrator.
                </p>

                {/* Admin Note */}
                {(note || adminNote) && (
                    <div style={{
                        background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '24px', textAlign: 'left',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <FiAlertTriangle size={15} color="var(--accent-danger)" />
                            <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--accent-danger)' }}>Reason from Admin:</span>
                        </div>
                        <p style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: 1.6 }}>
                            "{note || adminNote}"
                        </p>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <a href="mailto:support@ztypers.com" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        padding: '14px 24px', borderRadius: 'var(--radius-md)',
                        background: 'var(--accent-gradient)', color: '#fff',
                        textDecoration: 'none', fontWeight: 600, fontSize: '14px',
                    }}>
                        <FiMail size={16} /> Contact Admin
                    </a>

                    <button
                        onClick={onBack || (() => window.location.reload())}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            padding: '14px 24px', borderRadius: 'var(--radius-md)',
                            background: 'var(--bg-glass)', color: 'var(--text-secondary)',
                            border: '1px solid var(--bg-glass-border)', cursor: 'pointer',
                            fontWeight: 600, fontSize: '14px', fontFamily: 'var(--font-primary)',
                        }}
                    >
                        ← Go Back
                    </button>
                </div>

                <p style={{ marginTop: '24px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    If you believe this is a mistake, contact your administrator.
                </p>
            </div>
        </div>
    );
}
