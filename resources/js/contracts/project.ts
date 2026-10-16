import { z } from 'zod';
import { blockSchema } from './blocks';

/** Aspect ratios used by project covers, matching the capture's data. */
export const aspectSchema = z.enum(['4:5', '16:9', '9:16', '1:1', '3:4', '21:9']);
export type Aspect = z.infer<typeof aspectSchema>;

/**
 * A single project. The fixed fields come from the dashboard's project form;
 * everything under the hero is the `blocks` artboard (see ./blocks).
 */
export const projectSchema = z.object({
  slug: z.string().min(1),
  title: z.string(),
  /** Short description: the card, the hero's lede, and the meta description. */
  summary: z.string(),
  category: z.string(),
  year: z.string(),
  /** Still image: poster for the clip, social card, next-project banner. */
  cover: z.string(),
  /** The card's clip; also the case page's hero. */
  preview: z.string().nullable(),
  /** The card's ratio in the work grid. */
  aspect: aspectSchema,
  blocks: z.array(blockSchema).default([]),
});

export type Project = z.infer<typeof projectSchema>;
