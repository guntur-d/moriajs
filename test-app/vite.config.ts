import { defineConfig } from 'vite';

export default defineConfig({
  base: '/assets/',
  build: {
    outDir: 'dist/client',
    assetsDir: '',
    rollupOptions: {
      input: 'src/entry-client.ts',
    },
    manifest: true,
  },
});
