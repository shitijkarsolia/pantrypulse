import { destroySandbox } from '@aws-blocks/blocks/scripts';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { enforceProjectEnvironment } from './project-environment.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

enforceProjectEnvironment();

destroySandbox(join(__dirname, '..', "index.cdk.ts"));
