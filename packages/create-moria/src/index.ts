/**
 * create-moria
 *
 * Interactive project scaffolder for MoriaJS.
 * Supports both TypeScript and JavaScript projects.
 *
 * Usage:
 *   npx create-moria my-app
 *   npx create-moria my-app --typescript
 *   npx create-moria my-app --javascript
 */

import { cac } from 'cac';
import pc from 'picocolors';
import prompts from 'prompts';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const VERSION = '0.0.1';

export const cli = cac('create-moria');

cli
    .command('[project-name]', 'Create a new MoriaJS project')
    .option('--typescript', 'Use TypeScript (default)')
    .option('--javascript', 'Use JavaScript')
    .option('--db <adapter>', 'Database adapter: pg | sqlite', { default: 'sqlite' })
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
        const lang = options?.javascript ? 'js' : (answers.language ?? 'ts');
        const db = (options?.db as string) ?? answers.database ?? 'sqlite';
        const dir = resolve(process.cwd(), name);

        if (existsSync(dir)) {
            console.log(pc.red(`Error: directory "${name}" already exists.`));
            process.exit(1);
        }

        console.log();
        console.log(pc.green(`Creating MoriaJS project in ${pc.bold(dir)}`));
        console.log(pc.dim(`  Language: ${lang === 'ts' ? 'TypeScript' : 'JavaScript'}`));
        console.log(pc.dim(`  Database: ${db}`));
        console.log();

        // Create project structure
        mkdirSync(join(dir, 'src', 'routes'), { recursive: true });
        mkdirSync(join(dir, 'src', 'views'), { recursive: true });

        // package.json
        writeFileSync(
            join(dir, 'package.json'),
            JSON.stringify(
                {
                    name,
                    version: '0.1.0',
                    type: 'module',
                    private: true,
                    scripts: {
                        dev: 'moria dev',
                        build: 'moria build',
                        start: 'moria start',
                    },
                    dependencies: {
                        '@moriajs/core': 'latest',
                        '@moriajs/renderer': 'latest',
                        '@moriajs/db': 'latest',
                        '@moriajs/auth': 'latest',
                        '@moriajs/ui': 'latest',
                        mithril: '^2.2.0',
                    },
                    devDependencies:
                        lang === 'ts'
                            ? {
                                '@moriajs/cli': 'latest',
                                typescript: '^5.7.0',
                                '@types/mithril': '^2.2.0',
                            }
                            : {
                                '@moriajs/cli': 'latest',
                            },
                },
                null,
                2
            )
        );

        // moria.config
        const ext = lang === 'ts' ? 'ts' : 'js';
        const configContent =
            lang === 'ts'
                ? `import { defineConfig } from '@moriajs/core';

export default defineConfig({
  server: {
    port: 3000,
  },
  database: {
    adapter: '${db}',
    ${db === 'sqlite' ? "filename: './dev.db'," : "url: process.env.DATABASE_URL,"}
  },
});
`
                : `/** @type {import('@moriajs/core').MoriaConfig} */
export default {
  server: {
    port: 3000,
  },
  database: {
    adapter: '${db}',
    ${db === 'sqlite' ? "filename: './dev.db'," : "url: process.env.DATABASE_URL,"}
  },
};
`;

        writeFileSync(join(dir, `moria.config.${ext}`), configContent);

        // .gitignore
        writeFileSync(
            join(dir, '.gitignore'),
            'node_modules/\ndist/\n.env\n*.db\n.turbo/\n'
        );

        console.log(pc.green('✅ Project created successfully!'));
        console.log();
        console.log(pc.cyan('  Next steps:'));
        console.log(pc.dim(`  cd ${name}`));
        console.log(pc.dim('  pnpm install'));
        console.log(pc.dim('  pnpm dev'));
        console.log();
    });

cli.version(VERSION);
cli.help();
