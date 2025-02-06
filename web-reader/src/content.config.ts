import { defineCollection, z } from 'astro:content';

import { glob } from 'astro/loaders';

const englishTranslationDrafts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/english-translation-drafts" }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    youtubeEmbedLink: z.string().optional(),
    youtubeEmbedTitle: z.string().optional(),
    description: z.string().optional(),
    image: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  }),
});

export const collections = {
  'english-translation-drafts': englishTranslationDrafts,
};