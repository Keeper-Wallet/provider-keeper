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
      ],
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
