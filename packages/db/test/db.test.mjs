import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapIdFilter, mapIdResult } from '../dist/document-adapter.js';
import { assertNonEmptyFilter } from '../dist/types.js';

describe('mapIdFilter', () => {
    it('maps id to _id, leaves the rest', () => {
        assert.deepEqual(mapIdFilter({ id: '1', active: true }), { _id: '1', active: true });
        assert.deepEqual(mapIdFilter({ active: true }), { active: true });
    });
    it('passes through non-objects', () => {
        assert.equal(mapIdFilter(null), null);
    });
});

describe('mapIdResult', () => {
    it('maps _id to id and drops _id', () => {
        assert.deepEqual(mapIdResult({ _id: '1', name: 'a' }), { name: 'a', id: '1' });
    });
    it('maps arrays', () => {
        assert.deepEqual(mapIdResult([{ _id: 1 }, { _id: 2 }]), [{ id: 1 }, { id: 2 }]);
    });
    it('passes through results without _id', () => {
        assert.deepEqual(mapIdResult({ id: 1 }), { id: 1 });
        assert.equal(mapIdResult(null), null);
    });
});

describe('assertNonEmptyFilter', () => {
    it('throws on empty/null filters', () => {
        assert.throws(() => assertNonEmptyFilter({}, 'updateOne'));
        assert.throws(() => assertNonEmptyFilter(null, 'deleteOne'));
    });
    it('passes on non-empty filters', () => {
        assert.doesNotThrow(() => assertNonEmptyFilter({ id: 1 }, 'updateOne'));
    });
});
