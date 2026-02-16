/**
 * create-moria
 *
 * Interactive project scaffolder for MoriaJS.
 * Generates a complete, runnable project with two template options:
 *
 *   default  — Full-featured: SSR page, API route, middleware, client hydration
 *   minimal  — Bare API server: single API route, no SSR/UI
 *
 * Usage:
 *   npx create-moria my-app
 *   npx create-moria my-app --template minimal
 *   npx create-moria my-app --typescript
 */

import { cac } from 'cac';
import pc from 'picocolors';
import prompts from 'prompts';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const VERSION = '0.3.5';

export const cli = cac('create-moria');

// ─── Template file generators ─────────────────────────

function tsconfigContent(): string {
    return JSON.stringify(
        {
            compilerOptions: {
                target: 'ES2022',
                module: 'ESNext',
                moduleResolution: 'bundler',
                esModuleInterop: true,
                strict: true,
                skipLibCheck: true,
                outDir: 'dist',
                rootDir: 'src',
                declaration: true,
                declarationMap: true,
                sourceMap: true,
            },
            include: ['src'],
            exclude: ['node_modules', 'dist'],
        },
        null,
        4
    );
}

function envContent(db: string): string {
    const lines = [
        '# MoriaJS Environment Variables',
        '',
        '# Server',
        'PORT=3000',
        '',
        '# Database',
    ];
    if (db === 'pg') {
        lines.push('DATABASE_URL=postgresql://user:password@localhost:5432/mydb');
    } else {
        lines.push('# SQLite uses a local file (configured in moria.config.ts)');
    }
    lines.push('', '# Auth', 'JWT_SECRET=change-me-to-a-random-secret', '');
    return lines.join('\n');
}

function gitignoreContent(): string {
    return `node_modules/
dist/
.env
*.db
.turbo/
`;
}

function moriaConfigTs(db: string): string {
    const dbConfig =
        db === 'sqlite'
            ? `    adapter: 'sqlite',\n    filename: './dev.db',`
            : `    adapter: 'pg',\n    url: process.env.DATABASE_URL,`;
    return `import { defineConfig } from '@moriajs/core';

export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 3000,
  },
  database: {
${dbConfig}
  },
  vite: {
    clientEntry: '/src/entry-client.ts',
  },
});
`;
}

function moriaConfigJs(db: string): string {
    const dbConfig =
        db === 'sqlite'
            ? `    adapter: 'sqlite',\n    filename: './dev.db',`
            : `    adapter: 'pg',\n    url: process.env.DATABASE_URL,`;
    return `/** @type {import('@moriajs/core').MoriaConfig} */
export default {
  server: {
    port: Number(process.env.PORT) || 3000,
  },
  database: {
${dbConfig}
  },
  vite: {
    clientEntry: '/src/entry-client.js',
  },
};
`;
}

// ─── Default template source files ─────────────────────

function srcIndexTs(): string {
    return `/**
 * App entry point — starts the MoriaJS server.
 */

import { createApp } from '@moriajs/core';
import path from 'node:path';

const __appRoot = path.resolve(import.meta.dirname, '..');

async function main() {
    const { default: config } = await import('../moria.config.js');

    const app = await createApp({
        config: {
            ...config,
            mode: 'development',
            rootDir: __appRoot,
        },
    });

    const address = await app.listen();
    console.log(\`\\n🏔️  MoriaJS running at \${address}\\n\`);
}

main().catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
});
`;
}

function srcEntryClientTs(): string {
    return `/**
 * Client-side entry point.
 * Hydrates the server-rendered page to make it interactive.
 */

import { hydrate, getHydrationData } from '@moriajs/renderer';
import HomePage from './routes/pages/index.js';

const data = getHydrationData();
const root = document.getElementById('app');

if (root) {
    hydrate(HomePage, root, data);
}
`;
}

function srcEntryClientJs(): string {
    return `/**
 * Client-side entry point.
 * Hydrates the server-rendered page to make it interactive.
 */

import { hydrate, getHydrationData } from '@moriajs/renderer';
import HomePage from './routes/pages/index.js';

const data = getHydrationData();
const root = document.getElementById('app');

if (root) {
    hydrate(HomePage, root, data);
}
`;
}

function srcMiddlewareTs(): string {
    return `/**
 * Root middleware — runs on every request.
 */

import { defineMiddleware } from '@moriajs/core';

export default defineMiddleware(async (request) => {
    request.log.info(\`→ \${request.method} \${request.url}\`);
});
`;
}

function srcApiHelloTs(): string {
    return `/**
 * GET /api/hello
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

export function GET(_request: FastifyRequest, _reply: FastifyReply) {
    return {
        message: 'Hello from MoriaJS! 🏔️',
        timestamp: new Date().toISOString(),
    };
}
`;
}

function srcApiHealthTs(): string {
    return `/**
 * GET /api/health
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

export function GET(_request: FastifyRequest, _reply: FastifyReply) {
    return { status: 'ok', uptime: process.uptime() };
}
`;
}

function srcApiUsersTs(): string {
    return `/**
 * GET /api/users/:id
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

export function GET(request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) {
    const { id } = request.params;
    return {
        id,
        name: \`User \${id}\`,
        email: \`user\${id}@example.com\`,
    };
}
`;
}

function srcApiSearchTs(): string {
    return `/**
 * GET /api/search?q=...
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

export function GET(request: FastifyRequest<{ Querystring: { q?: string } }>, _reply: FastifyReply) {
    const { q = '' } = request.query;
    return {
        query: q,
        results: [
            { id: 1, title: \`Result for \${q} 1\` },
            { id: 2, title: \`Result for \${q} 2\` },
        ],
    };
}
`;
}

function srcApiHelloJs(): string {
    return `/**
 * GET /api/hello
 */

export function GET(_request, _reply) {
    return {
        message: 'Hello from MoriaJS! 🏔️',
        timestamp: new Date().toISOString(),
    };
}
`;
}

function srcApiHealthJs(): string {
    return `/**
 * GET /api/health
 */

export function GET(_request, _reply) {
    return { status: 'ok', uptime: process.uptime() };
}
`;
}

function srcApiUsersJs(): string {
    return `/**
 * GET /api/users/:id
 */

export function GET(request, _reply) {
    const { id } = request.params;
    return {
        id,
        name: \`User \${id}\`,
        email: \`user\${id}@example.com\`,
    };
}
`;
}

function srcApiSearchJs(): string {
    return `/**
 * GET /api/search?q=...
 */

export function GET(request, _reply) {
    const { q = '' } = request.query;
    return {
        query: q,
        results: [
            { id: 1, title: \`Result for \${q} 1\` },
            { id: 2, title: \`Result for \${q} 2\` },
        ],
    };
}
`;
}

function srcPageIndexTs(): string {
    return `/**
 * Home page — server-rendered Mithril.js component.
 */

import m from 'mithril';

/** Server-side data loader */
export async function getServerData() {
    return {
        title: 'Welcome to MoriaJS',
        features: [
            'File-based routing',
            'SSR + client hydration',
            'Middleware system',
            'Database with Kysely',
            'JWT authentication',
        ],
    };
}

/** Page component */
let count = 0;

export default {
    title: 'MoriaJS App',
    view(vnode: m.Vnode<{ serverData?: { title: string; features: string[] } }>) {
        const data = vnode.attrs?.serverData;
        return m('main', { style: 'max-width:640px;margin:2rem auto;font-family:system-ui;padding:0 1rem' }, [
            m('h1', { style: 'font-size:2.5rem;margin-bottom:0.5rem' }, '🏔️ ' + (data?.title ?? 'MoriaJS')),
            m('p', { style: 'color:#666;font-size:1.1rem' }, 'Your full-stack Mithril.js app is up and running.'),
            
            m('div', { style: 'background:#f4f4f4;padding:1.5rem;border-radius:8px;margin:2rem 0;text-align:center' }, [
                m('h3', { style: 'margin-top:0' }, 'Hydration Demo'),
                m('p', 'Click the button below to verify that client-side hydration is working:'),
                m('button', { 
                    style: 'background:#007bff;color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:4px;font-size:1rem;cursor:pointer',
                    onclick: () => { count++; }
                }, \`Count is \${count}\`),
            ]),

            m('hr', { style: 'border:none;border-top:1px solid #eee;margin:1.5rem 0' }),
            m('h2', { style: 'font-size:1.3rem' }, 'Features'),
            m('ul', { style: 'line-height:1.8' },
                (data?.features ?? []).map((f: string) => m('li', f))
            ),
            m('hr', { style: 'border:none;border-top:1px solid #eee;margin:1.5rem 0' }),
            m('h2', { style: 'font-size:1.3rem' }, 'Quick Links'),
            m('ul', { style: 'line-height:1.8;display:flex;gap:1rem;padding:0;list-style:none' }, [
                m('li', m('a', { href: '/api/hello', target: '_blank' }, 'Hello API')),
                m('li', m('a', { href: '/api/health', target: '_blank' }, 'Health Check')),
                m('li', m('a', { href: '/api/users/42', target: '_blank' }, 'User Params')),
                m('li', m('a', { href: '/api/search?q=moria', target: '_blank' }, 'Search Query')),
            ]),
            m('hr', { style: 'border:none;border-top:1px solid #eee;margin:1.5rem 0' }),
            m('p', { style: 'color:#999;font-size:0.9rem' }, [
                'Edit ',
                m('code', 'src/routes/pages/index.ts'),
                ' to get started.',
            ]),
        ]);
    },
};
`;
}

function srcPageIndexJs(): string {
    return `/**
 * Home page — server-rendered Mithril.js component.
 */

import m from 'mithril';

/** Server-side data loader */
export async function getServerData() {
    return {
        title: 'Welcome to MoriaJS',
        features: [
            'File-based routing',
            'SSR + client hydration',
            'Middleware system',
            'Database with Kysely',
            'JWT authentication',
        ],
    };
}

/** Page component */
let count = 0;

export default {
    title: 'MoriaJS App',
    view(vnode) {
        const data = vnode.attrs?.serverData;
        return m('main', { style: 'max-width:640px;margin:2rem auto;font-family:system-ui;padding:0 1rem' }, [
            m('h1', { style: 'font-size:2.5rem;margin-bottom:0.5rem' }, '🏔️ ' + (data?.title ?? 'MoriaJS')),
            m('p', { style: 'color:#666;font-size:1.1rem' }, 'Your full-stack Mithril.js app is up and running.'),

            m('div', { style: 'background:#f4f4f4;padding:1.5rem;border-radius:8px;margin:2rem 0;text-align:center' }, [
                m('h3', { style: 'margin-top:0' }, 'Hydration Demo'),
                m('p', 'Click the button below to verify that client-side hydration is working:'),
                m('button', { 
                    style: 'background:#007bff;color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:4px;font-size:1rem;cursor:pointer',
                    onclick: () => { count++; }
                }, \`Count is \${count}\`),
            ]),

            m('hr', { style: 'border:none;border-top:1px solid #eee;margin:1.5rem 0' }),
            m('h2', { style: 'font-size:1.3rem' }, 'Features'),
            m('ul', { style: 'line-height:1.8' },
                (data?.features ?? []).map((f) => m('li', f))
            ),
            m('hr', { style: 'border:none;border-top:1px solid #eee;margin:1.5rem 0' }),
            m('h2', { style: 'font-size:1.3rem' }, 'Quick Links'),
            m('ul', { style: 'line-height:1.8;display:flex;gap:1rem;padding:0;list-style:none' }, [
                m('li', m('a', { href: '/api/hello', target: '_blank' }, 'Hello API')),
                m('li', m('a', { href: '/api/health', target: '_blank' }, 'Health Check')),
                m('li', m('a', { href: '/api/users/42', target: '_blank' }, 'User Params')),
                m('li', m('a', { href: '/api/search?q=moria', target: '_blank' }, 'Search Query')),
            ]),
            m('hr', { style: 'border:none;border-top:1px solid #eee;margin:1.5rem 0' }),
            m('p', { style: 'color:#999;font-size:0.9rem' }, [
                'Edit ',
                m('code', 'src/routes/pages/index.js'),
                ' to get started.',
            ]),
        ]);
    },
};
`;
}

function srcIndexJs(): string {
    return `/**
 * App entry point — starts the MoriaJS server.
 */

import { createApp } from '@moriajs/core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __appRoot = path.resolve(__dirname, '..');

async function main() {
    const { default: config } = await import('../moria.config.js');

    const app = await createApp({
        config: {
            ...config,
            mode: 'development',
            rootDir: __appRoot,
        },
    });

    const address = await app.listen();
    console.log(\`\\n🏔️  MoriaJS running at \${address}\\n\`);
}

main().catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
});
`;
}

function srcMiddlewareJs(): string {
    return `/**
 * Root middleware — runs on every request.
 */

export default async function middleware(request) {
    request.log.info(\`→ \${request.method} \${request.url}\`);
}
`;
}

// ─── Helpers ────────────────────────────────────────────

function write(filePath: string, content: string) {
    writeFileSync(filePath, content);
}

function mkdirs(...dirs: string[]) {
    for (const dir of dirs) {
        mkdirSync(dir, { recursive: true });
    }
}

// ─── CLI command ────────────────────────────────────────

cli
    .command('[project-name]', 'Create a new MoriaJS project')
    .option('--template <template>', 'Template: default | minimal', { default: '' })
    .option('--typescript', 'Use TypeScript (default)')
    .option('--javascript', 'Use JavaScript')
    .option('--db <adapter>', 'Database adapter: pg | sqlite', { default: '' })
    .action(async (projectName?: string, options?: Record<string, unknown>) => {
        console.log();
        console.log(pc.cyan('🏔️  create-moria') + pc.dim(` v${VERSION}`));
        console.log(pc.dim('  The MoriaJS project scaffolder'));
        console.log();

        // Interactive prompts if not provided via args
        const answers = await prompts([
            {
                type: projectName ? null : 'text',
                name: 'projectName',
                message: 'Project name:',
                initial: 'my-moria-app',
            },
            {
                type: options?.template ? null : 'select',
                name: 'template',
                message: 'Template:',
                choices: [
                    { title: 'Default — SSR page, API, middleware, full-featured', value: 'default' },
                    { title: 'Minimal — API-only, no SSR/UI', value: 'minimal' },
                ],
                initial: 0,
            },
            {
                type: options?.typescript || options?.javascript ? null : 'select',
                name: 'language',
                message: 'Language:',
                choices: [
                    { title: 'TypeScript', value: 'ts' },
                    { title: 'JavaScript', value: 'js' },
                ],
                initial: 0,
            },
            {
                type: options?.db ? null : 'select',
                name: 'database',
                message: 'Database:',
                choices: [
                    { title: 'SQLite (easy local development)', value: 'sqlite' },
                    { title: 'PostgreSQL (production-ready)', value: 'pg' },
                ],
                initial: 0,
            },
        ]);

        const name = projectName ?? answers.projectName;
        if (!name) {
            console.log(pc.red('Error: project name is required.'));
            process.exit(1);
        }

        const template = (options?.template as string) || answers.template || 'default';
        const isTS = (options?.typescript as boolean) || answers.language === 'ts' || (!options?.javascript && !answers.language);
        const lang = isTS ? 'ts' : 'js';
        const db = (options?.db as string) || answers.database || 'sqlite';
        const dir = resolve(process.cwd(), name);
        const ext = lang === 'ts' ? 'ts' : 'js';

        if (existsSync(dir)) {
            console.log(pc.red(`Error: directory "${name}" already exists.`));
            process.exit(1);
        }

        console.log();
        console.log(pc.green(`Creating MoriaJS project in ${pc.bold(dir)}`));
        console.log(pc.dim(`  Template : ${template}`));
        console.log(pc.dim(`  Language : ${isTS ? 'TypeScript' : 'JavaScript'}`));
        console.log(pc.dim(`  Database : ${db}`));
        console.log();

        // ─── Create directory structure ─────────────────────
        if (template === 'default') {
            mkdirs(
                join(dir, 'src', 'routes', 'api'),
                join(dir, 'src', 'routes', 'api', 'users'),
                join(dir, 'src', 'routes', 'pages')
            );
        } else {
            mkdirs(join(dir, 'src', 'routes', 'api'));
        }

        // ─── package.json ───────────────────────────────────
        const deps: Record<string, string> = {
            '@moriajs/core': '^0.3.0',
            '@moriajs/db': '^0.3.0',
            '@moriajs/auth': '^0.3.0',
        };

        if (template === 'default') {
            deps['@moriajs/renderer'] = '^0.3.0';
            deps['@moriajs/ui'] = '^0.3.0';
            deps['mithril'] = '^2.2.0';
        }

        const devDeps: Record<string, string> = {
            tsx: '^4.0.0',
        };

        if (isTS) {
            devDeps['typescript'] = '^5.7.0';
            devDeps['@types/node'] = '^22.0.0';
            if (template === 'default') {
                devDeps['@types/mithril'] = '^2.2.0';
            }
        }

        const pkgJson = {
            name,
            version: '0.1.0',
            type: 'module',
            private: true,
            scripts: {
                dev: `tsx watch src/index.${ext}`,
                build: isTS ? 'tsc' : 'echo "No build step for JS"',
                start: `node dist/index.js`,
            },
            dependencies: deps,
            devDependencies: devDeps,
        };

        write(join(dir, 'package.json'), JSON.stringify(pkgJson, null, 2) + '\n');

        // ─── Config ─────────────────────────────────────────
        write(
            join(dir, `moria.config.${ext}`),
            isTS ? moriaConfigTs(db) : moriaConfigJs(db)
        );

        // ─── tsconfig.json ──────────────────────────────────
        if (isTS) {
            write(join(dir, 'tsconfig.json'), tsconfigContent() + '\n');
        }

        // ─── .env ───────────────────────────────────────────
        write(join(dir, '.env'), envContent(db));

        // ─── .gitignore ─────────────────────────────────────
        write(join(dir, '.gitignore'), gitignoreContent());

        // ─── Source files ───────────────────────────────────
        if (template === 'default') {
            // App entry
            write(join(dir, `src/index.${ext}`), isTS ? srcIndexTs() : srcIndexJs());

            // Client entry
            write(join(dir, `src/entry-client.${ext}`), isTS ? srcEntryClientTs() : srcEntryClientJs());

            // Root middleware
            write(
                join(dir, `src/routes/_middleware.${ext}`),
                isTS ? srcMiddlewareTs() : srcMiddlewareJs()
            );

            // API route
            write(
                join(dir, `src/routes/api/hello.${ext}`),
                isTS ? srcApiHelloTs() : srcApiHelloJs()
            );

            // SSR page
            write(
                join(dir, `src/routes/pages/index.${ext}`),
                isTS ? srcPageIndexTs() : srcPageIndexJs()
            );

            // Additional API routes
            write(
                join(dir, `src/routes/api/health.${ext}`),
                isTS ? srcApiHealthTs() : srcApiHealthJs()
            );
            write(
                join(dir, `src/routes/api/users/[id].${ext}`),
                isTS ? srcApiUsersTs() : srcApiUsersJs()
            );
            write(
                join(dir, `src/routes/api/search.${ext}`),
                isTS ? srcApiSearchTs() : srcApiSearchJs()
            );
        } else {
            // Minimal template — just entry + one API route
            write(join(dir, `src/index.${ext}`), isTS ? srcIndexTs() : srcIndexJs());
            write(
                join(dir, `src/routes/api/hello.${ext}`),
                isTS ? srcApiHelloTs() : srcApiHelloJs()
            );
        }

        // ─── Done ───────────────────────────────────────────
        const filesCount = template === 'default' ? (isTS ? 9 : 7) : (isTS ? 6 : 5);

        console.log(pc.green(`✅ Created ${filesCount} files`));
        console.log();
        console.log(pc.cyan('  Next steps:'));
        console.log();
        console.log(pc.white(`  cd ${name}`));
        console.log(pc.white('  pnpm install'));
        console.log(pc.white('  pnpm dev'));
        console.log();
        console.log(pc.dim(`  Then open http://localhost:3000`));
        console.log();
    });

cli.version(VERSION);
cli.help();
