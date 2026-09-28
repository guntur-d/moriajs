/**
 * MongoDB adapter — connection lifecycle only. CRUD lives in DocumentAdapter.
 */

import { MongoClient, type Filter, type OptionalUnlessRequiredId } from 'mongodb';
import type { MoriaDBAdapter } from './types.js';
import type { DatabaseConfig } from './config.js';
import { DocumentAdapter, type DocumentCollection, type DocumentFilter, type DocumentData } from './document-adapter.js';

export class MongoAdapter extends DocumentAdapter implements MoriaDBAdapter {
    private client: MongoClient | null = null;

    constructor(private config: DatabaseConfig) {
        super();
    }

    async connect(): Promise<void> {
        if (!this.config.url) {
            throw new Error('@moriajs/db: MongoDB connection URL is required');
        }
        this.client = new MongoClient(this.config.url);
        await this.client.connect();
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close();
        }
    }

    protected collection<T extends Record<string, unknown>>(name: string): DocumentCollection<T> {
        if (!this.client) throw new Error('@moriajs/db: not connected (call connect() first)');
        const raw = this.client.db(this.config.dbName).collection<T>(name);
        // Boundary: agnostic DocumentFilter/Data → strict Mongo driver types.
        return {
            find: async (filter: DocumentFilter) =>
                (await raw.find(filter as unknown as Filter<T>).toArray()) as unknown as T[],
            findOne: (filter: DocumentFilter) =>
                raw.findOne(filter as unknown as Filter<T>) as unknown as Promise<T | null>,
            insertOne: (data: DocumentData) =>
                raw.insertOne(data as unknown as OptionalUnlessRequiredId<T>) as unknown as Promise<{ insertedId: unknown }>,
            updateOne: (filter: DocumentFilter, update: { $set: DocumentData }) =>
                raw.updateOne(
                    filter as unknown as Filter<T>,
                    update as unknown as Parameters<typeof raw.updateOne>[1]
                ) as unknown as Promise<unknown>,
            deleteOne: (filter: DocumentFilter) =>
                raw.deleteOne(filter as unknown as Filter<T>) as unknown as Promise<unknown>,
        };
    }

    raw<T>(): T {
        return this.client as unknown as T;
    }
}
