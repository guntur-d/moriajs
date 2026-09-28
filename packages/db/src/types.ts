import 'fastify';
/**
 * MoriaDB Agnostic Interface.
 *
 * MoriaDB is the intentional public API (request.server.db: MoriaDB).
 * It owns cross-adapter guards so individual adapters stay thin.
 */

export interface MoriaDBAdapter {
    /** Connect to the database */
    connect(): Promise<void>;
    /** Close the database connection */
    disconnect(): Promise<void>;

    /** Find multiple documents/rows */
    find<T extends Record<string, unknown>>(collection: string, filter: Record<string, unknown>): Promise<T[]>;
    /** Find a single document/row */
    findOne<T extends Record<string, unknown>>(collection: string, filter: Record<string, unknown>): Promise<T | null>;
    /** Insert documents/rows (alias for insertOne for convenience) */
    insert<T extends Record<string, unknown>>(collection: string, data: Record<string, unknown>): Promise<T>;
    /** Insert one document/row */
    insertOne<T extends Record<string, unknown>>(collection: string, data: Record<string, unknown>): Promise<T>;
    /** Update documents/rows */
    updateOne(collection: string, filter: Record<string, unknown>, data: Record<string, unknown>): Promise<void>;
    /** Delete documents/rows */
    deleteOne(collection: string, filter: Record<string, unknown>): Promise<void>;

    /** Get the raw underlying driver instance (Kysely, Pongo, etc.) */
    raw<T>(): T;
}

/**
 * Guard owned by the MoriaDB boundary (not per-adapter):
 * destructive single-row ops require a non-empty filter.
 */
export function assertNonEmptyFilter(filter: Record<string, unknown> | null | undefined, op: string): void {
    if (!filter || Object.keys(filter).length === 0) {
        throw new Error(`@moriajs/db: ${op} requires a non-empty filter to avoid affecting every row`);
    }
}

export class MoriaDB {
    constructor(private adapter: MoriaDBAdapter) { }

    async connect() {
        return this.adapter.connect();
    }

    async disconnect() {
        return this.adapter.disconnect();
    }

    async find<T extends Record<string, unknown>>(collection: string, filter: Record<string, unknown> = {}): Promise<T[]> {
        return this.adapter.find<T>(collection, filter);
    }

    async findOne<T extends Record<string, unknown>>(collection: string, filter: Record<string, unknown> = {}): Promise<T | null> {
        return this.adapter.findOne<T>(collection, filter);
    }

    async insert<T extends Record<string, unknown>>(collection: string, data: Record<string, unknown>): Promise<T> {
        return this.adapter.insert<T>(collection, data);
    }

    async insertOne<T extends Record<string, unknown>>(collection: string, data: Record<string, unknown>): Promise<T> {
        return this.adapter.insertOne<T>(collection, data);
    }

    async updateOne(collection: string, filter: Record<string, unknown>, data: Record<string, unknown>): Promise<void> {
        assertNonEmptyFilter(filter, 'updateOne');
        return this.adapter.updateOne(collection, filter, data);
    }

    async deleteOne(collection: string, filter: Record<string, unknown>): Promise<void> {
        assertNonEmptyFilter(filter, 'deleteOne');
        return this.adapter.deleteOne(collection, filter);
    }

    /**
     * Access the raw underlying driver instance.
     * Use this when you need library-specific features.
     */
    raw<T>(): T {
        return this.adapter.raw<T>();
    }
}

// ─── Fastify Type Augmentation ──────────────────────────
declare module 'fastify' {
    interface FastifyInstance {
        db: MoriaDB;
    }
}
