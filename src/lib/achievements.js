// Achievement badge definitions
// Each badge has: id, label, icon, description, condition key

export const BADGES = [
    {
        id: 'speedster_50',
        label: '⚡ Speed Racer',
        icon: '⚡',
        description: 'Achieved 50 WPM',
        color: '#3b82f6',
        bg: 'rgba(59,130,246,0.12)',
        border: 'rgba(59,130,246,0.3)',
    },
    {
        id: 'speedster_100',
        label: '🚀 Century Typist',
        icon: '🚀',
        description: 'Achieved 100 WPM',
        color: '#8b5cf6',
        bg: 'rgba(139,92,246,0.12)',
        border: 'rgba(139,92,246,0.3)',
    },
    {
        id: 'speedster_150',
        label: '🔥 Blazing Fingers',
        icon: '🔥',
        description: 'Achieved 150 WPM',
        color: '#f97316',
        bg: 'rgba(249,115,22,0.12)',
        border: 'rgba(249,115,22,0.3)',
    },
    {
        id: 'accuracy_100',
        label: '🎯 Perfect Shot',
        icon: '🎯',
        description: '100% Accuracy',
        color: '#10b981',
        bg: 'rgba(16,185,129,0.12)',
        border: 'rgba(16,185,129,0.3)',
    },
    {
        id: 'winner',
        label: '🏆 Champion',
        icon: '🏆',
        description: 'Won a competition (Top 3)',
        color: '#d97706',
        bg: 'rgba(217,119,6,0.12)',
        border: 'rgba(217,119,6,0.3)',
    },
    {
        id: 'competitor_5',
        label: '🎮 Competitor',
        icon: '🎮',
        description: 'Completed 5 competitions',
        color: '#6366f1',
        bg: 'rgba(99,102,241,0.12)',
        border: 'rgba(99,102,241,0.3)',
    },
    {
        id: 'competitor_10',
        label: '💪 Veteran',
        icon: '💪',
        description: 'Completed 10 competitions',
        color: '#0ea5e9',
        bg: 'rgba(14,165,233,0.12)',
        border: 'rgba(14,165,233,0.3)',
    },
    {
        id: 'first_login',
        label: '👋 Welcome',
        icon: '👋',
        description: 'First login to Playground',
        color: '#84cc16',
        bg: 'rgba(132,204,22,0.12)',
        border: 'rgba(132,204,22,0.3)',
    },
];

/**
 * Returns array of badge IDs that should be newly awarded
 * based on updated student stats.
 */
export function checkNewBadges(student, wpm, accuracy, rank) {
    const current = Array.isArray(student.badges) ? student.badges : [];
    const newBadges = [];

    const award = (id) => {
        if (!current.includes(id)) newBadges.push(id);
    };

    // First login
    award('first_login');

    // WPM milestones
    if (wpm >= 50) award('speedster_50');
    if (wpm >= 100) award('speedster_100');
    if (wpm >= 150) award('speedster_150');

    // Accuracy
    if (accuracy >= 100) award('accuracy_100');

    // Competition count
    const comps = (student.totalCompetitions || 0) + 1;
    if (comps >= 5) award('competitor_5');
    if (comps >= 10) award('competitor_10');

    // Winner (rank 1, 2, or 3)
    if (rank && rank <= 3) award('winner');

    return newBadges;
}

/** Get badge info by id */
export function getBadge(id) {
    return BADGES.find(b => b.id === id);
}
