import { destroy } from '@aws-blocks/blocks/scripts';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { enforceProjectEnvironment } from './project-environment.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

enforceProjectEnvironment();

destroy({
  cdkAppPath: join(__dirname, '..', 'index.cdk.ts'),
  projectRoot: join(__dirname, '..', '..')
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
