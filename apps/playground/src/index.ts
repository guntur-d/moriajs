/**
 * MoriaJS Playground
 *
 * A minimal application to test the MoriaJS framework.
 * Run with: pnpm dev (uses tsx for direct TS execution)
 */

import { createApp, defineConfig } from '@moriajs/core';
import path from 'node:path';

const __appRoot = path.resolve(import.meta.dirname, '..');

const config = defineConfig({
    mode: 'development',
    rootDir: __appRoot,
    server: {
        port: 3000,
        logLevel: 'info',
    },
});

async function main() {
    const app = await createApp({ config });

    // Start the server
    const address = await app.listen();
    console.log(`\n🏔️  MoriaJS Playground running at ${address}\n`);
}

main().catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
});
