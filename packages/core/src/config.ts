/**
 * MoriaJS configuration type.
 * Used in `moria.config.ts` files in user projects.
 */
export interface MoriaConfig {
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
    };

    /** Database configuration */
    database?: {
        /** Database adapter: 'pg' | 'sqlite' | 'mysql' */
        adapter?: string;
        /** Connection URL */
        url?: string;
        /** Path to SQLite file (for SQLite adapter) */
        filename?: string;
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
    };

    /** Vite / build configuration */
    vite?: {
        /** Path to Vite config file */
        configFile?: string;
    };
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
