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
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const pkgJsonPath = new URL('../package.json', import.meta.url);
const pkgJsonStr = readFileSync(pkgJsonPath, 'utf8');
const { version: VERSION } = JSON.parse(pkgJsonStr);

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
                types: ['node', 'vite/client'],
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

function moriaConfigTs(db: string, usePongo: boolean = false): string {
    const dbConfig =
        db === 'sqlite'
            ? `    adapter: 'sqlite',\n    filename: './dev.db',`
            : `    adapter: 'pg',\n    url: process.env.DATABASE_URL,${usePongo ? '\n    usePongo: true,' : ''}`;
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

function moriaConfigJs(db: string, usePongo: boolean = false): string {
    const dbConfig =
        db === 'sqlite'
            ? `    adapter: 'sqlite',\n    filename: './dev.db',`
            : `    adapter: 'pg',\n    url: process.env.DATABASE_URL,${usePongo ? '\n    usePongo: true,' : ''}`;
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

function viteConfigTs(): string {
    return `import { defineConfig } from 'vite';

export default defineConfig({
  base: '/assets/',
  build: {
    outDir: 'dist/client',
    assetsDir: '',
    rollupOptions: {
      input: 'src/entry-client.ts',
    },
    manifest: true,
  },
});
`;
}

function viteConfigJs(): string {
    return `import { defineConfig } from 'vite';

export default defineConfig({
  base: '/assets/',
  build: {
    outDir: 'dist/client',
    assetsDir: '',
    rollupOptions: {
      input: 'src/entry-client.js',
    },
    manifest: true,
  },
});
`;
}

function srcEnvDTs(): string {
    return `/// <reference types="vite/client" />\n`;
}

// ─── Project scripts ────────────────────────────────────

function scriptBuildJs(isTS: boolean): string {
    return `import fs from 'node:fs';
import { execSync } from 'node:child_process';

console.log('--- Building MoriaJS App ---');
${isTS ? `console.log('Compiling TypeScript...');
execSync('npx tsc', { stdio: 'inherit' });` : `console.log('Copying JavaScript files...');
if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
}
fs.cpSync('src', 'dist', {
    recursive: true,
    filter: (src) => !src.includes('entry-client') && !src.includes('vite.config')
});`}

console.log('Building client assets...');
execSync('npx vite build --outDir dist/client', { stdio: 'inherit' });
console.log('--- Build Complete ---');
`;
}

function scriptStartJs(): string {
    return `import { execSync } from 'node:child_process';

console.log('Preparing production build...');
execSync('node scripts/build.js', { stdio: 'inherit' });

console.log('Starting server...');
execSync('node dist/index.js', { stdio: 'inherit' });
`;
}

// ─── Default template source files ─────────────────────

function srcIndexTs(): string {
    return `/**
 * App entry point — starts the MoriaJS server.
 */

import { createApp } from '@moriajs/core';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const configPath = pathToFileURL(path.resolve(import.meta.dirname, 'moria.config.js')).href;
const { default: config } = await import(configPath);

const app = await createApp({
    config: {
        ...config,
        mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
        rootDir: path.resolve(import.meta.dirname, '..'),
    },
});

// Start listening (registers routes and starts the server)
const address = await app.listen();
console.log(\`\\n🏔️  MoriaJS running at \${address}\\n\`);
`;
}

function srcEntryClientTs(): string {
    return `/**
 * Client-side entry point.
 * Hydrates the server-rendered page to make it interactive.
 */

import '@hotwired/turbo';
import { bootstrap } from '@moriajs/renderer';

// Automatically discover and hydrate the correct page component.
// We only include pages, not API routes.
document.addEventListener('turbo:load', () => {
    bootstrap(import.meta.glob('./routes/pages/**/*.{ts,js,tsx,jsx}')).catch(console.error);
});
`;
}

function srcEntryClientJs(): string {
    return `/**
 * Client-side entry point.
 * Hydrates the server-rendered page to make it interactive.
 */

import '@hotwired/turbo';
import { bootstrap } from '@moriajs/renderer';

// Automatically discover and hydrate the correct page component.
// We only include pages, not API routes.
document.addEventListener('turbo:load', () => {
    bootstrap(import.meta.glob('./routes/pages/**/*.{ts,js,tsx,jsx}')).catch(console.error);
});
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

export async function GET(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    
    // The MoriaJS Agnostic DB API
    // Works regardless of the underlying library (Kysely, Pongo, etc.)
    if (!request.server.db) {
        return reply.status(503).send({
            error: 'Database not configured',
            hint: 'Set up your database in moria.config.ts. See: https://github.com/guntur-d/moriajs#5-database',
        });
    }

    const user = await request.server.db.findOne<{ id: string, name: string, email: string }>('users', { id });
    return user ?? reply.status(404).send({ error: \`User \${id} not found\` });
}
`;
}

function srcApiSearchTs(): string {
    return `/**
 * GET /api/search?q=...
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

export async function GET(request: FastifyRequest<{ Querystring: { q?: string } }>, reply: FastifyReply) {
    const { q = '' } = request.query;

    if (!request.server.db) {
        return reply.status(503).send({
            error: 'Database not configured',
            hint: 'Set up your database in moria.config.ts. See: https://github.com/guntur-d/moriajs#5-database',
        });
    }

    const results = await request.server.db.find('posts', { title: q });
    return { query: q, results };
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

export async function GET(request, reply) {
    const { id } = request.params;
    
    // The MoriaJS Agnostic DB API
    if (!request.server.db) {
        return reply.status(503).send({
            error: 'Database not configured',
            hint: 'Set up your database in moria.config.ts. See: https://github.com/guntur-d/moriajs#5-database',
        });
    }

    const user = await request.server.db.findOne('users', { id });
    return user ?? reply.status(404).send({ error: \`User \${id} not found\` });
}
`;
}

function srcApiSearchJs(): string {
    return `/**
 * GET /api/search?q=...
 */

export async function GET(request, reply) {
    const { q = '' } = request.query;

    if (!request.server.db) {
        return reply.status(503).send({
            error: 'Database not configured',
            hint: 'Set up your database in moria.config.ts. See: https://github.com/guntur-d/moriajs#5-database',
        });
    }

    const results = await request.server.db.find('posts', { title: q });
    return { query: q, results };
}
`;
}

function srcPageIndexTs(): string {
    return `/**
 * Home page — server-rendered Mithril.js component.
 */

import m from 'mithril';
import { Toaster, ConfirmationRegistry, confirm, toast } from '@moriajs/ui';

/** Server-side data loader */
export async function getServerData() {
    // ...
    return {
        title: 'Welcome to MoriaJS',
        features: [
            'File-based routing',
            'SSR + client hydration',
            'Centralized Confirmations',
            'Agnostic Database (Kysely/Pongo)',
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
        return m('div', [
            // Global UI Components
            m(Toaster),
            m(ConfirmationRegistry),
            
            m('main', { style: 'max-width:640px;margin:2rem auto;font-family:system-ui;padding:0 1rem' }, [
                m('h1', { style: 'font-size:2.5rem;margin-bottom:0.5rem' }, '🏔️ ' + (data?.title ?? 'MoriaJS')),
                m('p', { style: 'color:#666;font-size:1.1rem' }, 'Your full-stack Mithril.js app is up and running.'),
                
                m('div', { style: 'background:#f4f4f4;padding:1.5rem;border-radius:8px;margin:2rem 0;text-align:center' }, [
                    m('h3', { style: 'margin-top:0' }, 'Hydration & UI Demo'),
                    m('p', 'Click the button below to test the centralized confirmation dialog:'),
                    m('div', { style: 'display:flex;gap:1rem;justify-content:center;align-items:center;margin-top:1rem;' }, [
                        m('button', { 
                            style: 'background:#007bff;color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:4px;font-size:1rem;cursor:pointer',
                            onclick: () => { count++; }
                        }, \`Count is \${count}\`),
                        m('button', { 
                            style: 'background:#dc2626;color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:4px;font-size:1rem;cursor:pointer',
                            onclick: async () => { 
                                const confirmed = await confirm({
                                    title: 'Reset Counter?',
                                    message: 'This will reset the counter to zero. Are you sure?',
                                    confirmText: 'Yes, reset it',
                                    type: 'danger'
                                });
                                if (confirmed) {
                                    count = 0;
                                    toast.success('Counter reset successfully');
                                } else {
                                    toast.info('Action cancelled');
                                }
                            }
                        }, 'Reset Counter'),
                    ])
                ]),

                m('hr', { style: 'border:none;border-top:1px solid #eee;margin:1.5rem 0' }),
                m('h2', { style: 'font-size:1.3rem' }, 'Features'),
                m('ul', { style: 'line-height:1.8' },
                    (data?.features ?? []).map((f: string) => m('li', f))
                ),
                m('hr', { style: 'border:none;border-top:1px solid #eee;margin:1.5rem 0' }),
                m('h2', { style: 'font-size:1.3rem' }, 'Quick Links'),
                m('ul', { style: 'line-height:1.8;display:flex;gap:1rem;padding:0;list-style:none;flex-wrap:wrap;' }, [
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
            ])
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
import { Toaster, ConfirmationRegistry, confirm, toast } from '@moriajs/ui';

/** Server-side data loader */
export async function getServerData() {
    return {
        title: 'Welcome to MoriaJS',
        features: [
            'File-based routing',
            'SSR + client hydration',
            'Centralized Confirmations',
            'Agnostic Database (Kysely/Pongo)',
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
        return m('div', [
            // Global UI Components
            m(Toaster),
            m(ConfirmationRegistry),

            m('main', { style: 'max-width:640px;margin:2rem auto;font-family:system-ui;padding:0 1rem' }, [
                m('h1', { style: 'font-size:2.5rem;margin-bottom:0.5rem' }, '🏔️ ' + (data?.title ?? 'MoriaJS')),
                m('p', { style: 'color:#666;font-size:1.1rem' }, 'Your full-stack Mithril.js app is up and running.'),

                m('div', { style: 'background:#f4f4f4;padding:1.5rem;border-radius:8px;margin:2rem 0;text-align:center' }, [
                    m('h3', { style: 'margin-top:0' }, 'Hydration & UI Demo'),
                    m('p', 'Click the button below to test the centralized confirmation dialog:'),
                    m('div', { style: 'display:flex;gap:1rem;justify-content:center;align-items:center;margin-top:1rem;' }, [
                        m('button', { 
                            style: 'background:#007bff;color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:4px;font-size:1rem;cursor:pointer',
                            onclick: () => { count++; }
                        }, \`Count is \${count}\`),
                        m('button', { 
                            style: 'background:#dc2626;color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:4px;font-size:1rem;cursor:pointer',
                            onclick: async () => { 
                                const confirmed = await confirm({
                                    title: 'Reset Counter?',
                                    message: 'This will reset the counter to zero. Are you sure?',
                                    confirmText: 'Yes, reset it',
                                    type: 'danger'
                                });
                                if (confirmed) {
                                    count = 0;
                                    toast.success('Counter reset successfully');
                                } else {
                                    toast.info('Action cancelled');
                                }
                            }
                        }, 'Reset Counter'),
                    ])
                ]),

                m('hr', { style: 'border:none;border-top:1px solid #eee;margin:1.5rem 0' }),
                m('h2', { style: 'font-size:1.3rem' }, 'Features'),
                m('ul', { style: 'line-height:1.8' },
                    (data?.features ?? []).map((f) => m('li', f))
                ),
                m('hr', { style: 'border:none;border-top:1px solid #eee;margin:1.5rem 0' }),
                m('h2', { style: 'font-size:1.3rem' }, 'Quick Links'),
                m('ul', { style: 'line-height:1.8;display:flex;gap:1rem;padding:0;list-style:none;flex-wrap:wrap;' }, [
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
            ])
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
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __appRoot = path.resolve(__dirname, '..');

const configPath = pathToFileURL(path.resolve(__dirname, 'moria.config.js')).href;
const { default: config } = await import(configPath);

const app = await createApp({
    config: {
        ...config,
        mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
        rootDir: __appRoot,
    },
});

// Start listening (registers routes and starts the server)
const address = await app.listen();
console.log(\`\\n🏔️  MoriaJS running at \${address}\\n\`);
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
    .option('--pongo', 'Use Pongo with PostgreSQL', { default: false })
    .action(async (projectName?: string, options?: Record<string, any>) => {
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
            {
                type: (prev) => prev === 'pg' && !options?.db ? 'toggle' : null,
                name: 'usePongo',
                message: 'Use Pongo (MongoDB-like API on Postgres)?',
                initial: true,
                active: 'yes',
                inactive: 'no',
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
        const usePongo = (options?.pongo as boolean) || answers.usePongo || false;
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
        console.log(pc.dim(`  Database : ${db}${usePongo ? ' (with Pongo)' : ''}`));
        console.log();

        // ─── Create directory structure ─────────────────────
        if (template === 'default') {
            mkdirs(
                join(dir, 'src', 'routes', 'api'),
                join(dir, 'src', 'routes', 'api', 'users'),
                join(dir, 'src', 'routes', 'pages'),
                join(dir, 'scripts')
            );
        } else {
            mkdirs(
                join(dir, 'src', 'routes', 'api'),
                join(dir, 'scripts')
            );
        }

        // ─── package.json ───────────────────────────────────
        const deps: Record<string, string> = {
            '@moriajs/core': '^0.4.37',
            '@moriajs/db': '^0.4.37',
            '@moriajs/auth': '^0.4.37',
        };

        if (template === 'default') {
            deps['@moriajs/renderer'] = '^0.4.37';
            deps['@moriajs/ui'] = '^0.4.37';
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
            if (template === 'default') {
                devDeps['@types/mithril'] = '^2.2.0';
            }
        }

        const pkgJson = {
            name,
            version: '0.1.0',
            type: 'module',
            private: true,
            engines: {
                node: '>=20.11.0',
            },
            scripts: {
                dev: `tsx watch src/index.${ext}`,
                build: 'node scripts/build.js',
                start: 'node scripts/start.js',
            },
            dependencies: deps,
            devDependencies: devDeps,
        };

        write(join(dir, 'package.json'), JSON.stringify(pkgJson, null, 2) + '\n');

        write(
            join(dir, `src/moria.config.${ext}`),
            isTS ? moriaConfigTs(db, usePongo) : moriaConfigJs(db, usePongo)
        );

        // ─── Vite Config ────────────────────────────────────
        if (template === 'default') {
            write(
                join(dir, `vite.config.${ext}`),
                isTS ? viteConfigTs() : viteConfigJs()
            );
        }

        // ─── tsconfig.json ──────────────────────────────────
        if (isTS) {
            write(join(dir, 'tsconfig.json'), tsconfigContent() + '\n');
            write(join(dir, 'src/env.d.ts'), srcEnvDTs());
        }

        // ─── .env ───────────────────────────────────────────
        write(join(dir, '.env'), envContent(db));

        // ─── .gitignore ─────────────────────────────────────
        write(join(dir, '.gitignore'), gitignoreContent());

        // ─── README.md ──────────────────────────────────────
        const readmeContent = `# ${name}

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
        write(join(dir, 'README.md'), readmeContent);

        // ─── Scripts ────────────────────────────────────────
        write(join(dir, 'scripts/build.js'), scriptBuildJs(isTS));
        write(join(dir, 'scripts/start.js'), scriptStartJs());

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
        const filesCount = template === 'default' ? (isTS ? 11 : 9) : (isTS ? 8 : 7);

        console.log(pc.green(`✅ Created ${filesCount} files`));
        console.log();
        console.log(pc.cyan('  Next steps:'));
        console.log();
        console.log(pc.white(`  cd ${name}`));
        console.log(pc.white('  pnpm install'));
        console.log(pc.white('  pnpm dev'));
        console.log();
        console.log(pc.dim('  NOTE: If using pnpm, you may need to run:'));
        console.log(pc.dim('  pnpm approve-builds better-sqlite3'));
        console.log(pc.dim('  to enable the database engine on Windows.'));
        console.log();
        console.log(pc.dim(`  Then open http://localhost:3000`));
        console.log();
    });

cli.version(VERSION);
cli.help();
