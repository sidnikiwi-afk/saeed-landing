import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://brackstonedigital.co.uk',
  output: 'static',
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes('/premier-housing-demo') && !page.includes('/preview'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
