/**
 * @moriajs/cli
 *
 * CLI tool for MoriaJS framework development.
 * Commands: dev, build, start, generate
 */

import { cac } from 'cac';
import pc from 'picocolors';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';

const VERSION = '0.4.14';

export const cli = cac('moria');

/**
 * Attempt to load moria.config.ts from the current working directory.
 */
async function loadConfig(): Promise<Record<string, unknown>> {
    const cwd = process.cwd();
    const configFiles = ['moria.config.ts', 'moria.config.js', 'moria.config.mjs'];

    for (const file of configFiles) {
        const configPath = path.resolve(cwd, file);
        if (fs.existsSync(configPath)) {
            try {
                const mod = await import(pathToFileURL(configPath).href);
                return mod.default ?? mod;
            } catch {
                // Config load failed, continue
            }
        }
    }

    return {};
}

// ─── dev ────────────────────────────────────────────
cli
    .command('dev', 'Start the development server with HMR')
    .option('--port <port>', 'Port to listen on', { default: 3000 })
    .option('--host <host>', 'Host to bind to', { default: 'localhost' })
    .option('--force', 'Clear Vite cache before starting')
    .action(async (options) => {
        console.log(pc.cyan('🏔️  MoriaJS') + pc.dim(` v${VERSION}`));
        console.log(pc.green('Starting dev server...'));

        if (options.force) {
            const viteCache = path.resolve(process.cwd(), 'node_modules', '.vite');
            if (fs.existsSync(viteCache)) {
                console.log(pc.yellow('  → Clearing Vite cache (.vite)...'));
                fs.rmSync(viteCache, { recursive: true, force: true });
            }
        }

        console.log();

        try {
            const { createApp } = await import('@moriajs/core');
            const userConfig = await loadConfig();

            const app = await createApp({
                config: {
                    ...userConfig,
                    mode: 'development',
                    rootDir: process.cwd(),
                    server: {
                        ...(userConfig.server as Record<string, unknown> ?? {}),
                        port: Number(options.port),
                        host: options.host,
                    },
                },
            });

            const address = await app.listen();
            console.log();
            console.log(pc.green('  ✓ ') + pc.bold('Dev server ready'));
            console.log(pc.dim(`    → ${address}`));
            console.log(pc.dim('    → HMR enabled via Vite'));
            console.log();
        } catch (err) {
            console.error(pc.red('Failed to start dev server:'), err);
            process.exit(1);
        }
    });

// ─── build ──────────────────────────────────────────
cli
    .command('build', 'Build for production')
    .action(async () => {
        console.log(pc.cyan('🏔️  MoriaJS') + pc.dim(` v${VERSION}`));
        console.log(pc.green('Building for production...'));
        console.log();

        try {
            const { build } = await import('vite');
            const userConfig = await loadConfig();

            // Client build
            console.log(pc.dim('  → Building client bundle...'));

            let clientEntry = (userConfig.vite as any)?.clientEntry ||
                (fs.existsSync(path.resolve(process.cwd(), 'src/entry-client.ts'))
                    ? 'src/entry-client.ts'
                    : 'src/entry-client.js');

            // Strip leading slash to prevent absolute path resolution issues on Windows
            if (clientEntry.startsWith('/')) {
                clientEntry = clientEntry.slice(1);
            }

            await build({
                root: process.cwd(),
                configFile: false, // Don't use local vite.config.ts for the internal build
                resolve: {
                    alias: {
                        '@moriajs/renderer': path.resolve(process.cwd(), 'node_modules/@moriajs/renderer/dist/index.js'),
                        '@moriajs/core': path.resolve(process.cwd(), 'node_modules/@moriajs/core/dist/index.js'),
                    },
                },
                optimizeDeps: {
                    exclude: ['@moriajs/renderer', '@moriajs/core'],
                },
                build: {
                    outDir: 'dist/client',
                    emptyOutDir: true,
                    manifest: true,
                    rollupOptions: {
                        input: path.resolve(process.cwd(), clientEntry),
                    },
                },
            });
            console.log(pc.green('  ✓ ') + 'Client build complete');

            console.log();
            console.log(pc.green('  ✓ ') + pc.bold('Build complete'));
        } catch (err) {
            console.error(pc.red('Build failed:'), err);
            process.exit(1);
        }
    });

// ─── start ──────────────────────────────────────────
cli
    .command('start', 'Start the production server')
    .option('--port <port>', 'Port to listen on', { default: 3000 })
    .action(async (options) => {
        console.log(pc.cyan('🏔️  MoriaJS') + pc.dim(` v${VERSION}`));
        console.log(pc.green('Starting production server...'));
        console.log();

        try {
            const { createApp } = await import('@moriajs/core');
            const userConfig = await loadConfig();

            const app = await createApp({
                config: {
                    ...userConfig,
                    mode: 'production',
                    rootDir: process.cwd(),
                    server: {
                        ...(userConfig.server as Record<string, unknown> ?? {}),
                        port: Number(options.port),
                    },
                },
            });

            const address = await app.listen();
            console.log(pc.green('  ✓ ') + pc.bold('Production server running'));
            console.log(pc.dim(`    → ${address}`));
        } catch (err) {
            console.error(pc.red('Failed to start server:'), err);
            process.exit(1);
        }
    });

// ─── generate ───────────────────────────────────────
cli
    .command('generate <type> <name>', 'Generate a route, component, or model')
    .alias('g')
    .action(async (type: string, name: string) => {
        console.log(pc.cyan('🏔️  MoriaJS') + pc.dim(` v${VERSION}`));
        console.log(pc.green(`Generating ${type}: ${name}`));
        console.log();

        // TODO: Phase 7 — Code generation
        console.log(pc.yellow('⚠ Generators not yet implemented. Coming in Phase 7.'));
    });

// ─── version & help ─────────────────────────────────
cli.version(VERSION);
cli.help();
