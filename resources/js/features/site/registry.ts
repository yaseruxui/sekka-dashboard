/**
 * "التحكم بالموقع": every site page as the sections a visitor sees, each with
 * its fields. Texts point into the next-intl dictionaries (ar / en), media and
 * values into the home / contact documents (siteContentSchema).
 */

export type Doc = 'home' | 'contact';
export type Accept = 'image' | 'video' | 'any';

export const FITS: [string, string][] = [
    ['cover', 'ملء الإطار'],
    ['contain', 'داخل الإطار'],
    ['backdrop', 'خلفية'],
    ['backdrop-s', 'خلفية مصغّرة'],
];

/** A text in ar / en (a key in the dictionaries). */
export type TextField = { kind: 'text'; key: string; label: string; hint?: string; multiline?: boolean; html?: boolean; max?: number; ltr?: boolean };
/** A plain value in a document (same in both languages). */
export type ValueField = { kind: 'value'; doc: Doc; path: string; label: string; hint?: string; ltr?: boolean; type?: 'email' | 'url' | 'tel' };
export type NumberField = { kind: 'number'; doc: Doc; path: string; label: string; hint?: string; min: number; max: number; step: number };
export type MediaField = { kind: 'media'; doc: Doc; path: string; label: string; hint?: string; accept: Accept };
export type SelectField = { kind: 'select'; doc: Doc; path: string; label: string; options: [string, string][] };
export type SwitchField = { kind: 'switch'; doc: Doc; path: string; label: string; hint?: string };

/** Fields of one item in a list. */
export type ItemField =
    | { kind: 'value'; name: string; label: string; ltr?: boolean; hint?: string }
    | { kind: 'media'; name: string; label: string; accept: Accept }
    | { kind: 'select'; name: string; label: string; options: [string, string][] }
    | { kind: 'switch'; name: string; label: string };
/** Text fields of one item (ar / en); `facts`-style nested lists are one level deep. */
export type ItemText =
    | { kind?: 'text'; name: string; label: string; html?: boolean; multiline?: boolean }
    | { kind: 'list'; name: string; label: string; fields: { name: string; label: string }[]; addLabel: string };

/**
 * A repeatable list. Its items can carry texts (a list in the dictionaries,
 * strings or objects), document data (media, links), or both, paired by
 * position (the site pairs them the same way).
 */
export type ListField = {
    kind: 'list';
    label: string;
    hint?: string;
    itemLabel: (index: number, text: unknown, data: Record<string, unknown> | undefined) => string;
    addLabel: string;
    texts?: { key: string; fields: ItemText[] | null; blank: unknown };
    data?: { doc: Doc; path: string; fields: ItemField[]; blank: Record<string, unknown> };
    thumb?: string;
};
export type PolicyFieldDef = { kind: 'policy' };
/** Any texts of these namespaces no section shows (so nothing is out of reach). */
export type LeftoversField = { kind: 'leftovers'; namespaces: string[] };

export type Field = TextField | ValueField | NumberField | MediaField | SelectField | SwitchField | ListField | PolicyFieldDef | LeftoversField;

export interface Section {
    id: string;
    title: string;
    description: string;
    fields: Field[];
}

export interface SitePage {
    id: 'home' | 'work' | 'contact' | 'policy' | 'menu';
    title: string;
    description: string;
    path: string;
    sections: Section[];
}

const strip = (html: unknown) => String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&mdash;/g, ' ').replace(/\s+/g, ' ').trim();
const t = (key: string, label: string, extra: Partial<TextField> = {}): TextField => ({ kind: 'text', key, label, ...extra });
const media = (doc: Doc, path: string, label: string, accept: Accept, hint?: string): MediaField => ({ kind: 'media', doc, path, label, accept, hint });

const galleryColumn = (path: string, label: string): ListField => ({
    kind: 'list',
    label,
    itemLabel: (i) => `عنصر ${i + 1}`,
    addLabel: 'إضافة عنصر',
    thumb: 'src',
    data: {
        doc: 'home',
        path,
        fields: [
            { kind: 'media', name: 'src', label: 'الصورة أو الفيديو', accept: 'any' },
            { kind: 'value', name: 'aspect', label: 'نسبة الارتفاع للعرض', ltr: true, hint: 'مثل 128.5% (أطول) أو 75% (أعرض).' },
            { kind: 'select', name: 'fit', label: 'طريقة العرض', options: FITS },
            { kind: 'switch', name: 'tint', label: 'تظليل' },
        ],
        blank: { src: '', aspect: '100%', fit: 'cover', tint: true },
    },
});

export const SITE_PAGES: SitePage[] = [
    {
        id: 'home',
        title: 'الصفحة الرئيسية',
        description: 'كل قسم يُحفظ لوحده ويظهر على الموقع فوراً. الحقل الفاضي يرجع للنص الأصلي.',
        path: '/',
        sections: [
            {
                id: 'hero',
                title: 'الواجهة',
                description: 'أول ما يشوفه الزائر: فيديو بملء الشاشة وسطر تعريفي.',
                fields: [
                    t('home.heroEyebrow', 'السطر الصغير', { hint: 'يظهر فوق الفيديو أسفل الشاشة.' }),
                    t('home.heroSubtitle', 'وصف الموقع', { hint: 'يظهر في نتائج البحث وعند مشاركة الرابط.', multiline: true, max: 160 }),
                    media('home', 'heroVideo', 'فيديو الخلفية', 'video'),
                    t('common.scrollDown', 'نص «مرّر للأسفل»'),
                ],
            },
            {
                id: 'intro',
                title: 'التعريف وشعارات العملاء',
                description: 'جملة التعريف وشعارات العملاء المتحركة وسرعتها.',
                fields: [
                    t('home.introTitle', 'جملة التعريف (ديسكتوب)', { html: true, multiline: true }),
                    t('home.introTitleMobile', 'جملة التعريف (جوال)', { html: true, multiline: true }),
                    {
                        kind: 'list',
                        label: 'شعارات العملاء',
                        itemLabel: (i, _t, d) => String(d?.name || `شعار ${i + 1}`),
                        addLabel: 'إضافة شعار',
                        thumb: 'full',
                        data: {
                            doc: 'home',
                            path: 'clientLogos',
                            fields: [
                                { kind: 'value', name: 'name', label: 'اسم العميل' },
                                { kind: 'media', name: 'tight', label: 'الشعار في شريط التعريف', accept: 'image' },
                                { kind: 'media', name: 'full', label: 'الشعار في شريط القصة', accept: 'image' },
                            ],
                            blank: { name: '', tight: '', full: '' },
                        },
                    },
                    { kind: 'number', doc: 'home', path: 'reelStepS', label: 'مدة ظهور كل شعار (ثوانٍ)', min: 0.5, max: 10, step: 0.5 },
                ],
            },
            {
                id: 'gallery',
                title: 'المعرض',
                description: 'فيديو كبير وثلاث أعمدة من الصور والفيديوهات.',
                fields: [
                    t('home.galleryTitle', 'عنوان المعرض', { html: true, multiline: true }),
                    media('home', 'gallery.big.src', 'الفيديو الكبير', 'any'),
                    { kind: 'select', doc: 'home', path: 'gallery.big.fit', label: 'طريقة عرض الفيديو الكبير', options: FITS },
                    { kind: 'switch', doc: 'home', path: 'gallery.big.tint', label: 'تظليل الفيديو الكبير' },
                    galleryColumn('gallery.start', 'العمود الأول'),
                    galleryColumn('gallery.mid', 'العمود الأوسط'),
                    galleryColumn('gallery.end', 'العمود الأخير'),
                ],
            },
            {
                id: 'statement',
                title: 'الجملة الافتتاحية',
                description: 'سطر كبير يلخّص ما تقدمه سكة.',
                fields: [t('home.statementTitle', 'الجملة', { html: true, multiline: true })],
            },
            {
                id: 'services',
                title: 'الخدمات',
                description: 'قائمة الخدمات، لكل خدمة فيديو. الضغط عليها يفتح واتساب باسم الخدمة.',
                fields: [
                    t('home.caseList.cta', 'نص الزر'),
                    t('home.caseList.whatsapp', 'رسالة واتساب', { hint: '{service} يُستبدل باسم الخدمة.' }),
                    {
                        kind: 'list',
                        label: 'الخدمات',
                        itemLabel: (i, text) => `${(text as { eyebrow?: string })?.eyebrow ?? String(i + 1).padStart(2, '0')} · ${strip((text as { title?: string })?.title) || 'خدمة جديدة'}`,
                        addLabel: 'إضافة خدمة',
                        thumb: 'video',
                        texts: {
                            key: 'home.caseList.items',
                            fields: [
                                { name: 'eyebrow', label: 'الرقم' },
                                { name: 'title', label: 'العنوان', html: true },
                                { name: 'subtitle', label: 'الوصف' },
                            ],
                            blank: { eyebrow: '', title: '', subtitle: '' },
                        },
                        data: {
                            doc: 'home',
                            path: 'caseList',
                            fields: [
                                { kind: 'media', name: 'video', label: 'الفيديو', accept: 'video' },
                                { kind: 'select', name: 'fit', label: 'طريقة عرض الفيديو', options: FITS },
                                { kind: 'value', name: 'gradient', label: 'لون التدرّج', ltr: true, hint: 'RGB مثل 0, 0, 0' },
                            ],
                            blank: { video: '', fit: 'backdrop', gradient: '0, 0, 0' },
                        },
                    },
                ],
            },
            {
                id: 'about',
                title: 'من نحن',
                description: 'مشاهد التعريف والأرقام والصور.',
                fields: [
                    {
                        kind: 'list',
                        label: 'المشاهد',
                        itemLabel: (i, text) => strip((text as { h?: string })?.h) || `مشهد ${i + 1}`,
                        addLabel: 'إضافة مشهد',
                        texts: {
                            key: 'home.about.scenes',
                            fields: [
                                { name: 'kicker', label: 'العنوان الصغير' },
                                { name: 'h', label: 'العنوان', html: true },
                                { name: 'line', label: 'السطر' },
                                { kind: 'list', name: 'facts', label: 'الأرقام', fields: [{ name: 'value', label: 'الرقم' }, { name: 'label', label: 'الوصف' }], addLabel: 'إضافة رقم' },
                            ],
                            blank: { kicker: '', h: '', line: '' },
                        },
                    },
                    t('home.about.closing', 'الجملة الختامية', { html: true, multiline: true }),
                    media('home', 'about.region', 'صورة المنطقة', 'image'),
                    media('home', 'about.peopleFlag', 'فيديو الجمهور', 'video'),
                    media('home', 'about.studio', 'فيديو الفريق', 'video'),
                    media('home', 'about.impact', 'فيديو الأثر', 'video'),
                ],
            },
            {
                id: 'workReel',
                title: 'شريط الأعمال',
                description: 'صور الأعمال وعناوينها وروابطها.',
                fields: [
                    t('home.workReel.title', 'عنوان القسم'),
                    {
                        kind: 'list',
                        label: 'الأعمال',
                        itemLabel: (i, text) => String(text || `عمل ${i + 1}`),
                        addLabel: 'إضافة عمل',
                        thumb: 'src',
                        texts: { key: 'home.workReel.tiles', fields: null, blank: '' },
                        data: {
                            doc: 'home',
                            path: 'workReel',
                            fields: [
                                { kind: 'media', name: 'src', label: 'الصورة', accept: 'image' },
                                { kind: 'value', name: 'href', label: 'الرابط', ltr: true, hint: 'مثل /work/chaos-campaign' },
                            ],
                            blank: { src: '', href: '/work' },
                        },
                    },
                ],
            },
            {
                id: 'story',
                title: 'القصة',
                description: 'عنوان القسم وفيديو الخلفية.',
                fields: [t('home.storyTitle', 'العنوان', { html: true }), media('home', 'storyVideo', 'فيديو الخلفية', 'video')],
            },
            {
                id: 'notFound',
                title: 'صفحة 404',
                description: 'لما الزائر يفتح رابط مش موجود.',
                fields: [
                    media('home', 'notFoundVideo', 'الفيديو', 'video'),
                    t('common.notFound.eyebrow', 'السطر الصغير'),
                    t('common.notFound.title', 'العنوان'),
                    t('common.notFound.cta', 'نص زر الرجوع'),
                ],
            },
            {
                id: 'more',
                title: 'نصوص إضافية',
                description: 'نصوص أخرى في الصفحة (وصف للقارئ الصوتي وغيرها).',
                fields: [{ kind: 'leftovers', namespaces: ['home'] }],
            },
        ],
    },
    {
        id: 'work',
        title: 'أعمالنا',
        description: 'نصوص صفحة الأعمال وصفحة المشروع. المشاريع نفسها من «المشاريع».',
        path: '/work',
        sections: [
            {
                id: 'header',
                title: 'رأس الصفحة',
                description: 'العنوان والأرقام والفلاتر.',
                fields: [
                    t('work.kicker', 'العنوان الصغير'),
                    t('work.title', 'العنوان'),
                    t('work.sub', 'الوصف', { multiline: true }),
                    t('work.statProjects', 'عدد المشاريع', { hint: '{count} يُستبدل بالعدد.' }),
                    t('work.statFields', 'عدد المجالات', { hint: '{count} يُستبدل بالعدد.' }),
                    t('work.filterAll', 'فلتر «الكل»'),
                ],
            },
            {
                id: 'ask',
                title: 'دعوة التواصل',
                description: 'الصندوق الذي يدعو للتواصل عبر واتساب.',
                fields: [
                    t('work.askCta', 'نص الزر'),
                    t('work.indexAsk.line', 'العنوان في صفحة الأعمال'),
                    t('work.indexAsk.note', 'الوصف في صفحة الأعمال', { multiline: true }),
                    t('work.indexAsk.message', 'رسالة واتساب من صفحة الأعمال', { multiline: true }),
                    t('work.caseAsk.line', 'العنوان في صفحة المشروع'),
                    t('work.caseAsk.note', 'الوصف في صفحة المشروع', { multiline: true }),
                    t('work.caseAsk.message', 'رسالة واتساب من صفحة المشروع', { multiline: true, hint: '{title} يُستبدل باسم المشروع.' }),
                ],
            },
            {
                id: 'case',
                title: 'صفحة المشروع',
                description: 'العناوين الثابتة في صفحة كل مشروع.',
                fields: [
                    t('work.metaClient', '«العميل»'),
                    t('work.metaYear', '«السنة»'),
                    t('work.metaCategory', '«المجال»'),
                    t('work.metaServices', '«الخدمات»'),
                    t('work.challenge', '«التحدي»'),
                    t('work.challengeKicker', 'فوق «التحدي»', { ltr: true }),
                    t('work.solution', '«الحل»'),
                    t('work.solutionKicker', 'فوق «الحل»', { ltr: true }),
                    t('work.result', '«النتيجة»'),
                    t('work.resultKicker', 'فوق «النتيجة»', { ltr: true }),
                    t('work.next', '«المشروع التالي»'),
                ],
            },
            {
                id: 'missing',
                title: 'مشروع غير موجود',
                description: 'لما الرابط يشير لمشروع محذوف.',
                fields: [t('work.missingTitle', 'العنوان'), t('work.missingSub', 'الوصف'), t('work.missingBack', 'نص زر الرجوع')],
            },
            {
                id: 'seo',
                title: 'محركات البحث',
                description: 'عنوان الصفحة ووصفها في نتائج البحث.',
                fields: [t('work.metaTitle', 'عنوان الصفحة'), t('work.description', 'الوصف', { multiline: true, max: 160 })],
            },
            { id: 'more', title: 'نصوص إضافية', description: 'نصوص أخرى في الصفحة.', fields: [{ kind: 'leftovers', namespaces: ['work'] }] },
        ],
    },
    {
        id: 'contact',
        title: 'تواصل معنا',
        description: 'بيانات التواصل والحسابات ونموذج الرسائل.',
        path: '/contact',
        sections: [
            {
                id: 'info',
                title: 'بيانات التواصل',
                description: 'تظهر في صفحة التواصل والقائمة وروابط واتساب.',
                fields: [
                    { kind: 'value', doc: 'contact', path: 'email', label: 'البريد الإلكتروني', ltr: true, type: 'email' },
                    { kind: 'value', doc: 'contact', path: 'phone', label: 'الهاتف', ltr: true, type: 'tel' },
                    { kind: 'value', doc: 'contact', path: 'whatsappNumber', label: 'رقم واتساب', ltr: true, hint: 'أرقام فقط مع رمز الدولة، مثل 966537396405.' },
                    { kind: 'value', doc: 'contact', path: 'mapUrl', label: 'رابط الخريطة', ltr: true, type: 'url' },
                    media('contact', 'heroVideo', 'فيديو الخلفية', 'video'),
                ],
            },
            {
                id: 'socials',
                title: 'حسابات التواصل',
                description: 'تظهر بهذا الترتيب؛ الحساب بدون رابط يختفي.',
                fields: [
                    {
                        kind: 'list',
                        label: 'الحسابات',
                        itemLabel: (i, _t, d) => String(d?.platform || `حساب ${i + 1}`),
                        addLabel: 'إضافة حساب',
                        data: {
                            doc: 'contact',
                            path: 'socials',
                            fields: [
                                { kind: 'value', name: 'platform', label: 'المنصة', ltr: true, hint: 'مثل instagram أو x أو linkedin' },
                                { kind: 'value', name: 'url', label: 'الرابط', ltr: true },
                            ],
                            blank: { platform: '', url: '' },
                        },
                    },
                    t('contact.socialsNote', 'السطر تحت الحسابات'),
                ],
            },
            {
                id: 'page',
                title: 'نصوص الصفحة',
                description: 'التبويبات والأزرار.',
                fields: [
                    t('contact.tabs.contact', 'تبويب الاستفسارات'),
                    t('contact.tabs.findUs', 'تبويب الموقع'),
                    t('contact.tabs.socials', 'تبويب الحسابات'),
                    t('contact.tabs.whatsapp', 'تبويب واتساب'),
                    t('contact.copyEmail', 'زر نسخ البريد'),
                    t('contact.street', 'العنوان'),
                    t('contact.city', 'نص رابط الاتجاهات'),
                    t('contact.whatsappCta', 'زر واتساب'),
                ],
            },
            {
                id: 'form',
                title: 'نموذج التواصل',
                description: 'عناوين الحقول والرسائل بعد الإرسال.',
                fields: [
                    t('contact.form.title', 'عنوان النموذج'),
                    t('contact.form.subtitle', 'الوصف'),
                    t('contact.form.fields.your_name', 'حقل الاسم'),
                    t('contact.form.fields.company', 'حقل الشركة'),
                    t('contact.form.fields.email', 'حقل البريد'),
                    t('contact.form.fields.message', 'حقل الرسالة'),
                    t('contact.form.fields.estimated_budget', 'حقل الميزانية'),
                    t('contact.form.consentBefore', 'الموافقة: قبل الرابط'),
                    t('contact.form.consentLink', 'الموافقة: نص الرابط'),
                    t('contact.form.consentAfter', 'الموافقة: بعد الرابط'),
                    t('contact.form.submit', 'زر الإرسال'),
                    t('contact.form.thx', 'رسالة الشكر'),
                    t('contact.form.invalid', 'رسالة بيانات ناقصة'),
                    t('contact.form.failed', 'رسالة فشل الإرسال', { hint: '{email} يُستبدل بالبريد.' }),
                ],
            },
            {
                id: 'seo',
                title: 'محركات البحث',
                description: 'عنوان الصفحة ووصفها في نتائج البحث.',
                fields: [t('contact.metaTitle', 'عنوان الصفحة'), t('contact.metaDescription', 'الوصف', { multiline: true, max: 160 })],
            },
            { id: 'more', title: 'نصوص إضافية', description: 'نصوص أخرى في الصفحة.', fields: [{ kind: 'leftovers', namespaces: ['contact'] }] },
        ],
    },
    {
        id: 'policy',
        title: 'سياسة الخصوصية',
        description: 'نص السياسة بالعربي (والإنجليزي اختياري).',
        path: '/policy',
        sections: [
            { id: 'text', title: 'نص السياسة', description: 'العنوان وتاريخ التحديث والنص.', fields: [{ kind: 'policy' }] },
            {
                id: 'seo',
                title: 'العنوان ومحركات البحث',
                description: 'عنوان الصفحة في القائمة ونتائج البحث.',
                fields: [t('policy.title', 'عنوان الصفحة'), t('policy.metaTitle', 'العنوان في نتائج البحث'), t('policy.metaDescription', 'الوصف', { multiline: true, max: 160 })],
            },
        ],
    },
    {
        id: 'menu',
        title: 'القائمة والفوتر',
        description: 'ما يظهر في كل الصفحات: القائمة والفوتر والأزرار.',
        path: '/',
        sections: [
            {
                id: 'brand',
                title: 'الاسم',
                description: 'اسم الموقع في عنوان المتصفح ونتائج البحث.',
                fields: [t('common.siteName', 'اسم الموقع'), t('common.tagline', 'الشعار النصي', { ltr: true })],
            },
            {
                id: 'nav',
                title: 'القائمة',
                description: 'روابط القائمة ودعوتها.',
                fields: [
                    t('navigation.work', 'رابط أعمالنا'),
                    t('navigation.contact', 'رابط تواصل معنا'),
                    t('navigation.privacy', 'رابط الخصوصية'),
                    t('navigation.openMenu', 'زر فتح القائمة'),
                    t('navigation.closeMenu', 'زر إغلاق القائمة'),
                    t('navigation.menuPrompt', 'سؤال في القائمة'),
                    t('navigation.menuPromptLink', 'رابط السؤال'),
                    t('navigation.whatsappGreeting', 'رسالة واتساب من القائمة', { multiline: true }),
                ],
            },
            {
                id: 'footer',
                title: 'الفوتر',
                description: 'آخر الصفحة.',
                fields: [t('footer.text', 'الجملة', { html: true, multiline: true }), t('footer.cta', 'نص الزر'), t('footer.copyright', 'حقوق النشر', { hint: '{year} يُستبدل بالسنة.' })],
            },
            {
                id: 'buttons',
                title: 'الأزرار والمؤشر',
                description: 'نصوص الأزرار العامة ومؤشر الفأرة.',
                fields: [
                    t('common.cta.getInTouch', 'زر «تواصل معنا»'),
                    t('common.cta.seeHow', 'زر «اكتشف كيف»'),
                    t('common.cta.explore', 'زر «استكشف»'),
                    t('common.cursor.view', 'المؤشر: عرض'),
                    t('common.cursor.copy', 'المؤشر: نسخ'),
                    t('common.cursor.copied', 'المؤشر: تم النسخ'),
                    t('common.cursor.findUs', 'المؤشر: الخريطة'),
                    t('common.cursor.visit', 'المؤشر: زيارة'),
                ],
            },
            { id: 'more', title: 'نصوص إضافية', description: 'نصوص أخرى عامة.', fields: [{ kind: 'leftovers', namespaces: ['navigation', 'footer', 'common'] }] },
        ],
    },
];

/** Every text key a section shows (for working out the leftovers). */
export function usedTextKeys(): Set<string> {
    const keys = new Set<string>();
    for (const page of SITE_PAGES)
        for (const s of page.sections)
            for (const f of s.fields) {
                if (f.kind === 'text') keys.add(f.key);
                if (f.kind === 'list' && f.texts) keys.add(f.texts.key);
            }
    return keys;
}
