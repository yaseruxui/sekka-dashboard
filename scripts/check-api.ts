/**
 * Checks the public API against the site's own contracts (resources/js/contracts),
 * the same way sekka-next parses it. Run: npm run check:api [base-url]
 */
import { projectSchema } from '../resources/js/contracts/project';
import { contactInfoSchema, homeMediaSchema, policySchema } from '../resources/js/contracts/schema';

const base = (process.argv[2] ?? process.env.APP_URL ?? 'http://localhost:8000').replace(/\/$/, '');
let failed = false;

function report(label: string, r: { success: boolean; error?: { issues: unknown[] } }) {
    if (r.success) console.log(`ok    ${label}`);
    else {
        failed = true;
        console.error(`FAIL  ${label}`, JSON.stringify(r.error?.issues.slice(0, 5), null, 2));
    }
}

const projects = await (await fetch(`${base}/api/public/projects`)).json();
report(`projects (${Array.isArray(projects) ? projects.length : '?'})`, projectSchema.array().safeParse(projects));

const content = await (await fetch(`${base}/api/public/content`)).json();
if (content.home) report('content.home', homeMediaSchema.safeParse(content.home));
if (content.contact) report('content.contact', contactInfoSchema.safeParse(content.contact));
if (content.policy) {
    report('content.policy.ar', policySchema.safeParse(content.policy.ar));
    report('content.policy.en', policySchema.nullable().safeParse(content.policy.en ?? null));
}
if (content.messages) {
    const ok = ['ar', 'en'].every((l) => content.messages[l] && typeof content.messages[l] === 'object');
    report('content.messages', ok ? { success: true } : { success: false, error: { issues: ['ar/en must be objects'] } });
}

process.exitCode = failed ? 1 : 0;
