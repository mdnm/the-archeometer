import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const pages = [
  '',
  '/natal-chart',
  '/archeometer',
];

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    return new Response('Site URL not configured', { status: 500 });
  }

  const chapters = await getCollection('chapters');
  const sorted = chapters.sort((a, b) => a.data.chapter - b.data.chapter);

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${pages
        .map((page) => `
          <url>
            <loc>${new URL(page, site).toString()}</loc>
            <lastmod>${new Date().toISOString()}</lastmod>
            <changefreq>monthly</changefreq>
            <priority>${page === '' ? '1.0' : '0.8'}</priority>
          </url>
        `)
        .join('')}
      ${sorted
        .map((ch) => `
          <url>
            <loc>${new URL(`/chapters/${ch.id.replace(/\.mdx?$/, '')}`, site).toString()}</loc>
            <lastmod>${new Date().toISOString()}</lastmod>
            <changefreq>monthly</changefreq>
            <priority>0.7</priority>
          </url>
        `)
        .join('')}
    </urlset>`.trim(),
    {
      headers: {
        'Content-Type': 'application/xml',
      },
    }
  );
};
