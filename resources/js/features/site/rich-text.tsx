import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Bold, Heading2, Italic, Link2, List, ListOrdered, RemoveFormatting } from 'lucide-react';
import { useEffect, useRef } from 'react';

/**
 * A small editor for the privacy policy: paragraphs, headings, bold / italic,
 * lists and links (what the site allows; the server cleans the rest out).
 */
export function RichText({ value, onChange, dir = 'rtl', invalid }: { value: string; onChange: (html: string) => void; dir?: 'rtl' | 'ltr'; invalid?: boolean }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value;
    }, [value]);

    const exec = (cmd: string, arg?: string) => {
        ref.current?.focus();
        document.execCommand(cmd, false, arg);
        onChange(ref.current?.innerHTML ?? '');
    };

    const tools: [React.ElementType, string, () => void][] = [
        [Heading2, 'عنوان فرعي', () => exec('formatBlock', 'h2')],
        [Bold, 'عريض', () => exec('bold')],
        [Italic, 'مائل', () => exec('italic')],
        [List, 'قائمة نقطية', () => exec('insertUnorderedList')],
        [ListOrdered, 'قائمة مرقّمة', () => exec('insertOrderedList')],
        [
            Link2,
            'رابط',
            () => {
                const url = window.prompt('الرابط (https://… أو mailto:…)');
                if (url) exec('createLink', url);
            },
        ],
        [RemoveFormatting, 'إزالة التنسيق', () => exec('removeFormat')],
    ];

    return (
        <div className={cn('rounded-md border', invalid && 'border-destructive')}>
            <div className="bg-muted/40 flex flex-wrap gap-0.5 border-b p-1">
                {tools.map(([Icon, label, run]) => (
                    <Button key={label} type="button" size="icon" variant="ghost" className="size-8" title={label} aria-label={label} onMouseDown={(e) => e.preventDefault()} onClick={run}>
                        <Icon className="size-4" />
                    </Button>
                ))}
                <Button type="button" variant="ghost" size="sm" className="h-8" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('formatBlock', 'p')}>
                    فقرة
                </Button>
            </div>
            <div
                ref={ref}
                dir={dir}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-multiline="true"
                onInput={() => onChange(ref.current?.innerHTML ?? '')}
                className="prose-sm max-h-[60vh] min-h-64 overflow-y-auto p-4 leading-8 outline-none [&_a]:underline [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_ol]:list-decimal [&_ol]:ps-6 [&_p]:my-2 [&_ul]:list-disc [&_ul]:ps-6"
            />
        </div>
    );
}
