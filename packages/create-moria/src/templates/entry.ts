/**
 * create-moria - app entry, client entry, and middleware templates.
 * Single function per concept parameterized by language (no TS/JS duplication).
 */

import type { TemplateLang } from './config.js';

export function srcIndex(lang: TemplateLang): string {
    if (lang === 'ts') {
        return `/**
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
console.log(\`\\n🏔️  MoriaJS running at \${address}\\n\`);
`;
    }
    return `/**
 * App entry point — starts the MoriaJS server.
 */

import { createApp } from '@moriajs/core';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __appRoot = path.resolve(__dirname, '..');

const configPath = pathToFileURL(path.resolve(__dirname, 'moria.config.js')).href;
const { default: config } = await import(configPath);

const app = await createApp({
    config: {
        ...config,
        mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
        rootDir: __appRoot,
    },
});

// Start listening (registers routes and starts the server)
const address = await app.listen();
console.log(\`\\n🏔️  MoriaJS running at \${address}\\n\`);
`;
}

export function srcEntryClient(_lang: TemplateLang): string {
    return `/**
 * Client-side entry point.
 * Hydrates the server-rendered page to make it interactive.
 */

import '@hotwired/turbo';
import { bootstrap } from '@moriajs/renderer';

// Automatically discover and hydrate the correct page component.
// We only include pages, not API routes.
document.addEventListener('turbo:load', () => {
    bootstrap(import.meta.glob('./routes/pages/**/*.{ts,js,tsx,jsx}')).catch(console.error);
});
`;
}

export function srcMiddleware(lang: TemplateLang): string {
    if (lang === 'ts') {
        return `/**
 * Root middleware — runs on every request.
 */

    import { defineMiddleware } from '@moriajs/core';

    export default defineMiddleware(async (request) => {
        request.log.info(\`→ \${request.method} \${request.url}\`);
});
`;
    }
    return `/**
 * Root middleware — runs on every request.
 */

export default async function middleware(request) {
    request.log.info(\`→ \${request.method} \${request.url}\`);
}
`;
}
