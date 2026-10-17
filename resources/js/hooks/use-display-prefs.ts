import { useState } from 'react';

/**
 * Per-device display preferences (Settings → Appearance), kept in
 * localStorage next to the theme. Font size and reduced motion are applied
 * on <html> before first paint by the script in app.blade.php.
 */
export type FontSize = 'sm' | 'md' | 'lg';

export interface DisplayPrefs {
    fontSize: FontSize;
    reduceMotion: boolean;
    notificationToasts: boolean;
    notificationSound: boolean;
}

const KEY = 'display-prefs';
const DEFAULTS: DisplayPrefs = { fontSize: 'md', reduceMotion: false, notificationToasts: true, notificationSound: true };
export const FONT_SIZES: Record<FontSize, string> = { sm: '15px', md: '16px', lg: '17.5px' };

export function readDisplayPrefs(): DisplayPrefs {
    try {
        const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
        return {
            fontSize: saved.fontSize in FONT_SIZES ? saved.fontSize : DEFAULTS.fontSize,
            reduceMotion: typeof saved.reduceMotion === 'boolean' ? saved.reduceMotion : DEFAULTS.reduceMotion,
            notificationToasts: typeof saved.notificationToasts === 'boolean' ? saved.notificationToasts : DEFAULTS.notificationToasts,
            notificationSound: typeof saved.notificationSound === 'boolean' ? saved.notificationSound : DEFAULTS.notificationSound,
        };
    } catch {
        return DEFAULTS;
    }
}

function applyDisplayPrefs(p: DisplayPrefs) {
    const html = document.documentElement;
    html.style.fontSize = FONT_SIZES[p.fontSize];
    html.classList.toggle('reduce-motion', p.reduceMotion);
}

export function useDisplayPrefs() {
    const [prefs, setPrefs] = useState<DisplayPrefs>(readDisplayPrefs);

    const update = (patch: Partial<DisplayPrefs>) => {
        const next = { ...prefs, ...patch };
        try {
            localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
            /* private mode: applies for this page only */
        }
        applyDisplayPrefs(next);
        setPrefs(next);
    };

    return { prefs, update };
}
