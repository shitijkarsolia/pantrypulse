import assert from 'node:assert';
import { spawn, type ChildProcess } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { setTimeout } from 'node:timers/promises';
import { installCookieJar, isServerRunning } from '@aws-blocks/blocks/utils';
import type { api as ApiType, authApi as AuthApiType } from 'aws-blocks';

installCookieJar();

const SERVER_PORT = 3200;
const FRONTEND_PORT = 3201;
const TEST_PASSWORD = 'PantryTest123!';

let server: ChildProcess | null = null;
let api: typeof ApiType;
let authApi: typeof AuthApiType;
let milkItemId = '';
let milkVersion = 0;

function resetLocalTestData(): void {
  for (const fullId of ['pantrypulse-auth', 'pantrypulse-auth-sessions', 'pantrypulse-pantry-data']) {
    rmSync(join(process.cwd(), '.bb-data', fullId), { recursive: true, force: true });
  }
}

async function createConfirmedTestUser(username: string): Promise<void> {
  const state = await authApi.setAuthState({
    action: 'signUp',
    username,
    password: TEST_PASSWORD,
  });
  assert.strictEqual(state.state, 'confirmingSignUp');

  const issued = await api.getLastCode();
  assert.ok(issued?.code);
  assert.strictEqual(issued.username, username);

  const confirmed = await authApi.setAuthState({
    action: 'confirmSignUp',
    username,
    code: issued.code,
    password: TEST_PASSWORD,
  });
  assert.strictEqual(confirmed.state, 'confirmingSignUp');
  assert.ok(confirmed.actions.some((action) => action.name === 'autoSignIn'));

  const signedIn = await authApi.setAuthState({
    action: 'autoSignIn',
    username,
  });
  assert.strictEqual(signedIn.state, 'signedIn');
}

test.before(async () => {
  if (!await isServerRunning(SERVER_PORT)) {
    resetLocalTestData();
    server = spawn('npm', ['run', 'dev:server'], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
      env: {
        ...process.env,
        BLOCKS_DEV_PORT: String(SERVER_PORT),
        BLOCKS_FRONTEND_PORT: String(FRONTEND_PORT),
        NODE_OPTIONS: '',
      },
    });
    server.stdout?.resume();
    server.stderr?.resume();
    server.unref();
    await setTimeout(2000);
  }

  process.env.BLOCKS_API_URL = `http://localhost:${SERVER_PORT}/aws-blocks/api`;
  const mod = await import('aws-blocks');
  api = mod.api;
  authApi = mod.authApi;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      await authApi.getAuthState();
      return;
    } catch {
      await setTimeout(1000);
    }
  }
  throw new Error('Dev server did not become ready within 30 seconds');
});

test.after(() => {
  if (server?.pid) {
    try {
      process.kill(-server.pid, 'SIGTERM');
    } catch {
      // The server already stopped.
    }
  }
});

test('health endpoint reports that the PantryPulse API is ready', async () => {
  assert.deepStrictEqual(await api.ping(), { status: 'ok' });
});

test('pantry rejects list access while signed out', async () => {
  assert.strictEqual((await authApi.getAuthState()).state, 'signedOut');
  await assert.rejects(
    () => api.listPantryItems(),
    (error: any) => /Authentication|Session|NotAuthenticated|401/i.test(error.message),
  );
});

test('user A signs up through local confirmation and creates milk at version one', async () => {
  await createConfirmedTestUser('pantry-a@example.com');

  const milk = await api.createPantryItem({
    name: '  Whole   Milk  ',
    category: 'dairy',
    quantity: 1,
    unit: 'carton',
    storage: 'fridge',
    addedDate: '2026-08-21',
    expiryDate: '2026-08-28',
  });

  assert.strictEqual(milk.version, 1);
  assert.strictEqual(milk.normalizedName, 'whole milk');
  assert.strictEqual(milk.state, 'active');
  const authState = await authApi.getAuthState();
  assert.strictEqual(authState.state, 'signedIn');
  const signedInUser = (authState as unknown as { user: { userSub: string } }).user;
  assert.strictEqual(milk.userSub, signedInUser.userSub);
  assert.notStrictEqual(milk.userSub, 'pantry-a@example.com');
  assert.ok(milk.itemId);
  milkItemId = milk.itemId;
  milkVersion = milk.version;
});

test('user A updates milk with the expected version', async () => {
  const updated = await api.updatePantryItem(milkItemId, milkVersion, { quantity: 2 });

  assert.strictEqual(updated.quantity, 2);
  assert.strictEqual(updated.version, 2);
  milkVersion = updated.version;
});

test('a stale pantry update is rejected as a conditional conflict', async () => {
  await assert.rejects(
    () => api.updatePantryItem(milkItemId, 1, { quantity: 3 }),
    (error: any) => /ConditionalCheckFailed|conditional request failed/i.test(`${error.name} ${error.message}`),
  );
});

test('outcomes archive reversibly without deleting pantry history', async () => {
  const consumed = await api.setPantryOutcome(milkItemId, milkVersion, 'consumed');
  assert.strictEqual(consumed.state, 'consumed');
  assert.strictEqual(consumed.version, 3);
  milkVersion = consumed.version;

  const active = await api.listPantryItems(false);
  assert.ok(!active.some((item) => item.itemId === milkItemId));

  const archived = await api.listPantryItems(true);
  assert.strictEqual(archived.find((item) => item.itemId === milkItemId)?.state, 'consumed');

  const restored = await api.restorePantryItem(milkItemId, milkVersion);
  assert.strictEqual(restored.state, 'active');
  assert.strictEqual(restored.version, 4);
  assert.ok((await api.listPantryItems(false)).some((item) => item.itemId === milkItemId));

  const consumedAgain = await api.setPantryOutcome(milkItemId, restored.version, 'consumed');
  milkVersion = consumedAgain.version;
});

test('user B cannot list or update user A pantry data', async () => {
  await authApi.setAuthState({ action: 'signOut' });
  await createConfirmedTestUser('pantry-b@example.com');

  assert.deepStrictEqual(await api.listPantryItems(true), []);
  await assert.rejects(
    () => api.updatePantryItem(milkItemId, milkVersion, { quantity: 4 }),
    (error: any) => /not found/i.test(error.message),
  );
  assert.deepStrictEqual(await api.listPantryItems(true), []);
});
