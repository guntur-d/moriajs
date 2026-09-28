import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, jsonForScript, normalizePageKey, matchPageKey, fallbackScriptTags } from '../dist/index.js';

describe('escapeHtml', () => {
    it('escapes html metacharacters', () => {
        assert.equal(escapeHtml('<a href="x">&\'y\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;y&#39;&lt;/a&gt;');
    });
});

describe('jsonForScript', () => {
    it('neutralizes script breakout', () => {
        const out = jsonForScript({ html: '</script><!--x-->' });
        assert.doesNotMatch(out, /<\/script>/);
        assert.match(out, /\\u003c/);
    });
    it('round-trips through JSON.parse', () => {
        const value = { a: 1, b: '<tag>', c: '&' };
        assert.deepEqual(JSON.parse(jsonForScript(value)), value);
    });
});

describe('matchPageKey', () => {
    it('prefers exact normalized match', () => {
        const pages = { './routes/pages/index.ts': 1, './routes/pages/admin/index.ts': 2 };
        assert.equal(matchPageKey(pages, 'routes/pages/index.ts'), './routes/pages/index.ts');
    });
    it('prefers longest suffix (no index hijacking)', () => {
        const pages = { './routes/pages/index.ts': 1, './routes/pages/admin/index.ts': 2 };
        assert.equal(matchPageKey(pages, 'admin/index.ts'), './routes/pages/admin/index.ts');
    });
    it('normalizes leading ./ and /', () => {
        assert.equal(normalizePageKey('./a/b.ts'), 'a/b.ts');
        assert.equal(normalizePageKey('/a/b.ts'), 'a/b.ts');
    });
});

describe('fallbackScriptTags', () => {
    it('emits dev HMR tags', () => {
        const tags = fallbackScriptTags({ mode: 'development', clientEntry: '/src/entry-client.ts' });
        assert.match(tags, /@vite\/client/);
    });
    it('resolves manifest hashed file', () => {
        const tags = fallbackScriptTags({
            mode: 'production',
            clientEntry: '/src/entry-client.ts',
            manifest: { 'src/entry-client.ts': { file: 'assets/entry-abc123.js' } },
        });
        assert.match(tags, /entry-abc123\.js/);
    });
});
