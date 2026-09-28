/**
 * Vite integration for MoriaJS.
 *
 * Provides Vite dev server in middleware mode (development)
 * and static file serving for production builds.
 */

import type { FastifyInstance } from 'fastify';
import type { ViteDevServer } from 'vite';
import path from 'node:path';
import { type MoriaConfig } from './config.js';
import { CLIENT_OUTDIR, buildScriptTags } from './assets.js';

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
    const fastifyStatic = (await import('@fastify/static')).default;

    const distDir = path.resolve(config.rootDir ?? process.cwd(), CLIENT_OUTDIR);

    await server.register(fastifyStatic, {
        root: distDir,
        prefix: '/assets/',
        decorateReply: false,
    });

    server.log.info(`Serving static assets from ${distDir}`);
}

/**
 * Generate the HTML shell script tags for a page.
 * Canonical implementation lives in `./assets.js` — this stays
 * as the public entry point so existing imports keep working.
 */
export async function getHtmlScripts(mode: 'development' | 'production', config: Partial<MoriaConfig> = {}): Promise<string> {
    return buildScriptTags(mode, config);
}
