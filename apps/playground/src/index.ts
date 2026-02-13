/**
 * MoriaJS Playground
 *
 * A minimal application to test the MoriaJS framework.
 * Run with: pnpm dev (uses tsx for direct TS execution)
 */

import { createApp, defineConfig } from '@moriajs/core';

const config = defineConfig({
    server: {
        port: 3000,
        logLevel: 'info',
    },
});

async function main() {
    const app = await createApp({ config });

    // Example route
    app.server.get('/', async () => {
        return {
            framework: 'MoriaJS',
            version: '0.0.1',
            message: '🏔️ Welcome to MoriaJS — The Mithril.js Meta-Framework',
            routes: {
                health: '/health',
                api: '/api (coming soon)',
            },
        };
    });

    // Start the server
    const address = await app.listen();
    console.log(`\n🏔️  MoriaJS Playground running at ${address}\n`);
}

main().catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
});
