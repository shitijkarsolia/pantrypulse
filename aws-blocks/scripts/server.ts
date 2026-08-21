import { startDevServer } from '@aws-blocks/blocks/scripts';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.BLOCKS_DEV_PORT ?? 3000);
const frontendPort = Number(process.env.BLOCKS_FRONTEND_PORT ?? 3100);

startDevServer({
  backendPath: join(__dirname, '..', 'index.ts'),
  port,
  frontendCommand: `npx vite --port ${frontendPort} --strictPort`,
  frontendPort,
});
