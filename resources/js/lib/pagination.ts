/**
 * A Laravel paginator link label ("&laquo; Previous", "3", "...", "Next &raquo;")
 * as plain Arabic text, so it renders without HTML.
 */
export function pageLabel(label: string): string {
    if (/previous|&laquo;/i.test(label)) return 'السابق';
    if (/next|&raquo;/i.test(label)) return 'التالي';
    return label === '...' ? '…' : label;
}
