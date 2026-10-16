import { z } from 'zod';

/**
 * The case-study artboard: an ordered list of blocks, Behance-style. The
 * dashboard adds, reorders, hides and styles them; the site only renders.
 *
 * Every block shares the same frame settings (background, spacing, width),
 * then carries the content of its own type.
 */

/** Vertical breathing room above / below a block. */
export const spacingSchema = z.enum(['none', 'sm', 'md', 'lg']);
export type Spacing = z.infer<typeof spacingSchema>;

/** A media file with its intrinsic size (read by the dashboard on upload). */
export const mediaSchema = z.object({
  src: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string().default(''),
});
export type Media = z.infer<typeof mediaSchema>;

const frame = {
  /** Stable id from the dashboard (keys, reordering). */
  id: z.string().min(1),
  /** Hidden blocks stay in the data but are not rendered. */
  hidden: z.boolean().default(false),
  /** Section background, any CSS colour; null = the page's black. */
  background: z.string().nullable().default(null),
  spacingTop: spacingSchema.default('md'),
  spacingBottom: spacingSchema.default('md'),
  /** 'contained' keeps the page margins; 'full' runs edge to edge. */
  width: z.enum(['contained', 'full']).default('contained'),
};

export const textBlockSchema = z.object({
  ...frame,
  type: z.literal('text'),
  title: z.string().default(''),
  /** Plain text; a blank line starts a new paragraph. */
  body: z.string().default(''),
  /** One reading column, title above the text (as Behance). */
  align: z.enum(['start', 'center']).default('start'),
});

export const imageBlockSchema = z.object({
  ...frame,
  type: z.literal('image'),
  media: mediaSchema,
  caption: z.string().default(''),
});

export const videoBlockSchema = z.object({
  ...frame,
  type: z.literal('video'),
  media: mediaSchema,
  poster: z.string().nullable().default(null),
  /** 'loop': silent, autoplaying, like a moving image. 'player': with controls. */
  mode: z.enum(['loop', 'player']).default('loop'),
  caption: z.string().default(''),
});

export const gridBlockSchema = z.object({
  ...frame,
  type: z.literal('grid'),
  /** Images and clips; each row keeps their ratios at one shared height. */
  items: z.array(mediaSchema).min(1),
  /** Items per row (the last row takes what is left). */
  perRow: z.number().int().min(1).max(4).default(2),
  /** Gap between items, px. */
  gap: z.number().int().min(0).max(64).default(16),
});

export const embedBlockSchema = z.object({
  ...frame,
  type: z.literal('embed'),
  /** A YouTube or Vimeo link. */
  url: z.string().url(),
  caption: z.string().default(''),
});

export const blockSchema = z.discriminatedUnion('type', [
  textBlockSchema,
  imageBlockSchema,
  videoBlockSchema,
  gridBlockSchema,
  embedBlockSchema,
]);

export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block['type'];
