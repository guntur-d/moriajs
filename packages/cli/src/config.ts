/**
 * @moriajs/cli - config loading (fail-loud, single owner).
 */

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import type { MoriaConfig } from '@moriajs/core';

export interface LoadedConfig {
    config: Partial<MoriaConfig>;
    configFile: string | null;
}

/**
 * Load moria.config from cwd. Returns empty config when no file exists.
 * Throws with file path + cause when a found file fails to load —
 * never silently swallows a broken config.
 */
export async function loadConfig(cwd: string = process.cwd()): Promise<LoadedConfig> {
    const configFiles = ['moria.config.ts', 'moria.config.js', 'moria.config.mjs'];

    for (const file of configFiles) {
        const configPath = path.resolve(cwd, file);
        if (fs.existsSync(configPath)) {
            try {
                const mod = await import(pathToFileURL(configPath).href);
                return { config: (mod.default ?? mod) as Partial<MoriaConfig>, configFile: configPath };
            } catch (err) {
                throw new Error(
                    `Failed to load ${configPath}: ${(err as Error).message}`
                );
            }
        }
    }

    return { config: {}, configFile: null };
}
