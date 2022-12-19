import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      formats: ['umd'],
      name: 'providerKeeper',
    },
    emptyOutDir: false,
  },
});
