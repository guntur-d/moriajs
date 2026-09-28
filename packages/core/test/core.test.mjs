import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filePathToUrlPath, classifyModule } from '../dist/router.js';
import { normalizeScope, getMiddlewareChain } from '../dist/middleware.js';
import { buildHelmetOptions } from '../dist/app.js';
import { resolveClientEntry, buildScriptTags, cleanBasePath } from '../dist/assets.js';

describe('filePathToUrlPath', () => {
    it('maps api + page routes', () => {
        assert.equal(filePathToUrlPath('api/users/[id].ts'), '/api/users/:id');
        assert.equal(filePathToUrlPath('pages/index.ts'), '/');
        assert.equal(filePathToUrlPath('pages/about.ts'), '/about');
        assert.equal(filePathToUrlPath('api/index.ts'), '/api');
    });
    it('maps catch-all before single param (no shadowing)', () => {
        assert.equal(filePathToUrlPath('pages/[...slug].ts'), '/*');
        assert.equal(filePathToUrlPath('api/files/[...slug].ts'), '/api/files/*');
    });
});

describe('classifyModule', () => {
    it('classifies api method maps', () => {
        const GET = () => ({});
        const out = classifyModule({ GET }, true);
        assert.equal(out.kind, 'handlers');
    });
    it('uses default export as GET for api', () => {
        const fn = () => ({});
        const out = classifyModule({ default: fn }, true);
        assert.equal(out.kind, 'handlers');
    });
    it('classifies page components', () => {
        const out = classifyModule({ default: { view: () => {} } }, false);
        assert.equal(out.kind, 'component');
    });
    it('returns empty for handler-less modules', () => {
        assert.equal(classifyModule({}, true).kind, 'empty');
        assert.equal(classifyModule({ default: {} }, false).kind, 'empty');
    });
});

describe('middleware scope', () => {
    it('normalizes pages prefix', () => {
        assert.equal(normalizeScope('pages'), '');
        assert.equal(normalizeScope('pages/admin'), 'admin');
        assert.equal(normalizeScope('api'), 'api');
    });
    it('chains root + matching scope', () => {
        const root = async () => {};
        const api = async () => {};
        const entries = [
            { scope: '', handlers: [root] },
            { scope: 'api', handlers: [api] },
        ];
        assert.deepEqual(getMiddlewareChain('api/hello.ts', entries), [root, api]);
        assert.deepEqual(getMiddlewareChain('pages/index.ts', entries), [root]);
    });
});

describe('buildHelmetOptions', () => {
    it('returns defaults when undefined, null when false', () => {
        assert.ok(buildHelmetOptions(undefined)?.contentSecurityPolicy);
        assert.equal(buildHelmetOptions(false), null);
    });
    it('deep-merges CSP directives instead of clobbering', () => {
        const out = buildHelmetOptions({ contentSecurityPolicy: { directives: { scriptSrc: ["'self'"] } } });
        assert.deepEqual(out?.contentSecurityPolicy?.directives?.scriptSrc, ["'self'"]);
        assert.ok(out?.contentSecurityPolicy?.directives?.defaultSrc);
    });
});

describe('assets', () => {
    it('resolves leading-slash + manifest key forms', () => {
        const r = resolveClientEntry('/src/entry-client.ts', process.cwd());
        assert.equal(r.urlPath, '/src/entry-client.ts');
        assert.equal(r.manifestKey, 'src/entry-client.ts');
        assert.equal(r.fsInput, 'src/entry-client.ts');
    });
    it('builds dev script tags', () => {
        const tags = buildScriptTags('development', { vite: { clientEntry: '/src/entry-client.ts' } });
        assert.match(tags, /@vite\/client/);
        assert.match(tags, /entry-client/);
    });
    it('falls back when manifest is missing', () => {
        const tags = buildScriptTags('production', { rootDir: '/nonexistent-moria-test', vite: { clientEntry: '/src/entry-client.ts' } });
        assert.match(tags, /entry-client\.js/);
    });
    it('cleans base path', () => {
        assert.equal(cleanBasePath('/assets'), '/assets/');
        assert.equal(cleanBasePath('/assets/'), '/assets/');
    });
});
