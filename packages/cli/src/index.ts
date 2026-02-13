/**
 * @moriajs/cli
 *
 * CLI tool for MoriaJS framework development.
 * Commands: dev, build, start, generate
 */

import { cac } from 'cac';
import pc from 'picocolors';

const VERSION = '0.0.1';

export const cli = cac('moria');

// ─── dev ────────────────────────────────────────────
cli
    .command('dev', 'Start the development server with HMR')
    .option('--port <port>', 'Port to listen on', { default: 3000 })
    .option('--host <host>', 'Host to bind to', { default: 'localhost' })
    .action(async (options) => {
        console.log(pc.cyan('🏔️  MoriaJS') + pc.dim(` v${VERSION}`));
        console.log(pc.green('Starting dev server...'));
        console.log(pc.dim(`  → http://${options.host}:${options.port}`));
        console.log();

        // TODO: Phase 3 — Start Fastify + Vite dev server
        console.log(pc.yellow('⚠ Dev server not yet implemented. Coming in Phase 3.'));
    });

// ─── build ──────────────────────────────────────────
cli
    .command('build', 'Build for production')
    .action(async () => {
        console.log(pc.cyan('🏔️  MoriaJS') + pc.dim(` v${VERSION}`));
        console.log(pc.green('Building for production...'));
        console.log();

        // TODO: Phase 3 — Vite production build
        console.log(pc.yellow('⚠ Build not yet implemented. Coming in Phase 3.'));
    });

// ─── start ──────────────────────────────────────────
cli
    .command('start', 'Start the production server')
    .option('--port <port>', 'Port to listen on', { default: 3000 })
    .action(async (options) => {
        console.log(pc.cyan('🏔️  MoriaJS') + pc.dim(` v${VERSION}`));
        console.log(pc.green('Starting production server...'));
        console.log(pc.dim(`  → port ${options.port}`));
        console.log();

        // TODO: Phase 3 — Start Fastify production server
        console.log(pc.yellow('⚠ Production server not yet implemented. Coming in Phase 3.'));
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
