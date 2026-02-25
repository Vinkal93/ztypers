// Ranking calculation utilities for Z Typers

/**
 * Calculate WPM (Words Per Minute)
 * @param {number} correctWords - Number of correctly typed words
 * @param {number} elapsedSeconds - Time elapsed in seconds
 * @returns {number} WPM rounded to 1 decimal
 */
export function calculateWPM(correctWords, elapsedSeconds) {
    if (elapsedSeconds <= 0) return 0;
    const minutes = elapsedSeconds / 60;
    return Math.round((correctWords / minutes) * 10) / 10;
}

/**
 * Calculate Accuracy percentage
 * @param {number} correctChars - Number of correctly typed characters
 * @param {number} totalChars - Total characters typed (including mistakes)
 * @returns {number} Accuracy percentage rounded to 1 decimal
 */
export function calculateAccuracy(correctChars, totalChars) {
    if (totalChars <= 0) return 100;
    return Math.round((correctChars / totalChars) * 1000) / 10;
}

/**
 * Calculate Final Score
 * Formula: WPM × (Accuracy / 100)
 */
export function calculateFinalScore(wpm, accuracy) {
    return Math.round(wpm * (accuracy / 100) * 10) / 10;
}

/**
 * Sort participants by ranking rules:
 * 1. Highest Final Score
 * 2. If tie → Higher Accuracy
 * 3. If tie → Lower Mistake Count
 */
export function rankParticipants(participants) {
    return [...participants].sort((a, b) => {
        // 1. Higher final score wins
        if (b.score !== a.score) return b.score - a.score;
        // 2. Higher accuracy wins
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        // 3. Fewer mistakes wins
        return (a.mistakes || 0) - (b.mistakes || 0);
    }).map((p, index) => ({ ...p, rank: index + 1 }));
}

/**
 * Format time from seconds to MM:SS
 */
export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
