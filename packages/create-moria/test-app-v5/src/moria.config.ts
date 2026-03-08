import { defineConfig } from '@moriajs/core';

export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 3000,
  },
  database: {
    adapter: 'sqlite',
    filename: './dev.db',
  },
  vite: {
    clientEntry: '/src/entry-client.ts',
  },
});
