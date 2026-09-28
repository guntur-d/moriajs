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
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { frameworkVersion, writeScaffold } from './scaffold.js';
import { promptForMissing, resolveScaffold, validateDb, validateTemplate } from './options.js';
import type { RawCliOptions } from './options.js';

const pkgJsonPath = new URL('../package.json', import.meta.url);
const pkgJsonStr = readFileSync(pkgJsonPath, 'utf8');
const { version: VERSION } = JSON.parse(pkgJsonStr);

export const cli = cac('create-moria');

// ─── CLI command ────────────────────────────────────────

cli
    .command('[project-name]', 'Create a new MoriaJS project')
    .option('--template <template>', 'Template: default | minimal', { default: '' })
    .option('--typescript', 'Use TypeScript (default)')
    .option('--javascript', 'Use JavaScript')
    .option('--db <adapter>', 'Database adapter: pg | sqlite', { default: '' })
    .option('--pongo', 'Use Pongo with PostgreSQL', { default: false })
    .action(async (projectName?: string, rawOptions?: RawCliOptions) => {
        console.log();
        console.log(pc.cyan('🏔️  create-moria') + pc.dim(` v${VERSION}`));
        console.log(pc.dim('  The MoriaJS project scaffolder'));
        console.log();

        const options = rawOptions ?? {};
        const answers = await promptForMissing(projectName, options);
        const resolved = resolveScaffold(projectName, options, answers);

        if (!resolved.name) {
            console.log(pc.red('Error: project name is required.'));
            process.exit(1);
        }

        const template = validateTemplate(resolved.template);
        const db = validateDb(resolved.db);
        const dir = resolve(process.cwd(), resolved.name);

        if (existsSync(dir)) {
            console.log(pc.red(`Error: directory "${resolved.name}" already exists.`));
            process.exit(1);
        }

        console.log();
        console.log(pc.green(`Creating MoriaJS project in ${pc.bold(dir)}`));
        console.log(pc.dim(`  Template : ${template}`));
        console.log(pc.dim(`  Language : ${resolved.lang === 'ts' ? 'TypeScript' : 'JavaScript'}`));
        console.log(pc.dim(`  Database : ${db}${resolved.usePongo ? ' (with Pongo)' : ''}`));
        console.log();

        const versions: Record<string, string> = {
            '@moriajs/core': frameworkVersion('@moriajs/core', VERSION),
            '@moriajs/db': frameworkVersion('@moriajs/db', VERSION),
            '@moriajs/auth': frameworkVersion('@moriajs/auth', VERSION),
            '@moriajs/renderer': frameworkVersion('@moriajs/renderer', VERSION),
            '@moriajs/ui': frameworkVersion('@moriajs/ui', VERSION),
        };

        const filesCount = writeScaffold(
            { dir, name: resolved.name, template, lang: resolved.lang, db, usePongo: resolved.usePongo },
            versions
        );

        // ─── Done ───────────────────────────────────────────
        console.log(pc.green(`✅ Created ${filesCount} files`));
        console.log();
        console.log(pc.cyan('  Next steps:'));
        console.log();
        console.log(pc.white(`  cd ${resolved.name}`));
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
