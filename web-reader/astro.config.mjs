// @ts-check
import partytown from '@astrojs/partytown';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/static';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  integrations: [
    tailwind(),
    partytown({
      config: {
        forward: ["dataLayer.push"],
      },
    }),
  ],
  output: 'static',
  adapter: vercel({
    webAnalytics: {
      enabled: true
    }
  }),
  site: 'https://thearcheometer.com'
});
