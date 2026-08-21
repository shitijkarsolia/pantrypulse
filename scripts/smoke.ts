import { pathToFileURL } from 'node:url';

export async function runSmokeCheck(appUrl = process.env.APP_URL): Promise<void> {
  if (!appUrl) {
    throw new Error('APP_URL is required for the smoke check.');
  }

  let response: Response;
  try {
    response = await fetch(appUrl);
  } catch (error) {
    throw new Error(`Smoke check request failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!response.ok) {
    throw new Error(`Smoke check failed with ${response.status} ${response.statusText}.`);
  }

  const body = await response.text();
  if (!body.includes('PantryPulse')) {
    throw new Error('Smoke check failed: PantryPulse marker was not found.');
  }
}

async function main() {
  await runSmokeCheck();
  console.log('Smoke check passed.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
