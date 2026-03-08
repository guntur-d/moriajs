/**
 * Vite integration for MoriaJS.
 *
 * Provides Vite dev server in middleware mode (development)
 * and static file serving for production builds.
 */

import type { FastifyInstance } from 'fastify';
import type { ViteDevServer } from 'vite';
import { type MoriaConfig } from './config.js';

/**
 * Attach Vite dev server to Fastify in middleware mode.
 * This enables HMR and on-the-fly module transformation.
 */
export async function createViteDevMiddleware(
    server: FastifyInstance,
    config: Partial<MoriaConfig> = {}
): Promise<ViteDevServer> {
    const { createServer: createViteServer } = await import('vite');
    const middie = (await import('@fastify/middie')).default;

    // Register Express-style middleware support
    await server.register(middie);

    const vite = await createViteServer({
        root: config.rootDir ?? process.cwd(),
        configFile: config.vite?.configFile,
        server: {
            middlewareMode: true,
            hmr: true,
        },
        optimizeDeps: {
            // Explicitly include Mithril to ensure it's pre-bundled reliably
            // for SSR hydration, avoiding 404s in .vite/deps
            include: ['mithril'],
        },
        appType: 'custom',
    });

    // Use Vite's connect middleware stack
    server.use(vite.middlewares);

    server.log.info('Vite dev server attached (HMR enabled)');

    // Ensure Vite is closed when Fastify shuts down
    server.addHook('onClose', async () => {
        await vite.close();
    });

    return vite;
}

/**
 * Serve production-built client assets via @fastify/static.
 */
export async function serveProductionAssets(
    server: FastifyInstance,
    config: Partial<MoriaConfig> = {}
): Promise<void> {
    const path = await import('node:path');
    const fastifyStatic = (await import('@fastify/static')).default;

    const distDir = path.resolve(config.rootDir ?? process.cwd(), 'dist', 'client');

    await server.register(fastifyStatic, {
        root: distDir,
        prefix: '/assets/',
        decorateReply: false,
    });

    server.log.info(`Serving static assets from ${distDir}`);
}

/**
 * Generate the HTML shell for a page, with appropriate script tags
 * depending on dev vs production mode.
 */
export async function getHtmlScripts(mode: 'development' | 'production', config: Partial<MoriaConfig> = {}): Promise<string> {
    const clientEntry = config.vite?.clientEntry ?? '/src/entry-client.ts';

    if (mode === 'development') {
        return [
            `<script type="module" src="/@vite/client"></script>`,
            `<script type="module" src="${clientEntry}"></script>`,
        ].join('\n    ');
    }

    // Production: reference the built bundle via manifest
    const rootDir = config.rootDir ?? process.cwd();
    const fs = await import('node:fs');
    const path = await import('node:path');
    const fullManifestPath = path.resolve(rootDir, 'dist/client/.vite/manifest.json');

    if (fs.existsSync(fullManifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(fullManifestPath, 'utf-8'));
        // Vite manifest keys are relative to root, usually 'src/entry-client.ts' or similar
        // We need to match it against our clientEntry (dropping leading slash)
        const entryKey = clientEntry.startsWith('/') ? clientEntry.slice(1) : clientEntry;
        const entry = manifest[entryKey];

        if (entry && entry.file) {
            return `<script type="module" src="/assets/${entry.file}"></script>`;
        }
    }
    return `<script type="module" src="/assets/entry-client.js"></script>`;
}
