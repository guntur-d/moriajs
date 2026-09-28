/**
 * @moriajs/cli
 *
 * CLI tool for MoriaJS framework development.
 * Commands: dev, build, start, generate
 */

import { cac } from 'cac';
import pc from 'picocolors';
import path from 'node:path';
import fs from 'node:fs';
import { loadConfig } from './config.js';

const pkgJsonPath = new URL('../package.json', import.meta.url);
const pkgJsonStr = fs.readFileSync(pkgJsonPath, 'utf8');
const { version: VERSION } = JSON.parse(pkgJsonStr);

export const cli = cac('moria');

interface ServerCliOptions {
    port?: string | number;
    host?: string;
}

function banner(action: string): void {
    console.log(pc.cyan('🏔️  MoriaJS') + pc.dim(` v${VERSION}`));
    console.log(pc.green(action));
    console.log();
}

/**
 * Single boot flow for dev + start (no duplication).
 */
async function bootServer(mode: 'development' | 'production', options: ServerCliOptions): Promise<void> {
    const { createApp } = await import('@moriajs/core');
    const { config: userConfig, configFile } = await loadConfig();
    if (configFile) {
        console.log(pc.dim(`  → Config: ${configFile}`));
    }

    const app = await createApp({
        config: {
            ...userConfig,
            mode,
            rootDir: process.cwd(),
            server: {
                ...userConfig.server,
                port: options.port !== undefined ? Number(options.port) : userConfig.server?.port,
                ...(options.host ? { host: options.host } : {}),
            },
        },
    });

    const address = await app.listen();
    console.log();
    console.log(pc.green('  ✓ ') + pc.bold(mode === 'development' ? 'Dev server ready' : 'Production server running'));
    console.log(pc.dim(`    → ${address}`));
    if (mode === 'development') {
        console.log(pc.dim('    → HMR enabled via Vite'));
    }
    console.log();
}

// ─── dev ────────────────────────────────────────────
cli
    .command('dev', 'Start the development server with HMR')
    .option('--port <port>', 'Port to listen on', { default: 3000 })
    .option('--host <host>', 'Host to bind to', { default: 'localhost' })
    .option('--force', 'Clear Vite cache before starting')
    .action(async (options: ServerCliOptions & { force?: boolean }) => {
        banner('Starting dev server...');

        if (options.force) {
            const viteCache = path.resolve(process.cwd(), 'node_modules', '.vite');
            if (fs.existsSync(viteCache)) {
                console.log(pc.yellow('  → Clearing Vite cache (.vite)...'));
                fs.rmSync(viteCache, { recursive: true, force: true });
            }
        }

        console.log();

        try {
            await bootServer('development', options);
        } catch (err) {
            console.error(pc.red('Failed to start dev server:'), err);
            process.exit(1);
        }
    });

// ─── build ──────────────────────────────────────────
cli
    .command('build', 'Build for production')
    .action(async () => {
        banner('Building for production...');

        try {
            const { build } = await import('vite');
            const { resolveBuildInput, CLIENT_OUTDIR } = await import('@moriajs/core');
            const { config: userConfig } = await loadConfig();

            // Client build (entry resolution is canonical in @moriajs/core)
            console.log(pc.dim('  → Building client bundle...'));

            const input = resolveBuildInput(process.cwd(), userConfig.vite?.clientEntry);

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
                    outDir: CLIENT_OUTDIR,
                    emptyOutDir: true,
                    manifest: true,
                    rollupOptions: {
                        input,
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
    .action(async (options: ServerCliOptions) => {
        banner('Starting production server...');

        try {
            await bootServer('production', options);
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
        banner(`Generating ${type}: ${name}`);

        console.error(pc.red('Generators are not implemented yet (tracked for a future release).'));
        console.log(pc.dim('  Scaffold new projects with `npx create-moria my-app` instead.'));
        process.exit(1);
    });

// ─── version & help ─────────────────────────────────
cli.version(VERSION);
cli.help();
