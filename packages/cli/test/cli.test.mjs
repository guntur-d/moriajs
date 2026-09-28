import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../dist/config.js';

describe('loadConfig', () => {
    it('returns empty config when no file exists', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moria-cli-'));
        const out = await loadConfig(dir);
        assert.deepEqual(out.config, {});
        assert.equal(out.configFile, null);
    });
    it('throws (fail-loud) on broken config instead of swallowing', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moria-cli-'));
        fs.writeFileSync(path.join(dir, 'moria.config.mjs'), 'throw new Error("boom");\n');
        await assert.rejects(() => loadConfig(dir), /Failed to load/);
    });
});
