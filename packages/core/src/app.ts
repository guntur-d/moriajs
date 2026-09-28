import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import compress from '@fastify/compress';
import helmet from '@fastify/helmet';
import path from 'node:path';
import fs from 'node:fs';
import { type MoriaConfig, type MoriaHelmetOptions } from './config.js';
import { type MoriaPlugin } from './plugins.js';
import { createViteDevMiddleware, serveProductionAssets } from './vite.js';
import { registerRoutes } from './router.js';
import type { ViteDevServer } from 'vite';
import type { DatabaseConfig } from '@moriajs/db';
import type { AuthConfig } from '@moriajs/auth';

/**
 * Enable BigInt JSON serialization for API responses.
 * Explicit opt-in (called once from createApp) — not an import side effect,
 * idempotent so repeated createApp() calls in tests are safe.
 */
export function ensureBigIntJson(): void {
    const proto = BigInt.prototype as unknown as Record<string, unknown>;
    if (!proto.toJSON) {
        proto.toJSON = function (this: bigint) {
            return this.toString();
        };
    }
}

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
    /** Register file-based routes explicitly (idempotent; also called once by listen()) */
    routes: () => Promise<void>;
    /** Start the server */
    listen: (options?: { port?: number; host?: string }) => Promise<string>;
    /** Stop the server */
    close: () => Promise<void>;
}

/**
 * Base Auth User.
 */
export interface AuthUser {
    id: string | number;
    email?: string;
    role?: string;
    [key: string]: unknown;
}

/**
 * Fastify Type Augmentation for MoriaJS features.
 */
declare module 'fastify' {
    interface FastifyInstance {
        /** Sign in a user and set JWT cookie (if @moriajs/auth is registered) */
        signIn(user: AuthUser, reply: import('fastify').FastifyReply): Promise<string>;
        /** Sign out a user and clear JWT cookie (if @moriajs/auth is registered) */
        signOut(request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply): Promise<void>;
    }
}

const DEFAULT_HELMET_OPTIONS: MoriaHelmetOptions = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            imgSrc: ["'self'", 'data:', 'blob:'],
            connectSrc: ["'self'", 'ws:', 'wss:'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
};

/**
 * Build helmet options with a deep merge of CSP directives
 * (a shallow spread would drop all default directives when one key is overridden).
 */
export function buildHelmetOptions(helmetConfig: MoriaHelmetOptions | boolean | undefined): MoriaHelmetOptions | null {
    if (helmetConfig === false) return null;
    if (!helmetConfig || typeof helmetConfig !== 'object') return DEFAULT_HELMET_OPTIONS;
    return {
        ...DEFAULT_HELMET_OPTIONS,
        ...helmetConfig,
        contentSecurityPolicy: {
            ...DEFAULT_HELMET_OPTIONS.contentSecurityPolicy,
            ...helmetConfig.contentSecurityPolicy,
            directives: {
                ...DEFAULT_HELMET_OPTIONS.contentSecurityPolicy?.directives,
                ...helmetConfig.contentSecurityPolicy?.directives,
            },
        },
    };
}

async function registerCorePlugins(
    server: FastifyInstance,
    config: Partial<MoriaConfig>,
    mode: string
): Promise<void> {
    await server.register(cors, {
        origin: config.server?.cors?.origin ?? true,
        credentials: config.server?.cors?.credentials ?? true,
    });

    await server.register(cookie);
    await server.register(compress);

    const helmetOptions = buildHelmetOptions(config.server?.helmet);
    if (helmetOptions) {
        await server.register(helmet, helmetOptions);
    }

    if (mode !== 'production') {
        server.log.debug(`Core plugins registered (mode=${mode})`);
    }
}

function registerGlobalMiddleware(server: FastifyInstance, config: Partial<MoriaConfig>): void {
    if (config.middleware && config.middleware.length > 0) {
        for (const mw of config.middleware) {
            server.addHook('onRequest', async (request, reply) => {
                // Preserve short-circuit: a returned payload is sent when
                // the middleware didn't already reply.
                const result = await mw(request, reply);
                if (result !== undefined && !reply.sent) {
                    await reply.send(result);
                }
            });
        }
        server.log.info(`Registered ${config.middleware.length} global middleware(s)`);
    }
}

async function registerAutoPlugins(
    app: Pick<MoriaApp, 'use'>,
    server: FastifyInstance,
    config: Partial<MoriaConfig>
): Promise<void> {
    if (config.database && config.database.autoRegister !== false) {
        try {
            const { createDatabasePlugin } = await import('@moriajs/db');
            await app.use(createDatabasePlugin(config.database as DatabaseConfig));
            server.log.info('Auto-registered @moriajs/db plugin');
        } catch (err) {
            server.log.error(`Failed to auto-register @moriajs/db: ${err}`);
            throw err;
        }
    }

    if (config.auth && config.auth.autoRegister !== false) {
        try {
            const { createAuthPlugin } = await import('@moriajs/auth');
            await app.use(createAuthPlugin(config.auth as AuthConfig));
            server.log.info('Auto-registered @moriajs/auth plugin');
        } catch (err) {
            server.log.error(`Failed to auto-register @moriajs/auth: ${err}`);
            throw err;
        }
    }
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
    ensureBigIntJson();

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

    await registerCorePlugins(server, config, mode);
    registerGlobalMiddleware(server, config);

    // Health check route
    server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

    // ─── Vite Integration ────────────────────────────────────
    let vite: ViteDevServer | undefined;

    if (mode === 'development') {
        vite = await createViteDevMiddleware(server, { ...config, rootDir });
    } else {
        await serveProductionAssets(server, { ...config, rootDir });
    }

    // Plugin registry
    const plugins: MoriaPlugin[] = [];
    let routesRegistered = false;
    const registerFileRoutes = async () => {
        if (routesRegistered) return;
        routesRegistered = true;
        const routesDir = path.resolve(rootDir, config.routes?.dir ?? 'src/routes');
        if (fs.existsSync(routesDir)) {
            await registerRoutes(server, routesDir, { mode, config, vite });
        }
    };

    const app: MoriaApp = {
        server,
        vite,

        async use(plugin: MoriaPlugin) {
            if (plugins.some((p) => p.name === plugin.name)) {
                server.log.debug(`Plugin "${plugin.name}" is already registered, skipping.`);
                return;
            }
            plugins.push(plugin);
            await plugin.register({ server, config });
        },

        routes: registerFileRoutes,

        async listen(listenOptions) {
            // File-based routing is explicit via app.routes() but stays
            // wired into listen() for back-compat (idempotent).
            await registerFileRoutes();

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

    await registerAutoPlugins(app, server, config);

    return app;
}
