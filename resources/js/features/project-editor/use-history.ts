import { useCallback, useRef, useState } from 'react';

const LIMIT = 100;
/** Typing in the same field within this window is one undo step. */
const MERGE_MS = 800;

/**
 * State with undo / redo. `set(next, key)` records a step; consecutive sets
 * with the same key in quick succession (typing) collapse into one step.
 */
export function useHistory<T>(initial: T) {
    const [present, setPresent] = useState(initial);
    const past = useRef<T[]>([]);
    const future = useRef<T[]>([]);
    const last = useRef<{ key?: string; at: number }>({ at: 0 });
    const [, force] = useState(0);

    const set = useCallback((next: T | ((prev: T) => T), key?: string) => {
        setPresent((prev) => {
            const value = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
            if (value === prev) return prev;
            const now = Date.now();
            const merge = key !== undefined && last.current.key === key && now - last.current.at < MERGE_MS;
            if (!merge) {
                past.current = [...past.current.slice(-(LIMIT - 1)), prev];
            }
            future.current = [];
            last.current = { key, at: now };
            return value;
        });
        force((n) => n + 1);
    }, []);

    const undo = useCallback(() => {
        setPresent((prev) => {
            const target = past.current.at(-1);
            if (target === undefined) return prev;
            past.current = past.current.slice(0, -1);
            future.current = [prev, ...future.current];
            last.current = { at: 0 };
            return target;
        });
        force((n) => n + 1);
    }, []);

    const redo = useCallback(() => {
        setPresent((prev) => {
            const [target, ...rest] = future.current;
            if (target === undefined) return prev;
            future.current = rest;
            past.current = [...past.current, prev];
            last.current = { at: 0 };
            return target;
        });
        force((n) => n + 1);
    }, []);

    /** Replace without recording (e.g. fresh data from the server). */
    const reset = useCallback((value: T) => {
        past.current = [];
        future.current = [];
        last.current = { at: 0 };
        setPresent(value);
        force((n) => n + 1);
    }, []);

    return { present, set, undo, redo, reset, canUndo: past.current.length > 0, canRedo: future.current.length > 0 };
}
