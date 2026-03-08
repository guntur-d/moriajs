/**
 * App entry point — starts the MoriaJS server.
 */

import { createApp } from '@moriajs/core';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const configPath = pathToFileURL(path.resolve(import.meta.dirname, 'moria.config.js')).href;
const { default: config } = await import(configPath);

const app = await createApp({
    config: {
        ...config,
        mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
        rootDir: path.resolve(import.meta.dirname, '..'),
    },
});

// Start listening (registers routes and starts the server)
const address = await app.listen();
console.log(`\n🏔️  MoriaJS running at ${address}\n`);
