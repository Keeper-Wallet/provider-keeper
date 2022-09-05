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
          entryFileNames: 'provider-keeper.umd.js',
          format: 'umd',
          exports: 'named',
        },
      ],
    },
    emptyOutDir: false,
  },
});
