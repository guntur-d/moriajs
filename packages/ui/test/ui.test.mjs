import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toastItemStyle, TOAST_COLORS } from '../dist/toast.js';
import { dismissConfirm } from '../dist/confirm.js';

describe('toast styles', () => {
    it('maps each type to a background', () => {
        for (const type of ['success', 'error', 'warning', 'info']) {
            const style = toastItemStyle(type);
            assert.equal(style.background, TOAST_COLORS[type]);
        }
    });
});

describe('dismissConfirm', () => {
    it('is a no-op for unknown ids (no throw)', () => {
        assert.doesNotThrow(() => dismissConfirm('missing', true));
    });
});
