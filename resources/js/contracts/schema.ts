import { z } from 'zod';

/**
 * Everything on the site that the dashboard edits besides projects. Shared
 * contract: the dashboard keeps a verbatim copy (resources/js/contracts).
 *
 * Every section is optional on the wire: what the dashboard does not send (or
 * sends invalid) falls back to the bundled defaults (./defaults), section by
 * section, so a bad edit never takes a page down.
 */

export const fitSchema = z.enum(['cover', 'contain', 'backdrop', 'backdrop-s']);

const src = z.string().min(1);

const galleryTileSchema = z.object({
    src,
    /** Spacer ratio (height / width) as a CSS percentage, e.g. "128.5%". */
    aspect: z.string().min(1),
    fit: fitSchema,
    tint: z.boolean(),
});

export const homeMediaSchema = z.object({
    /** Full-screen clip behind the hero. */
    heroVideo: src,
    /** §2 gallery: one big clip and three columns of three. */
    gallery: z.object({
        big: z.object({ src, fit: fitSchema, tint: z.boolean() }),
        start: z.array(galleryTileSchema),
        mid: z.array(galleryTileSchema),
        end: z.array(galleryTileSchema),
    }),
    /** One clip per service card, same order as home.caseList.items in the texts. */
    caseList: z.array(z.object({ video: src, fit: fitSchema, gradient: z.string() })),
    /** Work reel stills and their links; titles are home.workReel.tiles in the texts. */
    workReel: z.array(z.object({ src, href: z.string().min(1) })),
    /** Client marks: `tight` for the small intro reel, `full` for the story reel. */
    clientLogos: z.array(z.object({ name: z.string(), tight: src, full: src })),
    /** Seconds each mark stays in the reel. */
    reelStepS: z.number().positive().max(10),
    about: z.object({ region: src, peopleFlag: src, studio: src, impact: src }),
    storyVideo: src,
    notFoundVideo: src,
    /** Where the 404 page's button goes. */
    notFoundHref: z.optional(z.string()),
});

export const contactInfoSchema = z.object({
    email: z.email(),
    phone: z.string(),
    /** Digits only, with country code: used for wa.me links. */
    whatsappNumber: z.string().regex(/^\d{6,16}$/),
    heroVideo: src,
    mapUrl: z.url(),
    /** Shown in this order; empty urls are hidden. */
    socials: z.array(z.object({ platform: z.string().min(1), url: z.string() })),
});

export const policySchema = z.object({
    updated: z.string(),
    title: z.string(),
    /** Sanitised HTML: p, a, strong, lists, emphasis. */
    html: z.string(),
});

/** Locale dictionaries (next-intl), deep-merged over the bundled ones. */
const dictionary = z.record(z.string(), z.unknown());

export const siteContentSchema = z.object({
    home: homeMediaSchema,
    contact: contactInfoSchema,
    policy: z.object({ ar: policySchema, en: policySchema.nullable() }),
    messages: z.object({ ar: dictionary, en: dictionary }),
});

export type SiteContent = z.infer<typeof siteContentSchema>;
export type HomeMedia = z.infer<typeof homeMediaSchema>;
export type ContactInfo = z.infer<typeof contactInfoSchema>;
