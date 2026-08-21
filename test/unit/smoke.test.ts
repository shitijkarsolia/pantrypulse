import { createServer } from 'node:http';
import { once } from 'node:events';
import { expect, test } from 'vitest';
import { runSmokeCheck } from '../../scripts/smoke';

async function withAppResponse(
  status: number,
  body: string,
  assertion: (url: string, methods: string[]) => Promise<void>,
) {
  const methods: string[] = [];
  const server = createServer((request, response) => {
    methods.push(request.method ?? '');
    response.writeHead(status, { 'content-type': 'text/html' });
    response.end(body);
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not provide a port.');

  try {
    await assertion(`http://127.0.0.1:${address.port}`, methods);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('fails closed when APP_URL is absent', async () => {
  await expect(runSmokeCheck('')).rejects.toThrow('APP_URL is required');
});

test('accepts an OK PantryPulse application response', async () => {
  await withAppResponse(200, '<main><h1>PantryPulse</h1></main>', async (url, methods) => {
    await runSmokeCheck(url);

    expect(methods).toEqual(['GET']);
  });
});

test('rejects a non-OK application response', async () => {
  await withAppResponse(503, 'Unavailable', async (url) => {
    await expect(runSmokeCheck(url)).rejects.toThrow('503');
  });
});

test('rejects a response without the PantryPulse marker', async () => {
  await withAppResponse(200, '<main><h1>Other app</h1></main>', async (url) => {
    await expect(runSmokeCheck(url)).rejects.toThrow('PantryPulse marker');
  });
});
