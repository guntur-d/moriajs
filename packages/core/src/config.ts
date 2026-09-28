/**
 * MoriaJS configuration type.
 * Used in `moria.config.ts` files in user projects.
 */

import type { MoriaMiddleware } from './middleware.js';

/** Database adapter names supported by MoriaJS (mirrors @moriajs/db DatabaseAdapterName). */
export type MoriaDatabaseAdapter = 'pg' | 'sqlite' | 'mysql' | 'mongo';

/** Helmet/security-header options (typed subset of @fastify/helmet options). */
export interface MoriaHelmetOptions {
    contentSecurityPolicy?: {
        directives?: Record<string, string[]>;
    };
    [key: string]: unknown;
}

export interface MoriaConfig {
    /** Application mode */
    mode?: 'development' | 'production';

    /** Project root directory (auto-detected if not set) */
    rootDir?: string;

    /** Server configuration */
    server?: {
        /** Port to listen on (default: 3000) */
        port?: number;
        /** Host to bind to (default: '0.0.0.0') */
        host?: string;
        /** Log level (default: 'info') */
        logLevel?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
        /** CORS configuration */
        cors?: {
            origin?: string | string[] | boolean;
            credentials?: boolean;
        };
        /** Helmet (CSP and security headers) configuration */
        helmet?: MoriaHelmetOptions | boolean;
    };

    /** Database configuration */
    database?: {
        /** Database adapter */
        adapter?: MoriaDatabaseAdapter;
        /** Connection URL */
        url?: string;
        /** Path to SQLite file (for SQLite adapter) */
        filename?: string;
        /** Use Pongo (Document API) instead of Kysely (SQL API) for PostgreSQL */
        usePongo?: boolean;
        /** Database name (for mongo adapter) */
        dbName?: string;
        /** Should the framework auto-register the database plugin? (default: true) */
        autoRegister?: boolean;
    };

    /** Authentication configuration */
    auth?: {
        /** JWT secret key */
        secret?: string;
        /** Token expiration (e.g., '7d', '24h') */
        expiresIn?: string;
        /** Cookie name for JWT token */
        cookieName?: string;
        /** Enable secure cookies (HTTPS only) */
        secureCookies?: boolean;
        /** Should the framework auto-register the auth plugin? (default: true) */
        autoRegister?: boolean;
    };

    /** Vite / build configuration */
    vite?: {
        /** Path to Vite config file */
        configFile?: string;
        /** Client entry point (default: '/src/entry-client.ts') */
        clientEntry?: string;
    };

    /** File-based routing configuration */
    routes?: {
        /** Routes directory relative to rootDir (default: 'src/routes') */
        dir?: string;
    };

    /** Global middleware (runs on every request) */
    middleware?: MoriaMiddleware[];
}

/**
 * Helper to define a type-safe MoriaJS configuration.
 *
 * @example
 * ```ts
 * // moria.config.ts
 * import { defineConfig } from '@moriajs/core';
 *
 * export default defineConfig({
 *   server: { port: 3000 },
 *   database: { adapter: 'sqlite', filename: './dev.db' },
 * });
 * ```
 */
export function defineConfig(config: MoriaConfig): MoriaConfig {
    return config;
}
