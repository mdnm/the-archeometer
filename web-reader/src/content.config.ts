import { defineCollection, z } from 'astro:content';

import { glob } from 'astro/loaders';

const englishTranslationDrafts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/english-translation-drafts" }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    youtubeEmbedLink: z.string(),
    youtubeEmbedTitle: z.string(),
  }),
});

export const collections = {
  'english-translation-drafts': englishTranslationDrafts,
};