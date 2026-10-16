/**
 * JSON calls to the dashboard outside Inertia visits (autosave, media
 * picker, uploads). Laravel reads the CSRF token from the XSRF-TOKEN cookie.
 */
function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

export class HttpError extends Error {
    constructor(
        public status: number,
        public body: { message?: string; errors?: Record<string, string[]> } | null,
    ) {
        super(body?.message || `HTTP ${status}`);
    }

    /** The first validation message, if any. */
    get firstError(): string {
        const errors = this.body?.errors;
        return (errors && Object.values(errors)[0]?.[0]) || this.message;
    }
}

export async function api<T>(url: string, options: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
    const res = await fetch(url, {
        method: options.method ?? 'GET',
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': xsrfToken(),
            ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        credentials: 'same-origin',
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: options.signal,
    });
    const json = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) throw new HttpError(res.status, json);
    return json as T;
}

/** multipart POST with upload progress (0..1). */
export function postForm<T>(url: string, form: FormData, onProgress?: (p: number) => void): Promise<T> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.setRequestHeader('X-XSRF-TOKEN', xsrfToken());
        xhr.withCredentials = true;
        xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
        xhr.onload = () => {
            let json: unknown = null;
            try {
                json = JSON.parse(xhr.responseText);
            } catch {
                /* not JSON */
            }
            if (xhr.status >= 200 && xhr.status < 300) resolve(json as T);
            else reject(new HttpError(xhr.status, json as HttpError['body']));
        };
        xhr.onerror = () => reject(new HttpError(0, { message: 'تعذّر الاتصال بالسيرفر.' }));
        xhr.send(form);
    });
}
