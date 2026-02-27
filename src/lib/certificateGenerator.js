/**
 * PDF Certificate Generator using Canvas API
 * Generates a styled participation/winner certificate and downloads it as PNG
 */

export function generateCertificate({ studentName, eventTitle, rank, wpm, date }) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 800);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.5, '#1e293b');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 800);

    // Decorative border
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, 1140, 740);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 40, 1120, 720);

    // Corner decorations
    const cornerSize = 40;
    const corners = [[50, 50], [1150, 50], [50, 750], [1150, 750]];
    corners.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, cornerSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
    });

    // Top accent line
    const topGrad = ctx.createLinearGradient(200, 0, 1000, 0);
    topGrad.addColorStop(0, 'transparent');
    topGrad.addColorStop(0.3, '#2563eb');
    topGrad.addColorStop(0.5, '#7c3aed');
    topGrad.addColorStop(0.7, '#2563eb');
    topGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = topGrad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(200, 80);
    ctx.lineTo(1000, 80);
    ctx.stroke();

    // Trophy emoji (text)
    ctx.font = '64px serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆', 600, 160);

    // Title
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.letterSpacing = '8px';
    ctx.fillText('CERTIFICATE OF', 600, 210);

    const titleGrad = ctx.createLinearGradient(200, 220, 1000, 280);
    titleGrad.addColorStop(0, '#fbbf24');
    titleGrad.addColorStop(0.5, '#f59e0b');
    titleGrad.addColorStop(1, '#d97706');
    ctx.fillStyle = titleGrad;
    ctx.font = 'bold 48px Georgia, serif';
    ctx.fillText(rank === '1' || rank === 1 ? 'ACHIEVEMENT' : 'PARTICIPATION', 600, 275);

    // Bottom accent
    ctx.strokeStyle = topGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(300, 300);
    ctx.lineTo(900, 300);
    ctx.stroke();

    // "This is to certify that"
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px Georgia, serif';
    ctx.fillText('This is to certify that', 600, 345);

    // Student Name
    const nameGrad = ctx.createLinearGradient(300, 350, 900, 400);
    nameGrad.addColorStop(0, '#38bdf8');
    nameGrad.addColorStop(1, '#818cf8');
    ctx.fillStyle = nameGrad;
    ctx.font = 'bold 42px Georgia, serif';
    ctx.fillText(studentName || 'Student', 600, 400);

    // Underline for name
    const nameWidth = ctx.measureText(studentName || 'Student').width;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(600 - nameWidth / 2, 415);
    ctx.lineTo(600 + nameWidth / 2, 415);
    ctx.stroke();

    // Event participation text
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '16px Georgia, serif';
    ctx.fillText('has successfully participated in', 600, 460);

    // Event Title
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 28px Georgia, serif';
    ctx.fillText(`"${eventTitle}"`, 600, 505);

    // Stats Row
    const statsY = 560;
    const stats = [];
    if (rank && rank !== '-') stats.push({ label: 'RANK', value: `#${rank}` });
    if (wpm && wpm !== '-') stats.push({ label: 'WPM', value: wpm.toString() });
    if (date) stats.push({ label: 'DATE', value: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) });

    const statWidth = 160;
    const startX = 600 - ((stats.length * statWidth) / 2) + statWidth / 2;
    stats.forEach((stat, i) => {
        const x = startX + i * statWidth;
        // Box
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        ctx.roundRect(x - 60, statsY - 15, 120, 55, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.stroke();
        // Value
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 20px Arial, sans-serif';
        ctx.fillText(stat.value, x, statsY + 8);
        // Label
        ctx.fillStyle = '#64748b';
        ctx.font = '10px Arial, sans-serif';
        ctx.fillText(stat.label, x, statsY + 30);
    });

    // Footer
    ctx.strokeStyle = topGrad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(200, 660);
    ctx.lineTo(1000, 660);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '12px Arial, sans-serif';
    ctx.fillText('Powered by Z Typers — InSuite', 600, 695);

    // Signature area
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(150, 720);
    ctx.lineTo(350, 720);
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Arial, sans-serif';
    ctx.fillText('Organizer', 250, 740);

    ctx.beginPath();
    ctx.moveTo(850, 720);
    ctx.lineTo(1050, 720);
    ctx.stroke();
    ctx.fillText('Verified', 950, 740);

    // Download as PNG
    const link = document.createElement('a');
    link.download = `Certificate_${(studentName || 'student').replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}
