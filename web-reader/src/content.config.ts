import { defineCollection, z } from 'astro:content';

const englishTranslationDrafts = defineCollection({
  schema: z.object({
    title: z.string().optional(),
    date: z.string().optional(),
    youtubeEmbedLink: z.string().optional(),
    youtubeEmbedTitle: z.string().optional(),
  }),
});

export const collections = {
  'english-translation-drafts': englishTranslationDrafts,
};