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
        '@scure/base',
        '@waves/parse-json-bignumber',
        '@waves/signer',
        '@waves/ts-types',
        '@waves/waveskeeper-types',
        'mitt',
      ],
    },
    minify: false,
  },
});
