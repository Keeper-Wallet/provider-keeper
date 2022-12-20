import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    sourcemap: true,
    rollupOptions: {
      external: [
        /@waves\/ts-types/,
        /@waves\/waveskeeper-types/,
        /@waves\/marshall/,
        /typed-ts-events/,
      ],
    },
    minify: false,
  },
});
