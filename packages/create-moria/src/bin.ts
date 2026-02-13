#!/usr/bin/env node

/**
 * create-moria CLI entry point.
 * Usage: npx create-moria [project-name]
 */

import { cli } from './index.js';

cli.parse();
