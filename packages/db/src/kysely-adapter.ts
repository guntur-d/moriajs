/**
 * Kysely (SQL) adapter — the only place Kysely-specific query building lives.
 */

import { Kysely, PostgresDialect, SqliteDialect } from 'kysely';
import type { MoriaDBAdapter } from './types.js';
import type { DatabaseConfig } from './config.js';
import { assertNonEmptyFilter } from './types.js';

export class KyselyAdapter implements MoriaDBAdapter {
    private db: Kysely<Record<string, Record<string, unknown>>> | null = null;

    constructor(private config: DatabaseConfig) { }

    private safeColumnRef(key: string): string {
        if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(key)) {
            throw new Error(`@moriajs/db: Invalid column name: "${key}"`);
        }
        return key;
    }

    async connect(): Promise<void> {
        const dialect = await this.createDialect(this.config);
        this.db = new Kysely({ dialect });
    }

    async disconnect(): Promise<void> {
        if (this.db) {
            await this.db.destroy();
        }
    }

    private async createDialect(config: DatabaseConfig) {
        switch (config.adapter) {
            case 'pg': {
                const pgModule = await import('pg');
                // Optional dep: resolve Pool from default or named export shape.
                const PoolCtor = (pgModule.default as { Pool?: unknown } | undefined)?.Pool
                    ?? (pgModule as unknown as { Pool: unknown }).Pool;
                return new PostgresDialect({
                    pool: new (PoolCtor as new (config: unknown) => never)({
                        connectionString: config.url,
                        min: config.pool?.min ?? 2,
                        max: config.pool?.max ?? 10,
                    }),
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

    private requireDb(): Kysely<Record<string, Record<string, unknown>>> {
        if (!this.db) throw new Error('@moriajs/db: not connected (call connect() first)');
        return this.db;
    }

    async find<T extends Record<string, unknown>>(collection: string, filter: Record<string, unknown> = {}): Promise<T[]> {
        let query = this.requireDb().selectFrom(collection).selectAll();
        for (const [key, value] of Object.entries(filter)) {
            query = query.where(this.safeColumnRef(key), '=', value as string | number | boolean | null);
        }
        return (await query.execute()) as T[];
    }

    async findOne<T extends Record<string, unknown>>(collection: string, filter: Record<string, unknown> = {}): Promise<T | null> {
        let query = this.requireDb().selectFrom(collection).selectAll();
        for (const [key, value] of Object.entries(filter)) {
            query = query.where(this.safeColumnRef(key), '=', value as string | number | boolean | null);
        }
        const result = await query.limit(1).executeTakeFirst();
        return (result as T) || null;
    }

    async insert<T extends Record<string, unknown>>(collection: string, data: Record<string, unknown>): Promise<T> {
        return this.insertOne<T>(collection, data);
    }

    async insertOne<T extends Record<string, unknown>>(collection: string, data: Record<string, unknown>): Promise<T> {
        const result = await this.requireDb()
            .insertInto(collection)
            .values(data as Record<string, unknown>)
            .returningAll()
            .executeTakeFirstOrThrow();
        return result as T;
    }

    async updateOne(collection: string, filter: Record<string, unknown>, data: Record<string, unknown>): Promise<void> {
        assertNonEmptyFilter(filter, 'updateOne');
        let query = this.requireDb().updateTable(collection).set(data);
        for (const [key, value] of Object.entries(filter)) {
            query = query.where(this.safeColumnRef(key), '=', value as string | number | boolean | null);
        }
        await query.execute();
    }

    async deleteOne(collection: string, filter: Record<string, unknown>): Promise<void> {
        assertNonEmptyFilter(filter, 'deleteOne');
        let query = this.requireDb().deleteFrom(collection);
        for (const [key, value] of Object.entries(filter)) {
            query = query.where(this.safeColumnRef(key), '=', value as string | number | boolean | null);
        }
        await query.execute();
    }

    raw<T>(): T {
        return this.db as unknown as T;
    }
}
