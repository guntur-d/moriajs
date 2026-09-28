/**
 * create-moria - CLI option resolution (prompts + flags → ScaffoldOptions).
 * Isolates the convoluted boolean/flag precedence in one testable pure function.
 */

import prompts from 'prompts';

export interface RawCliOptions {
    template?: string;
    typescript?: boolean;
    javascript?: boolean;
    db?: string;
    pongo?: boolean;
}

export interface PromptAnswers {
    projectName?: string;
    template?: string;
    language?: string;
    database?: string;
    usePongo?: boolean;
}

export interface ResolvedScaffold {
    name: string;
    template: 'default' | 'minimal';
    lang: 'ts' | 'js';
    db: string;
    usePongo: boolean;
}

export async function promptForMissing(projectName: string | undefined, options: RawCliOptions): Promise<PromptAnswers> {
    return prompts([
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
            type: (prev: string) => prev === 'pg' && !options?.db ? 'toggle' : null,
            name: 'usePongo',
            message: 'Use Pongo (MongoDB-like API on Postgres)?',
            initial: true,
            active: 'yes',
            inactive: 'no',
        },
    ]);
}

/**
 * Resolve final scaffold settings with explicit precedence:
 * flags win over prompts, prompts win over defaults.
 * Boolean flags use `??` (not `||`) so explicit `false` is preserved.
 */
export function resolveScaffold(
    projectName: string | undefined,
    options: RawCliOptions | undefined,
    answers: PromptAnswers
): ResolvedScaffold {
    const name = projectName ?? answers.projectName ?? '';
    const templateRaw = options?.template ?? answers.template ?? 'default';
    const template: 'default' | 'minimal' = templateRaw === 'minimal' ? 'minimal' : 'default';

    let lang: 'ts' | 'js';
    if (options?.typescript) lang = 'ts';
    else if (options?.javascript) lang = 'js';
    else if (answers.language === 'js') lang = 'js';
    else lang = 'ts';

    const db = options?.db ?? answers.database ?? 'sqlite';
    const usePongo = options?.pongo ?? answers.usePongo ?? false;

    return { name, template, lang, db, usePongo };
}

export function validateTemplate(value: string): 'default' | 'minimal' {
    if (value === 'default' || value === 'minimal') return value;
    throw new Error(`Unknown template "${value}" (expected "default" | "minimal")`);
}

export function validateDb(value: string): string {
    if (value === 'pg' || value === 'sqlite') return value;
    throw new Error(`Unknown database "${value}" (expected "pg" | "sqlite")`);
}
