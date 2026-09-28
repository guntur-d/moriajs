/**
 * Database configuration (single canonical definition).
 */

export type DatabaseAdapterName = 'pg' | 'sqlite' | 'mysql' | 'mongo';

export interface DatabaseConfig {
    /** Database adapter name to use */
    adapter: DatabaseAdapterName;
    /** Connection URL (for pg/mysql/pongo/mongo) */
    url?: string;
    /** File path (for sqlite) */
    filename?: string;
    /** Whether to use Pongo (Document API) instead of Kysely (SQL API) for PostgreSQL */
    usePongo?: boolean;
    /** Connection pool size */
    pool?: {
        min?: number;
        max?: number;
    };
    /** Database name (for mongo) */
    dbName?: string;
    /** Custom JSONB column name for Pongo (default: 'data' in Pongo v0.16.x) */
    pongoJsonColumn?: string;
}
