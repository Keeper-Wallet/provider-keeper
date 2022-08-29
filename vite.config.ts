import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'providerKeeper',
    },
    rollupOptions: {
      output: [
        {
          entryFileNames: 'provider-keeper.cjs.js',
          format: 'cjs',
        },
        {
          entryFileNames: 'provider-keeper.es.js',
          format: 'es',
        },
      ],
    },
    minify: false,
  },
});
