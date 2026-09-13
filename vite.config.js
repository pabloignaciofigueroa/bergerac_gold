import { defineConfig } from 'vite';
import { pages } from './src/content/seo-pages.js';

export default defineConfig({
  base: '/',
  server: { port: 5173, strictPort: true },
  build: { target: 'es2022', rolldownOptions: { input: ['index.html','bergerac.html','404.html',...pages.map(page=>`.${page.path}index.html`)] } },
});
