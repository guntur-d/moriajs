#!/usr/bin/env node

/**
 * MoriaJS CLI entry point.
 * Usage: moria <command> [options]
 */

import { cli } from './index.js';

cli.parse();
