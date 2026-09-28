import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveScaffold, validateTemplate, validateDb } from '../dist/options.js';
import { moriaConfig, viteConfig } from '../dist/templates/config.js';
import { srcPageIndex } from '../dist/templates/pages.js';

describe('resolveScaffold', () => {
    it('flags win over prompts; explicit false preserved', () => {
        const out = resolveScaffold(undefined, { pongo: false }, { projectName: 'a', usePongo: true });
        assert.equal(out.usePongo, false);
    });
    it('defaults to ts + default template + sqlite', () => {
        const out = resolveScaffold('my-app', {}, {});
        assert.deepEqual(out, { name: 'my-app', template: 'default', lang: 'ts', db: 'sqlite', usePongo: false });
    });
    it('javascript flag selects js', () => {
        const out = resolveScaffold('x', { javascript: true }, {});
        assert.equal(out.lang, 'js');
    });
});

describe('template lang parameter', () => {
    it('emits matching client entry per lang', () => {
        assert.match(moriaConfig('ts', 'sqlite'), /entry-client\.ts/);
        assert.match(moriaConfig('js', 'sqlite'), /entry-client\.js/);
        assert.match(viteConfig('ts'), /entry-client\.ts/);
        assert.match(viteConfig('js'), /entry-client\.js/);
    });
    it('page template differs only by annotations', () => {
        assert.match(srcPageIndex('ts'), /m\.Vnode/);
        assert.doesNotMatch(srcPageIndex('js'), /m\.Vnode/);
    });
});

describe('validators', () => {
    it('rejects unknown template/db', () => {
        assert.throws(() => validateTemplate('blog'));
        assert.throws(() => validateDb('oracle'));
        assert.equal(validateTemplate('minimal'), 'minimal');
    });
});
