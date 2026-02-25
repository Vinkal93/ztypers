// Anti-cheat system for Z Typers

/**
 * Block copy-paste events on the typing area
 */
export function blockCopyPaste(element) {
    if (!element) return;

    const handler = (e) => {
        e.preventDefault();
        return false;
    };

    element.addEventListener('paste', handler);
    element.addEventListener('copy', handler);
    element.addEventListener('cut', handler);
    element.addEventListener('contextmenu', handler);

    return () => {
        element.removeEventListener('paste', handler);
        element.removeEventListener('copy', handler);
        element.removeEventListener('cut', handler);
        element.removeEventListener('contextmenu', handler);
    };
}

/**
 * Detect tab/window switching
 * @param {Function} onBlur - Callback when user leaves the tab
 * @param {Function} onFocus - Callback when user returns
 * @returns {Function} Cleanup function
 */
export function detectTabSwitch(onBlur, onFocus) {
    const handleVisibility = () => {
        if (document.hidden) {
            onBlur?.();
        } else {
            onFocus?.();
        }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', () => onBlur?.());
    window.addEventListener('focus', () => onFocus?.());

    return () => {
        document.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('blur', () => onBlur?.());
        window.removeEventListener('focus', () => onFocus?.());
    };
}

/**
 * Check for suspicious WPM spikes
 * If WPM jumps by more than 40 in less than 3 seconds, flag it
 */
export function checkSuspiciousSpeed(wpmHistory) {
    if (wpmHistory.length < 2) return false;
    const last = wpmHistory[wpmHistory.length - 1];
    const prev = wpmHistory[wpmHistory.length - 2];
    return (last.wpm - prev.wpm) > 40 && (last.time - prev.time) < 3000;
}

/**
 * Analyze typing rhythm consistency
 * Returns a consistency score 0-100 (lower = more suspicious)
 */
export function analyzeTypingRhythm(keystrokeLogs) {
    if (keystrokeLogs.length < 10) return 100;

    const intervals = [];
    for (let i = 1; i < keystrokeLogs.length; i++) {
        intervals.push(keystrokeLogs[i].timestamp - keystrokeLogs[i - 1].timestamp);
    }

    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Very low std deviation = bot-like typing
    if (stdDev < 10) return 20;
    // Very high std deviation = copy-paste bursts
    if (stdDev > avg * 2) return 40;

    return 100;
}
