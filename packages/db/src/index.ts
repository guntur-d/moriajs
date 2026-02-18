import { Kysely, PostgresDialect, SqliteDialect } from 'kysely';
import { pongoClient, PongoClient } from '@event-driven-io/pongo';
import { MoriaDB, MoriaDBAdapter } from './types.js';

export * from './types.js';

/**
 * Supported database adapters.
 */
export type DatabaseAdapterName = 'pg' | 'sqlite' | 'mysql';

/**
 * Configuration for creating a database connection.
 */
export interface DatabaseConfig {
    /** Database adapter name to use */
    adapter: DatabaseAdapterName;
    /** Connection URL (for pg/mysql/pongo) */
    url?: string;
    /** File path (for sqlite) */
    filename?: string;
    /** Whether to use Pongo (Document API) instead of Kysely (SQL API) for Postgres */
    usePongo?: boolean;
    /** Connection pool size */
    pool?: {
        min?: number;
        max?: number;
    };
}

/**
 * Kysely Adapter Implementation (SQL)
 */
export class KyselyAdapter implements MoriaDBAdapter {
    private db: Kysely<any> | null = null;

    constructor(private config: DatabaseConfig) { }

    async connect(): Promise<void> {
        const dialect = await this.createDialect(this.config);
        this.db = new Kysely<any>({ dialect });
    }

    async disconnect(): Promise<void> {
        if (this.db) {
            await this.db.destroy();
        }
    }

    private async createDialect(config: DatabaseConfig) {
        switch (config.adapter) {
            case 'pg': {
                // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
                const pg = (globalThis as any).require('pg') as { Pool: new (opts: Record<string, unknown>) => unknown };
                return new PostgresDialect({
                    pool: new pg.Pool({
                        connectionString: config.url,
                        min: config.pool?.min ?? 2,
                        max: config.pool?.max ?? 10,
                    }) as any,
                });
            }
            case 'sqlite': {
                const BetterSqlite3Module = await import('better-sqlite3');
                const BetterSqlite3 = BetterSqlite3Module.default;
                return new SqliteDialect({
                    database: new BetterSqlite3(config.filename ?? ':memory:'),
                });
            }
            default:
                throw new Error(`@moriajs/db: Unsupported Kysely adapter "${config.adapter}"`);
        }
    }

    async find<T>(collection: string, filter: any = {}): Promise<T[]> {
        let query = this.db!.selectFrom(collection).selectAll();
        for (const [key, value] of Object.entries(filter)) {
            query = query.where(key as any, '=', value as any);
        }
        return await query.execute() as T[];
    }

    async findOne<T>(collection: string, filter: any = {}): Promise<T | null> {
        let query = this.db!.selectFrom(collection).selectAll();
        for (const [key, value] of Object.entries(filter)) {
            query = query.where(key as any, '=', value as any);
        }
        const result = await query.limit(1).executeTakeFirst();
        return (result as T) || null;
    }

    async insertOne<T>(collection: string, data: any): Promise<T> {
        const result = await this.db!
            .insertInto(collection)
            .values(data)
            .returningAll()
            .executeTakeFirstOrThrow();
        return result as T;
    }

    async updateOne(collection: string, filter: any, data: any): Promise<void> {
        let query = this.db!.updateTable(collection).set(data);
        for (const [key, value] of Object.entries(filter)) {
            query = query.where(key as any, '=', value as any);
        }
        await query.execute();
    }

    async deleteOne(collection: string, filter: any): Promise<void> {
        let query = this.db!.deleteFrom(collection);
        for (const [key, value] of Object.entries(filter)) {
            query = query.where(key as any, '=', value as any);
        }
        await query.execute();
    }

    raw<T>(): T {
        return this.db as unknown as T;
    }
}

/**
 * Pongo Adapter Implementation (Document Store on Postgres)
 */
export class PongoAdapter implements MoriaDBAdapter {
    private client: PongoClient | null = null;

    constructor(private config: DatabaseConfig) { }

    async connect(): Promise<void> {
        if (!this.config.url) {
            throw new Error('@moriajs/db: PostgreSQL connection URL is required for Pongo');
        }
        // NOTE: Pongo 0.16.x currently hardcodes the JSONB column name to 'data'.
        // See: https://github.com/event-driven-io/pongo/issues
        this.client = pongoClient(this.config.url);
        await this.client.connect();
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close();
        }
    }

    async find<T extends Record<string, any> = any>(collection: string, filter: any = {}): Promise<T[]> {
        return await this.client!.db().collection<T>(collection).find(filter) as any;
    }

    async findOne<T extends Record<string, any> = any>(collection: string, filter: any = {}): Promise<T | null> {
        return await this.client!.db().collection<T>(collection).findOne(filter) as any;
    }

    async insertOne<T extends Record<string, any> = any>(collection: string, data: any): Promise<T> {
        const result = await this.client!.db().collection<T>(collection).insertOne(data);
        return result as unknown as T;
    }

    async updateOne(collection: string, filter: any, data: any): Promise<void> {
        await this.client!.db().collection(collection).updateOne(filter, { $set: data });
    }

    async deleteOne(collection: string, filter: any): Promise<void> {
        await this.client!.db().collection(collection).deleteOne(filter);
    }

    raw<T>(): T {
        return this.client as unknown as T;
    }
}

/**
 * Factory to create a MoriaDB instance.
 */
export async function createDatabase(config: DatabaseConfig): Promise<MoriaDB> {
    let adapter: MoriaDBAdapter;

    if (config.usePongo && config.adapter === 'pg') {
        adapter = new PongoAdapter(config);
    } else {
        adapter = new KyselyAdapter(config);
    }

    const db = new MoriaDB(adapter);
    await db.connect();
    return db;
}

/**
 * MoriaJS database plugin for Fastify integration.
 */
export function createDatabasePlugin(config: DatabaseConfig) {
    return {
        name: '@moriajs/db',
        async register({ server }: { server: any }) {
            const db = await createDatabase(config);
            server.decorate('db', db);

            server.addHook('onClose', async () => {
                await db.disconnect();
            });
        },
    };
}
