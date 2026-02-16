/**
 * MoriaDB Agnostic Interface
 */

export interface MoriaDBAdapter {
    /** Connect to the database */
    connect(): Promise<void>;
    /** Close the database connection */
    disconnect(): Promise<void>;

    /** Find multiple documents/rows */
    find<T extends Record<string, any>>(collection: string, filter: any): Promise<T[]>;
    /** Find a single document/row */
    findOne<T extends Record<string, any>>(collection: string, filter: any): Promise<T | null>;
    /** Insert one document/row */
    insertOne<T extends Record<string, any>>(collection: string, data: any): Promise<T>;
    /** Update documents/rows */
    updateOne(collection: string, filter: any, data: any): Promise<void>;
    /** Delete documents/rows */
    deleteOne(collection: string, filter: any): Promise<void>;

    /** Get the raw underlying driver instance (Kysely, Pongo, etc.) */
    raw<T>(): T;
}

export class MoriaDB {
    constructor(private adapter: MoriaDBAdapter) { }

    async connect() {
        return this.adapter.connect();
    }

    async disconnect() {
        return this.adapter.disconnect();
    }

    async find<T extends Record<string, any>>(collection: string, filter: any = {}): Promise<T[]> {
        return this.adapter.find<T>(collection, filter);
    }

    async findOne<T extends Record<string, any>>(collection: string, filter: any = {}): Promise<T | null> {
        return this.adapter.findOne<T>(collection, filter);
    }

    async insertOne<T extends Record<string, any>>(collection: string, data: any): Promise<T> {
        return this.adapter.insertOne<T>(collection, data);
    }

    async updateOne(collection: string, filter: any, data: any): Promise<void> {
        return this.adapter.updateOne(collection, filter, data);
    }

    async deleteOne(collection: string, filter: any): Promise<void> {
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
