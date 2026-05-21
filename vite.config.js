import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        backstage: resolve(__dirname, 'backstage.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
});

