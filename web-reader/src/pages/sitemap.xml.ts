import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const pages = [
  '',
  '/natal-chart',
];

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    return new Response('Site URL not configured', { status: 500 });
  }

  const posts = await getCollection('english-translation-drafts');
  const sortedPosts = posts.sort((a, b) => a.data.date.localeCompare(b.data.date));

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
      ${sortedPosts
        .map((post) => `
          <url>
            <loc>${new URL(`/english-translation-drafts/${post.id}`, site).toString()}</loc>
            <lastmod>${new Date(post.data.date).toISOString()}</lastmod>
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