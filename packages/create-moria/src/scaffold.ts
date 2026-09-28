/**
 * create-moria - filesystem + package-plan helpers.
 * Single owner for scaffold IO so index.ts stays an orchestrator.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import type { TemplateLang } from './templates/config.js';
import { tsconfigContent, envContent, gitignoreContent, moriaConfig, viteConfig, srcEnvDTs } from './templates/config.js';
import { scriptBuild, scriptStart } from './templates/scripts.js';
import { srcIndex, srcEntryClient, srcMiddleware } from './templates/entry.js';
import { srcApiHello, srcApiHealth, srcApiUsers, srcApiSearch } from './templates/routes.js';
import { srcPageIndex } from './templates/pages.js';

export interface ScaffoldOptions {
    dir: string;
    name: string;
    template: 'default' | 'minimal';
    lang: TemplateLang;
    db: string;
    usePongo: boolean;
}

export function frameworkVersion(pkg: string, fallback: string): string {
    const require = createRequire(import.meta.url);
    try {
        const pkgJson = require(`${pkg}/package.json`) as { version?: string };
        if (pkgJson.version) return pkgJson.version;
    } catch {
        // Not resolvable — fall through to fallback.
    }
    return fallback;
}

export function writeFile(filePath: string, content: string): void {
    writeFileSync(filePath, content);
}

export function makeDirs(...dirs: string[]): void {
    for (const dir of dirs) {
        mkdirSync(dir, { recursive: true });
    }
}

export function buildPackageJson(opts: ScaffoldOptions, versions: Record<string, string>) {
    const isTS = opts.lang === 'ts';
    const ext = opts.lang;
    const deps: Record<string, string> = {
        '@moriajs/core': `^${versions['@moriajs/core']}`,
        '@moriajs/db': `^${versions['@moriajs/db']}`,
        '@moriajs/auth': `^${versions['@moriajs/auth']}`,
    };

    if (opts.template === 'default') {
        deps['@moriajs/renderer'] = `^${versions['@moriajs/renderer']}`;
        deps['@moriajs/ui'] = `^${versions['@moriajs/ui']}`;
        deps['mithril'] = '^2.2.0';
        deps['@hotwired/turbo'] = '^8.0.0';
    }

    const devDeps: Record<string, string> = {
        tsx: '^4.0.0',
        fastify: '^5.2.0',
        vite: '^6.0.0',
    };

    if (isTS) {
        devDeps['typescript'] = '^5.7.0';
        devDeps['@types/node'] = '^22.0.0';
        if (opts.template === 'default') {
            devDeps['@types/mithril'] = '^2.2.0';
        }
    }

    return {
        name: opts.name,
        version: '0.1.0',
        type: 'module',
        private: true,
        engines: { node: '>=20.11.0' },
        scripts: {
            dev: `tsx watch src/index.${ext}`,
            build: 'node scripts/build.js',
            start: 'node scripts/start.js',
        },
        dependencies: deps,
        devDependencies: devDeps,
    };
}

function readmeContent(name: string): string {
    return `# ${name}

🏔️ A full-stack MoriaJS application.

## Getting Started

1. Install dependencies:
   \`\`\`bash
   pnpm install
   \`\`\`

2. Start the development server:
   \`\`\`bash
   pnpm dev
   \`\`\`

3. Build and start for production:
   \`\`\`bash
   pnpm build
   pnpm start
   \`\`\`
`;
}

/**
 * Write all scaffold files. Returns the number of files written
 * (derived from actual writes — never hardcoded).
 */
export function writeScaffold(opts: ScaffoldOptions, versions: Record<string, string>): number {
    const { dir, template, lang, db, usePongo } = opts;
    const ext = lang;
    const isTS = lang === 'ts';
    let files = 0;
    const write = (filePath: string, content: string) => {
        writeFile(filePath, content);
        files += 1;
    };

    if (template === 'default') {
        makeDirs(
            join(dir, 'src', 'routes', 'api'),
            join(dir, 'src', 'routes', 'api', 'users'),
            join(dir, 'src', 'routes', 'pages'),
            join(dir, 'scripts')
        );
    } else {
        makeDirs(join(dir, 'src', 'routes', 'api'), join(dir, 'scripts'));
    }

    write(join(dir, 'package.json'), JSON.stringify(buildPackageJson(opts, versions), null, 2) + '\n');
    write(join(dir, `src/moria.config.${ext}`), moriaConfig(lang, db, usePongo));

    if (template === 'default') {
        write(join(dir, `vite.config.${ext}`), viteConfig(lang));
    }

    if (isTS) {
        write(join(dir, 'tsconfig.json'), tsconfigContent() + '\n');
        write(join(dir, 'src/env.d.ts'), srcEnvDTs());
    }

    write(join(dir, '.env'), envContent(db));
    write(join(dir, '.gitignore'), gitignoreContent());
    write(join(dir, 'README.md'), readmeContent(opts.name));
    write(join(dir, 'scripts/build.js'), scriptBuild(isTS));
    write(join(dir, 'scripts/start.js'), scriptStart());

    if (template === 'default') {
        write(join(dir, `src/index.${ext}`), srcIndex(lang));
        write(join(dir, `src/entry-client.${ext}`), srcEntryClient(lang));
        write(join(dir, `src/routes/_middleware.${ext}`), srcMiddleware(lang));
        write(join(dir, `src/routes/api/hello.${ext}`), srcApiHello(lang));
        write(join(dir, `src/routes/pages/index.${ext}`), srcPageIndex(lang));
        write(join(dir, `src/routes/api/health.${ext}`), srcApiHealth(lang));
        write(join(dir, `src/routes/api/users/[id].${ext}`), srcApiUsers(lang));
        write(join(dir, `src/routes/api/search.${ext}`), srcApiSearch(lang));
    } else {
        write(join(dir, `src/index.${ext}`), srcIndex(lang));
        write(join(dir, `src/routes/api/hello.${ext}`), srcApiHello(lang));
    }

    return files;
}
