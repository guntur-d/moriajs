/**
 * @moriajs/db
 *
 * Database-agnostic adapter layer built on Kysely.
 * Default: PostgreSQL (production), SQLite (development).
 * Designed to work with kysely-schema for schema-first development.
 */

import { Kysely, PostgresDialect, SqliteDialect } from 'kysely';

/**
 * Supported database adapters.
 */
export type DatabaseAdapter = 'pg' | 'sqlite' | 'mysql';

/**
 * Configuration for creating a database connection.
 */
export interface DatabaseConfig {
    /** Database adapter to use */
    adapter: DatabaseAdapter;
    /** Connection URL (for pg/mysql) */
    url?: string;
    /** File path (for sqlite) */
    filename?: string;
    /** Connection pool size */
    pool?: {
        min?: number;
        max?: number;
    };
}

/**
 * Create a Kysely database instance with the specified adapter.
 *
 * @example
 * ```ts
 * // Production (PostgreSQL)
 * const db = await createDatabase({
 *   adapter: 'pg',
 *   url: process.env.DATABASE_URL,
 * });
 *
 * // Development (SQLite)
 * const db = await createDatabase({
 *   adapter: 'sqlite',
 *   filename: './dev.db',
 * });
 * ```
 */
export async function createDatabase<T>(config: DatabaseConfig): Promise<Kysely<T>> {
    const dialect = await createDialect(config);
    return new Kysely<T>({ dialect });
}

/**
 * Create the appropriate Kysely dialect based on adapter config.
 */
async function createDialect(config: DatabaseConfig) {
    switch (config.adapter) {
        case 'pg': {
            // Dynamic import — pg is an optional dependency
            // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
            const pg = (globalThis as any).require('pg') as { Pool: new (opts: Record<string, unknown>) => unknown };
            return new PostgresDialect({
                pool: new pg.Pool({
                    connectionString: config.url,
                    min: config.pool?.min ?? 2,
                    max: config.pool?.max ?? 10,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                }) as any,
            });
        }

        case 'sqlite': {
            // Dynamic import — better-sqlite3 is an optional dependency
            const BetterSqlite3Module = await import('better-sqlite3');
            const BetterSqlite3 = BetterSqlite3Module.default;
            return new SqliteDialect({
                database: new BetterSqlite3(config.filename ?? ':memory:'),
            });
        }

        case 'mysql': {
            throw new Error(
                '@moriajs/db: MySQL adapter is not yet implemented. ' +
                'Contributions welcome!'
            );
        }

        default:
            throw new Error(`@moriajs/db: Unknown adapter "${config.adapter}"`);
    }
}

/**
 * Create a MoriaJS database plugin for Fastify integration.
 *
 * @example
 * ```ts
 * import { createApp } from '@moriajs/core';
 * import { createDatabasePlugin } from '@moriajs/db';
 *
 * const app = await createApp();
 * await app.use(createDatabasePlugin({
 *   adapter: 'sqlite',
 *   filename: './dev.db',
 * }));
 * ```
 */
export function createDatabasePlugin(config: DatabaseConfig) {
    return {
        name: '@moriajs/db',
        async register({ server }: { server: { decorate: (key: string, value: unknown) => void } }) {
            const db = await createDatabase(config);
            server.decorate('db', db);
        },
    };
}
