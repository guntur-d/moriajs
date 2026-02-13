import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import compress from '@fastify/compress';
import helmet from '@fastify/helmet';
import { type MoriaConfig } from './config.js';
import { type MoriaPlugin } from './plugins.js';

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
 * const app = await createApp();
 * await app.listen({ port: 3000 });
 * ```
 */
export async function createApp(options: MoriaAppOptions = {}): Promise<MoriaApp> {
    const config = options.config ?? {};
    const port = config.server?.port ?? 3000;
    const host = config.server?.host ?? '0.0.0.0';

    // Create Fastify instance with sensible defaults
    const server = Fastify({
        logger: {
            level: config.server?.logLevel ?? 'info',
            transport:
                process.env.NODE_ENV !== 'production'
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
        contentSecurityPolicy: process.env.NODE_ENV === 'production',
    });

    // Health check route
    server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

    // Plugin registry
    const plugins: MoriaPlugin[] = [];

    const app: MoriaApp = {
        server,

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
