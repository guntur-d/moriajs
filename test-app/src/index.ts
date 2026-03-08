/**
 * App entry point — starts the MoriaJS server.
 */

import { createApp } from '@moriajs/core';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

async function main() {
    const configPath = pathToFileURL(path.resolve(import.meta.dirname, 'moria.config.js')).href;
    const { default: config } = await import(configPath);

    const app = await createApp({
        config: {
            ...config,
            mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
            rootDir: path.resolve(import.meta.dirname, '..'),
        },
    });

    const address = await app.listen();
    console.log(`\n🏔️  MoriaJS running at ${address}\n`);
}

main().catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
});
