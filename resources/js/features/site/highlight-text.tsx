import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useRef, useState } from 'react';

/**
 * Texts the site renders with <em> (Sekka's green) and <br>, edited without
 * showing any markup: the text is typed plainly (Enter breaks the line), and
 * each word below is a chip that turns green on click. Stored back as the
 * same HTML the site expects, neighbouring green words sharing one <em>.
 */

type Word = { text: string; on: boolean };
type Lines = Word[][];

const TOKEN = /<br\s*\/?>|<\/?(?:em|strong)>|&nbsp;|<[^>]*>|[^<&]+|&/gi;

/** HTML → lines of words, each marked green or not. */
export function parseHighlight(html: string): Lines {
    const lines: { ch: string; on: boolean }[][] = [[]];
    let on = false;
    for (const [tok] of html.matchAll(TOKEN)) {
        const t = tok.toLowerCase();
        if (/^<br/.test(t)) lines.push([]);
        else if (t === '<em>' || t === '<strong>') on = true;
        else if (t === '</em>' || t === '</strong>') on = false;
        else if (t === '&nbsp;') lines[lines.length - 1].push({ ch: ' ', on });
        else if (t.startsWith('<')) continue;
        else for (const ch of tok) lines[lines.length - 1].push(ch === '\n' ? { ch: ' ', on } : { ch, on });
    }
    return lines.map((chars) => {
        const words: Word[] = [];
        let cur: { ch: string; on: boolean }[] = [];
        const flush = () => {
            if (cur.length) words.push({ text: cur.map((c) => c.ch).join(''), on: cur.some((c) => c.on) });
            cur = [];
        };
        for (const c of chars) {
            if (/\s/.test(c.ch)) flush();
            else cur.push(c);
        }
        flush();
        return words;
    });
}

/** Lines of words → the site's HTML. */
export function serializeHighlight(lines: Lines): string {
    return lines
        .map((words) => {
            let out = '';
            words.forEach((w, i) => {
                const prev = words[i - 1];
                const next = words[i + 1];
                if (i > 0) out += ' ';
                if (w.on && !prev?.on) out += '<em>';
                if (w.on && !next?.on) {
                    // A closing full stop or comma stays outside the colour.
                    const [, word, punct] = /^(.*?)([.,!?،؛:…]*)$/su.exec(w.text)!;
                    out += word ? `${word}</em>${punct}` : `${punct}</em>`;
                } else out += w.text;
            });
            return out;
        })
        .join('<br>');
}

const plainOf = (lines: Lines) => lines.map((ws) => ws.map((w) => w.text).join(' ')).join('\n');

/**
 * New plain text, keeping the green marks of words that survived the edit:
 * matched from the start and from the end of each line, so typing in the
 * middle doesn't shift the colours.
 */
function retype(plain: string, old: Lines): Lines {
    return plain.split('\n').map((line, li) => {
        const prev = old[li] ?? [];
        const words = line.split(/\s+/).filter(Boolean);
        const on = words.map(() => false);
        let a = 0;
        while (a < words.length && a < prev.length && words[a] === prev[a].text) on[a] = prev[a++].on;
        let b = 0;
        while (b < words.length - a && b < prev.length - a && words[words.length - 1 - b] === prev[prev.length - 1 - b].text) {
            on[words.length - 1 - b] = prev[prev.length - 1 - b].on;
            b++;
        }
        return words.map((text, i) => ({ text, on: on[i] }));
    });
}

export function HighlightText({
    value,
    onChange,
    placeholder,
    dir,
    id,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    dir: 'rtl' | 'ltr';
    id: string;
}) {
    const lines = parseHighlight(value);
    // The typed text lives here so spaces and empty lines survive mid-typing;
    // it resets only when the value changes from outside (locale, restore…).
    const [plain, setPlain] = useState(() => plainOf(lines));
    const emitted = useRef(value);
    if (value !== emitted.current) {
        emitted.current = value;
        setPlain(plainOf(lines));
    }
    const emit = (html: string) => {
        emitted.current = html;
        onChange(html);
    };

    // Empty: the chips show the default text, and clicking one adopts it.
    const chipLines = value.trim() ? lines : parseHighlight(placeholder ?? '');
    const toggle = (li: number, wi: number) => {
        const next = serializeHighlight(chipLines.map((ws, l) => ws.map((w, i) => (l === li && i === wi ? { ...w, on: !w.on } : w))));
        setPlain(plainOf(parseHighlight(next)));
        emit(next);
    };
    const hasWords = chipLines.some((ws) => ws.length > 0);

    return (
        <div className="grid gap-2">
            <Textarea
                id={id}
                dir={dir}
                rows={Math.max(2, plain.split('\n').length)}
                value={plain}
                placeholder={placeholder ? plainOf(parseHighlight(placeholder)) : undefined}
                onChange={(e) => {
                    setPlain(e.target.value);
                    emit(serializeHighlight(retype(e.target.value, lines)));
                }}
                className="text-sm leading-7"
            />
            {hasWords && (
                <div className="grid gap-1.5">
                    <p className="text-muted-foreground text-xs">اضغط على الكلمات اللي بدك تلوّنها بالأخضر. Enter لسطر جديد.</p>
                    <div dir={dir} className="grid gap-1.5" role="group" aria-label="تلوين الكلمات">
                        {chipLines.map(
                            (ws, li) =>
                                ws.length > 0 && (
                                    <div key={li} className="flex flex-wrap gap-1.5">
                                        {ws.map((w, wi) => (
                                            <button
                                                key={wi}
                                                type="button"
                                                aria-pressed={w.on}
                                                onClick={() => toggle(li, wi)}
                                                className={cn(
                                                    'rounded-full border px-3 py-1 text-sm transition-colors',
                                                    w.on
                                                        ? 'border-brand bg-brand font-medium text-neutral-950'
                                                        : 'bg-card text-foreground hover:bg-muted border-input',
                                                )}
                                            >
                                                {w.text}
                                            </button>
                                        ))}
                                    </div>
                                ),
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
