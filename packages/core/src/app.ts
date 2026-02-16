import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import compress from '@fastify/compress';
import helmet from '@fastify/helmet';
import path from 'node:path';
import fs from 'node:fs';
import { type MoriaConfig } from './config.js';
import { type MoriaPlugin } from './plugins.js';
import { createViteDevMiddleware, serveProductionAssets } from './vite.js';
import { registerRoutes } from './router.js';
import type { ViteDevServer } from 'vite';

/**
 * Options for creating a MoriaJS application.
 */
export interface MoriaAppOptions {
    /** MoriaJS configuration (from moria.config.ts) */
    config?: Partial<MoriaConfig>;
    /** Additional Fastify server options */
    fastifyOptions?: FastifyServerOptions;
}

/**
 * The MoriaJS application instance.
 * Wraps a Fastify instance with framework-level features.
 */
export interface MoriaApp {
    /** The underlying Fastify instance */
    server: FastifyInstance;
    /** The Vite dev server (only in development mode) */
    vite?: ViteDevServer;
    /** Register a MoriaJS plugin */
    use: (plugin: MoriaPlugin) => Promise<void>;
    /** Start the server */
    listen: (options?: { port?: number; host?: string }) => Promise<string>;
    /** Stop the server */
    close: () => Promise<void>;
}

/**
 * Create a new MoriaJS application.
 *
 * @example
 * ```ts
 * import { createApp } from '@moriajs/core';
 *
 * const app = await createApp({ config: { mode: 'development' } });
 * await app.listen({ port: 3000 });
 * ```
 */
export async function createApp(options: MoriaAppOptions = {}): Promise<MoriaApp> {
    const config = options.config ?? {};
    const mode = config.mode ?? (process.env.NODE_ENV === 'production' ? 'production' : 'development');
    const rootDir = config.rootDir ?? process.cwd();
    const port = config.server?.port ?? 3000;
    const host = config.server?.host ?? '0.0.0.0';

    // Create Fastify instance with sensible defaults
    const server = Fastify({
        logger: {
            level: config.server?.logLevel ?? 'info',
            transport:
                mode !== 'production'
                    ? { target: 'pino-pretty', options: { colorize: true } }
                    : undefined,
        },
        ...options.fastifyOptions,
    });

    // Register core plugins
    await server.register(cors, {
        origin: config.server?.cors?.origin ?? true,
        credentials: config.server?.cors?.credentials ?? true,
    });

    await server.register(cookie);
    await server.register(compress);
    await server.register(helmet, {
        // Relax CSP in development for Vite HMR
        contentSecurityPolicy: mode === 'production',
    });

    // ─── Global Middleware ─────────────────────────────────────
    if (config.middleware && config.middleware.length > 0) {
        for (const mw of config.middleware) {
            server.addHook('onRequest', mw);
        }
        server.log.info(`Registered ${config.middleware.length} global middleware(s)`);
    }

    // Health check route
    server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

    // ─── Vite Integration ────────────────────────────────────
    let vite: ViteDevServer | undefined;

    if (mode === 'development') {
        vite = await createViteDevMiddleware(server, { ...config, rootDir });
    } else {
        await serveProductionAssets(server, { ...config, rootDir });
    }

    // ─── File-Based Routing ──────────────────────────────────
    const routesDir = path.resolve(rootDir, config.routes?.dir ?? 'src/routes');
    if (fs.existsSync(routesDir)) {
        await registerRoutes(server, routesDir, { mode, config });
    }

    // Plugin registry
    const plugins: MoriaPlugin[] = [];

    const app: MoriaApp = {
        server,
        vite,

        async use(plugin: MoriaPlugin) {
            plugins.push(plugin);
            await plugin.register({ server, config });
        },

        async listen(listenOptions) {
            const addr = await server.listen({
                port: listenOptions?.port ?? port,
                host: listenOptions?.host ?? host,
            });
            return addr;
        },

        async close() {
            await server.close();
        },
    };

    return app;
}
