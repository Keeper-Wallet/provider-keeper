import { defineConfig } from 'vite';

export default defineConfig({
  root: 'test-app',
  build: {
    rollupOptions: {
      input: {
        index: 'test-app/index.html',
      },
    },
  },
});
