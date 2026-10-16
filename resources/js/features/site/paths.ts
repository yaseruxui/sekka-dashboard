/** Read / immutably write a dotted path ("gallery.big.src", "caseList.0.video"). */
export function getPath(obj: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((o, k) => (o != null && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
}

export function setPath<T>(obj: T, path: string, value: unknown): T {
    const [k, ...rest] = path.split('.');
    const base: Record<string, unknown> | unknown[] = Array.isArray(obj) ? [...obj] : { ...((obj as Record<string, unknown>) ?? {}) };
    const current = (base as Record<string, unknown>)[k];
    (base as Record<string, unknown>)[k] = rest.length ? setPath(current ?? (/^\d+$/.test(rest[0]) ? [] : {}), rest.join('.'), value) : value;
    return base as T;
}

/** Leaf string keys under a dictionary namespace, e.g. "home.about.aria". Lists are left out. */
export function leafKeys(dict: unknown, prefix: string): string[] {
    if (typeof dict === 'string') return [prefix];
    if (!dict || typeof dict !== 'object' || Array.isArray(dict)) return [];
    return Object.entries(dict as Record<string, unknown>).flatMap(([k, v]) => leafKeys(v, prefix ? `${prefix}.${k}` : k));
}

export function clone<T>(v: T): T {
    return v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T);
}
