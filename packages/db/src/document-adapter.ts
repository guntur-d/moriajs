/**
 * Shared document-store helpers (Pongo + Mongo).
 * Single owner for id mapping so both adapters stay consistent.
 */

export type DocumentFilter = Record<string, unknown>;
export type DocumentData = Record<string, unknown>;

/**
 * Translate an `id` field in a filter to the document `_id` field used by
 * Pongo and MongoDB, leaving all other fields untouched.
 */
export function mapIdFilter<T extends DocumentFilter>(filter: T): DocumentFilter {
    if (!filter || typeof filter !== 'object') return filter;
    const { id, ...rest } = filter as DocumentFilter & { id?: unknown };
    if (id === undefined) return filter;
    return { ...rest, _id: id };
}

/**
 * Translate document `_id` fields in results to `id`, removing the
 * underlying `_id` so all adapters return a consistent shape.
 */
export function mapIdResult<T>(result: T): T {
    if (!result) return result;
    if (Array.isArray(result)) {
        return result.map((item) => mapIdResult(item)) as unknown as T;
    }
    if (typeof result === 'object' && result !== null && '_id' in result) {
        const { _id, ...rest } = result as Record<string, unknown>;
        return { ...rest, id: _id } as T;
    }
    return result;
}

/** Minimal collection surface shared by Pongo and the Mongo driver. */
export interface DocumentCollection<T extends Record<string, unknown> = Record<string, unknown>> {
    find(filter: DocumentFilter): Promise<T[]> | { toArray(): Promise<T[]> };
    findOne(filter: DocumentFilter): Promise<T | null>;
    insertOne(data: DocumentData): Promise<{ insertedId: unknown }>;
    updateOne(filter: DocumentFilter, update: { $set: DocumentData }): Promise<unknown>;
    deleteOne(filter: DocumentFilter): Promise<unknown>;
}

/**
 * Base class for document-store adapters (Pongo, Mongo).
 * Owns find/findOne/insert/update/delete + id mapping + insert re-fetch,
 * parameterized by a collection accessor so subclasses only own connection lifecycle.
 */
export abstract class DocumentAdapter {
    protected abstract collection<T extends Record<string, unknown>>(name: string): DocumentCollection<T> | Promise<DocumentCollection<T>>;

    private async coll<T extends Record<string, unknown>>(name: string): Promise<DocumentCollection<T>> {
        return (await this.collection<T>(name)) as DocumentCollection<T>;
    }

    async find<T extends Record<string, unknown> = Record<string, unknown>>(
        collection: string,
        filter: DocumentFilter = {}
    ): Promise<T[]> {
        const coll = await this.coll<T>(collection);
        const raw = await coll.find(mapIdFilter(filter));
        const results = Array.isArray(raw) ? raw : await (raw as { toArray(): Promise<T[]> }).toArray();
        return mapIdResult(results);
    }

    async findOne<T extends Record<string, unknown> = Record<string, unknown>>(
        collection: string,
        filter: DocumentFilter = {}
    ): Promise<T | null> {
        const coll = await this.coll<T>(collection);
        const result = await coll.findOne(mapIdFilter(filter));
        return mapIdResult(result);
    }

    async insert<T extends Record<string, unknown> = Record<string, unknown>>(
        collection: string,
        data: DocumentData
    ): Promise<T> {
        return this.insertOne<T>(collection, data);
    }

    async insertOne<T extends Record<string, unknown> = Record<string, unknown>>(
        collection: string,
        data: DocumentData
    ): Promise<T> {
        const coll = await this.coll<T>(collection);
        const result = await coll.insertOne(data);
        // Re-fetch so the result carries the mapped `id` field.
        const inserted = await coll.findOne({ _id: result.insertedId } as DocumentFilter);
        return (inserted ? mapIdResult(inserted) : { ...data, id: result.insertedId }) as T;
    }

    async updateOne(collection: string, filter: DocumentFilter, data: DocumentData): Promise<void> {
        const coll = await this.coll(collection);
        await coll.updateOne(mapIdFilter(filter), { $set: data });
    }

    async deleteOne(collection: string, filter: DocumentFilter): Promise<void> {
        const coll = await this.coll(collection);
        await coll.deleteOne(mapIdFilter(filter));
    }
}
