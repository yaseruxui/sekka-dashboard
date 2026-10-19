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
export type SelectField = { kind: 'select'; doc: Doc; path: string; label: string; hint?: string; options: [string, string][] };
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
/** The home page's services: pick and order from the services list. */
/** Pick and order items for a home section: services, or projects for the work reel. */
export type PickField = { kind: 'pick'; doc: 'home'; path: 'serviceIds' | 'workReelIds'; label: string; source: 'services' | 'projects' };

export type Field =
    | TextField
    | ValueField
    | NumberField
    | MediaField
    | SelectField
    | SwitchField
    | ListField
    | PolicyFieldDef
    | LeftoversField
    | PickField;

export interface Section {
    id: string;
    title: string;
    description: string;
    fields: Field[];
    /** Indexes of fields shown side by side with the field after them. */
    pairs?: number[];
}

export interface SitePage {
    id: 'home' | 'work' | 'contact' | 'policy' | 'not-found' | 'maintenance' | 'menu';
    title: string;
    description: string;
    path: string;
    sections: Section[];
}

const strip = (html: unknown) =>
    String(html ?? '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;|&mdash;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
const t = (key: string, label: string, extra: Partial<TextField> = {}): TextField => ({ kind: 'text', key, label, ...extra });
const media = (doc: Doc, path: string, label: string, accept: Accept, hint?: string): MediaField => ({
    kind: 'media',
    doc,
    path,
    label,
    accept,
    hint,
});

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
            {
                kind: 'select',
                name: 'aspect',
                label: 'شكل الإطار',
                options: [
                    // The capture's exact portrait value, so existing tiles keep matching it.
                    ['128.53470437017995%', 'طولي'],
                    ['56.25%', 'عرضي (16:9)'],
                ],
            },
            { kind: 'select', name: 'fit', label: 'طريقة العرض', options: FITS },
            { kind: 'switch', name: 'tint', label: 'تظليل' },
        ],
        blank: { src: '', aspect: '128.53470437017995%', fit: 'cover', tint: true },
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
                    t('home.heroEyebrow', 'السطر الصغير'),
                    t('home.heroSubtitle', 'وصف الموقع', { hint: 'يظهر في نتائج البحث وعند مشاركة الرابط.', multiline: true, max: 160 }),
                    media('home', 'heroVideo', 'فيديو الخلفية', 'video'),
                ],
            },
            {
                id: 'intro',
                title: 'التعريف وشعارات العملاء',
                description: 'جملة التعريف وشعارات العملاء المتحركة وسرعتها.',
                fields: [
                    t('home.introTitle', 'جملة التعريف', { html: true, multiline: true }),
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
                    {
                        kind: 'select',
                        doc: 'home',
                        path: 'gallery.big.fit',
                        label: 'طريقة عرض الفيديو الكبير',
                        options: FITS,
                    },
                    {
                        kind: 'switch',
                        doc: 'home',
                        path: 'gallery.big.tint',
                        label: 'تظليل الفيديو الكبير',
                    },
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
                description: 'أي خدمات تظهر بالرئيسية وبأي ترتيب. الضغط على خدمة يفتح واتساب باسمها.',
                fields: [
                    t('home.caseList.whatsapp', 'رسالة واتساب', { hint: '{service} يتغيّر لاسم الخدمة.' }),
                    { kind: 'pick', doc: 'home', path: 'serviceIds', label: 'الخدمات الظاهرة', source: 'services' },
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
                                {
                                    kind: 'list',
                                    name: 'facts',
                                    label: 'الأرقام',
                                    fields: [
                                        { name: 'value', label: 'الرقم' },
                                        { name: 'label', label: 'الوصف' },
                                    ],
                                    addLabel: 'إضافة رقم',
                                },
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
                description: 'أي مشاريع تظهر في الشريط وبأي ترتيب.',
                fields: [
                    t('home.workReel.title', 'عنوان القسم'),
                    { kind: 'pick', doc: 'home', path: 'workReelIds', label: 'المشاريع الظاهرة', source: 'projects' },
                ],
            },
            {
                id: 'story',
                title: 'القصة',
                description: 'عنوان القسم وفيديو الخلفية.',
                fields: [t('home.storyTitle', 'العنوان', { html: true }), media('home', 'storyVideo', 'فيديو الخلفية', 'video')],
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
                description: 'العنوان الصغير والعنوان والوصف.',
                fields: [t('work.kicker', 'العنوان الصغير'), t('work.title', 'العنوان'), t('work.sub', 'الوصف', { multiline: true })],
            },
            {
                id: 'ask',
                title: 'دعوة التواصل',
                description: 'الصندوق اللي يدعو للتواصل عبر واتساب.',
                fields: [
                    t('work.indexAsk.line', 'العنوان في صفحة الأعمال'),
                    t('work.indexAsk.note', 'الوصف في صفحة الأعمال', { multiline: true }),
                    t('work.indexAsk.message', 'رسالة واتساب من صفحة الأعمال', { multiline: true }),
                    t('work.caseAsk.line', 'العنوان في صفحة المشروع'),
                    t('work.caseAsk.note', 'الوصف في صفحة المشروع', { multiline: true }),
                    t('work.caseAsk.message', 'رسالة واتساب من صفحة المشروع', { multiline: true, hint: '{title} يتغيّر لاسم المشروع.' }),
                ],
            },
            {
                id: 'seo',
                title: 'محركات البحث',
                description: 'عنوان الصفحة ووصفها في نتائج البحث.',
                fields: [t('work.metaTitle', 'عنوان الصفحة'), t('work.description', 'الوصف', { multiline: true, max: 160 })],
            },
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
                    {
                        kind: 'value',
                        doc: 'contact',
                        path: 'whatsappNumber',
                        label: 'رقم واتساب',
                        ltr: true,
                        hint: 'أرقام فقط مع رمز الدولة، مثل 966537396405.',
                    },
                    { kind: 'value', doc: 'contact', path: 'mapUrl', label: 'رابط الخريطة', ltr: true, type: 'url' },
                    t('contact.street', 'العنوان'),
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
                id: 'form',
                title: 'نموذج التواصل',
                description: 'عنوان النموذج ووصفه.',
                fields: [t('contact.form.title', 'عنوان النموذج'), t('contact.form.subtitle', 'الوصف')],
            },
            {
                id: 'seo',
                title: 'محركات البحث',
                description: 'عنوان الصفحة ووصفها في نتائج البحث.',
                fields: [t('contact.metaTitle', 'عنوان الصفحة'), t('contact.metaDescription', 'الوصف', { multiline: true, max: 160 })],
            },
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
                fields: [
                    t('policy.title', 'عنوان الصفحة'),
                    t('policy.metaTitle', 'العنوان في نتائج البحث'),
                    t('policy.metaDescription', 'الوصف', { multiline: true, max: 160 }),
                ],
            },
        ],
    },
    {
        id: 'not-found',
        title: 'صفحة 404',
        description: 'لما الزائر يفتح رابط غير موجود.',
        path: '/404',
        sections: [
            {
                id: 'page',
                title: 'صفحة 404',
                description: 'الفيديو والعنوان.',
                fields: [media('home', 'notFoundVideo', 'الفيديو', 'video'), t('common.notFound.title', 'العنوان')],
            },
        ],
    },
    {
        id: 'maintenance',
        title: 'وضع الصيانة',
        description: 'لما يكون شغّال، كل صفحات الموقع بتعرض شاشة الصيانة بدل محتواها.',
        path: '/',
        sections: [
            {
                id: 'state',
                title: 'التشغيل',
                description: 'يظهر على الموقع خلال دقائق من الحفظ.',
                fields: [
                    {
                        kind: 'switch',
                        doc: 'home',
                        path: 'maintenance',
                        label: 'تشغيل وضع الصيانة',
                        hint: 'الزوار بيشوفوا شاشة الصيانة بس، ومحركات البحث ما بتأرشفها.',
                    },
                ],
            },
            {
                id: 'page',
                title: 'شاشة الصيانة',
                description: 'بنفس تصميم صفحة 404 وفيديوها.',
                fields: [t('common.maintenance.title', 'العنوان'), t('common.maintenance.body', 'النص', { multiline: true })],
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
                description: 'سؤال القائمة ورسالة واتساب.',
                fields: [
                    t('navigation.menuPrompt', 'سؤال في القائمة'),
                    t('navigation.whatsappGreeting', 'رسالة واتساب من القائمة', { multiline: true }),
                ],
            },
            {
                id: 'footer',
                title: 'الفوتر',
                description: 'جملة آخر الصفحة.',
                fields: [t('footer.text', 'الجملة', { html: true, multiline: true })],
            },
        ],
    },
];

/** Texts the site no longer reads: kept out of the leftovers card. */
const RETIRED = ['home.introTitleMobile', 'home.caseList.items', 'home.workReel.tiles'];

/** Every text key a section shows (for working out the leftovers). */
export function usedTextKeys(): Set<string> {
    const keys = new Set<string>(RETIRED);
    for (const page of SITE_PAGES)
        for (const s of page.sections)
            for (const f of s.fields) {
                if (f.kind === 'text') keys.add(f.key);
                if (f.kind === 'list' && f.texts) keys.add(f.texts.key);
            }
    return keys;
}
