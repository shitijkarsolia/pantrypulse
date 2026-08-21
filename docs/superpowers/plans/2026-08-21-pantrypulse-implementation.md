# PantryPulse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Build, test, deploy, document, and demonstrate PantryPulse as a polished AWS full-stack application that turns pantry photos into expiry-aware inventory and rescue recipes.

**Architecture:** A React 19 and Vite single-page application uses typed AWS Blocks RPC clients. AWS Blocks provisions Cognito authentication, a per-user DynamoDB DistributedTable, a private S3 FileBucket, Lambda/API infrastructure, CloudFront hosting, structured logging, and metrics. A focused TypeScript service invokes Amazon Nova 2 Lite with the Bedrock Converse API for image extraction and recipe generation, while a deterministic local adapter keeps development and tests independent from cloud inference.

**Tech Stack:** Node.js 26, TypeScript 5, React 19, Vite 6, AWS Blocks 0.3.1, AWS CDK 2, Amazon Cognito, DynamoDB, S3, Lambda, API Gateway, CloudFront, Amazon Bedrock Nova 2 Lite, Zod 4, TanStack Query, React Router, Vitest, Testing Library, Playwright, Remotion.

**Spec:** docs/superpowers/specs/2026-08-21-pantrypulse-design.md

## Global Constraints

- Create every Regional AWS resource in us-east-2 using AWS profile pantrypulse.
- CloudFront is the only global application service. Do not use Lambda@Edge, StackSets, cross-Region replication, multi-Region KMS keys, or cross-Region routing.
- Use AWS Blocks where a matching Building Block exists. Restrict custom CDK to Bedrock IAM, security headers, outputs, and settings unavailable through Blocks.
- Pin @aws-blocks/create-blocks-app to 0.1.20 and @aws-blocks/blocks to 0.3.1.
- Use Node.js 22 or newer and AWS SDK for JavaScript v3 package-root imports.
- Use BedrockRuntimeClient and ConverseCommand. Set maxTokens explicitly, use adaptive retries, validate every model response, and never log images, prompts, tokens, or model output containing user data.
- Use amazon.nova-2-lite-v1:0 only after a live us-east-2 preflight invocation succeeds. If direct on-demand invocation returns the documented inference-profile error, resolve and pin the us-east-2 inference profile ID before deployment.
- Derive the data partition key from AuthCognito user.userSub. Never accept a user ID from the browser.
- Uploaded photos remain private, use short-lived upload handles, and expire after one day.
- Pantry items are never removed by DynamoDB TTL. Consume and discard are recorded outcomes.
- No secrets, AWS credentials, generated local data, or user uploads enter Git.
- Do not use emojis in code, comments, logs, or program output. Use Lucide icons with accessible labels in the interface.
- Support light and dark themes across every route, persist explicit choice, honor the system default, and respect prefers-reduced-motion.
- Use OKLCH design tokens, tinted neutrals instead of pure black or white, 150 to 250 ms state transitions, and no decorative gradients, glassmorphism, nested cards, or layout-property animation.
- Keep the GitHub repository private. Push each reviewed checkpoint to origin/main.
- Finish with a live CloudFront URL, complete Builder Center article, hosted 60-second Remotion video, embedding instructions, and a cleanup choice for the user.

---

### Task 1: Scaffold the Reproducible AWS Blocks React Workspace

**Files:**
- Preserve: AGENTS.md
- Preserve: docs/superpowers/specs/2026-08-21-pantrypulse-design.md
- Create from template: package.json
- Create from template: aws-blocks/index.ts
- Create from template: aws-blocks/index.cdk.ts
- Create from template: aws-blocks/index.handler.ts
- Create from template: aws-blocks/scripts/*
- Create from template: src/App.tsx
- Create from template: src/main.tsx
- Create: PRODUCT.md
- Create: DESIGN.md
- Create: vitest.config.ts
- Create: test/setup.ts
- Create: test/unit/scaffold.test.ts
- Modify: .gitignore
- Modify: package.json

**Interfaces:**
- Consumes: AWS profile pantrypulse and the approved design specification.
- Produces: npm scripts test, test:watch, typecheck, build, dev, sandbox, deploy, destroy; React entry point App; immutable product and visual-design context.

- [ ] **Step 1: Scaffold with the pinned React template**

Run:

~~~bash
npx @aws-blocks/create-blocks-app@0.1.20 . --template react
~~~

Expected: the command creates the Vite, React, and aws-blocks files without changing AGENTS.md or docs/superpowers.

- [ ] **Step 2: Pin runtime dependencies and add test/UI dependencies**

Run:

~~~bash
npm install @aws-blocks/blocks@0.3.1 @aws-sdk/client-bedrock-runtime @tanstack/react-query react-router-dom lucide-react zod @fontsource/manrope @fontsource/newsreader
npm install --save-dev vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event eslint prettier playwright @playwright/test
~~~

Modify package.json scripts to include:

~~~json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "check": "npm run typecheck && npm run test && npm run build",
  "test:browser": "playwright test",
  "smoke": "tsx scripts/smoke.ts"
}
~~~

- [ ] **Step 3: Write the product context**

Create PRODUCT.md with these decisions:

~~~markdown
# PantryPulse

## Users
People managing groceries at home who want to waste less food without maintaining a spreadsheet.

## Product Purpose
Turn pantry inventory into a living harvest cycle: capture ingredients quickly, understand urgency instantly, and rescue food with practical recipes.

## Register
product

## Tone
Warm, capable, concise, encouraging, never scolding.

## Principles
1. Urgency must be visible without relying on color alone.
2. AI suggests; the user confirms.
3. Every empty state teaches one useful next action.
4. The fastest path is always visible.
5. Food safety uncertainty is stated plainly.

## Anti-References
Generic admin dashboards, identical card grids, gamification that shames waste, neon AI interfaces, glassmorphism.
~~~

- [ ] **Step 4: Write the visual context**

Create DESIGN.md with:

~~~markdown
# PantryPulse Visual System

## Scene
A home cook checks a phone beside an open refrigerator in warm evening light, deciding what to rescue before dinner.

## Typography
Manrope for interface and data. Newsreader only for brand headlines and recipe titles.

## Color Strategy
Full palette with restrained application UI: forest, harvest, amber, and spoilage are semantic roles.

## Theme Tokens
Light surfaces use warm parchment-tinted neutrals. Dark surfaces use forest-tinted charcoal. No pure black or white.

## Motion
150 to 250 ms ease-out-quint state transitions. The expiry pulse scales and fades only. Reduced motion replaces pulse with a static halo.

## Layout
Mobile-first app shell. Desktop uses a stable left navigation rail and open canvas. Avoid nested cards.
~~~

- [ ] **Step 5: Add the test environment**

Create vitest.config.ts:

~~~typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/unit/**/*.test.ts', 'test/components/**/*.test.tsx'],
    coverage: { reporter: ['text', 'html'], include: ['shared/**', 'src/**', 'aws-blocks/ai/**'] },
  },
});
~~~

Create test/setup.ts:

~~~typescript
import '@testing-library/jest-dom/vitest';
~~~

Create test/unit/scaffold.test.ts with one passing assertion that imports PRODUCT.md as text and verifies the PantryPulse product name is present. This keeps the first verification deterministic instead of relying on Vitest's no-test behavior.

Add .bb-data, .blocks-sandbox, dist, coverage, playwright-report, test-results, video/out, and all environment files to .gitignore.

- [ ] **Step 6: Verify the scaffold**

Run:

~~~bash
npm run typecheck
npm run build
npm test
~~~

Expected: typecheck, build, and the initial scaffold test pass.

- [ ] **Step 7: Commit and push**

~~~bash
git add package.json package-lock.json aws-blocks src test vitest.config.ts vite.config.ts tsconfig.json index.html cdk.json PRODUCT.md DESIGN.md .gitignore
git commit -m "chore: scaffold PantryPulse workspace"
git push origin main
~~~

### Task 2: Define Shared Contracts and Expiry Semantics

**Files:**
- Create: shared/contracts.ts
- Create: shared/expiry.ts
- Create: shared/ids.ts
- Create: test/unit/contracts.test.ts
- Create: test/unit/expiry.test.ts

**Interfaces:**
- Consumes: Zod 4.
- Produces: PantryItem, PantryItemInput, PantryItemPatch, ScanCandidate, ScanRecord, Recipe, RecipeRequest, Urgency; urgencyFor(expiryDate, now); daysUntil(expiryDate, now); newId(prefix).

- [ ] **Step 1: Write failing expiry tests**

Create test/unit/expiry.test.ts:

~~~typescript
import { describe, expect, it } from 'vitest';
import { daysUntil, urgencyFor } from '../../shared/expiry';

const now = new Date('2026-08-21T12:00:00Z');

describe('urgencyFor', () => {
  it.each([
    ['2026-08-28', 'fresh'],
    ['2026-08-26', 'use-soon'],
    ['2026-08-23', 'urgent'],
    ['2026-08-20', 'expired'],
  ])('maps %s to %s', (date, expected) => {
    expect(urgencyFor(date, now)).toBe(expected);
  });

  it('uses UTC date boundaries', () => {
    expect(daysUntil('2026-08-22', now)).toBe(1);
  });
});
~~~

- [ ] **Step 2: Run the test and verify failure**

Run:

~~~bash
npm test -- test/unit/expiry.test.ts
~~~

Expected: FAIL because shared/expiry does not exist.

- [ ] **Step 3: Implement expiry logic**

Create shared/expiry.ts:

~~~typescript
export type Urgency = 'fresh' | 'use-soon' | 'urgent' | 'expired';

const DAY_MS = 86_400_000;

export function daysUntil(expiryDate: string, now = new Date()): number {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const expiry = Date.parse(expiryDate + 'T00:00:00Z');
  return Math.ceil((expiry - today) / DAY_MS);
}

export function urgencyFor(expiryDate: string, now = new Date()): Urgency {
  const days = daysUntil(expiryDate, now);
  if (days < 0) return 'expired';
  if (days <= 2) return 'urgent';
  if (days <= 5) return 'use-soon';
  return 'fresh';
}
~~~

- [ ] **Step 4: Write failing schema tests**

Create test/unit/contracts.test.ts with valid and invalid PantryItemInput, ScanCandidate, and Recipe fixtures. Assert trimmed names, ISO date validation, quantity greater than zero, confidence between zero and one, at least one recipe step, and enum rejection.

- [ ] **Step 5: Implement the contracts**

Create shared/contracts.ts with Zod schemas and inferred types. The storage PantryItem shape must contain:

~~~typescript
export const pantryItemSchema = z.object({
  userSub: z.string().min(1),
  itemId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  normalizedName: z.string().min(1).max(80),
  category: z.enum(['produce', 'dairy', 'protein', 'grain', 'pantry', 'frozen', 'other']),
  quantity: z.number().positive().max(999),
  unit: z.string().trim().min(1).max(24),
  storage: z.enum(['fridge', 'freezer', 'pantry']),
  addedDate: z.string().date(),
  expiryDate: z.string().date(),
  state: z.enum(['active', 'consumed', 'discarded']),
  source: z.enum(['manual', 'scan', 'demo']),
  version: z.number().int().positive(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});
~~~

Define pantryItemInputSchema by omitting storage-only fields. Define pantryItemPatchSchema with only mutable fields. Define scanCandidateSchema, scanRecordSchema with cleanupAt as epoch seconds, recipeRequestSchema, and recipeSchema.

Create shared/ids.ts:

~~~typescript
export function newId(prefix: string, now = Date.now()): string {
  const random = crypto.getRandomValues(new Uint32Array(2));
  return prefix + '_' + now.toString(36) + '_' + random[0].toString(36) + random[1].toString(36);
}
~~~

Use node:crypto randomBytes in backend-only code because crypto.getRandomValues belongs to browser/shared execution.

- [ ] **Step 6: Run tests and typecheck**

~~~bash
npm test -- test/unit/contracts.test.ts test/unit/expiry.test.ts
npm run typecheck
~~~

Expected: PASS.

- [ ] **Step 7: Commit and push**

~~~bash
git add shared test/unit
git commit -m "feat: define pantry domain contracts"
git push origin main
~~~

### Task 3: Build Cognito Authentication and User-Isolated Pantry Persistence

**Files:**
- Replace: aws-blocks/index.ts
- Create: aws-blocks/storage/schemas.ts
- Create: aws-blocks/storage/pantry.ts
- Replace: test/e2e.test.ts
- Modify: aws-blocks/client.js only through generated tooling, never manually after generation

**Interfaces:**
- Consumes: shared PantryItemInput and PantryItemPatch schemas.
- Produces: authApi; api.ping(); api.createPantryItem(input); api.listPantryItems(includeArchived?); api.updatePantryItem(itemId, expectedVersion, patch); api.setPantryOutcome(itemId, expectedVersion, outcome); api.restorePantryItem(itemId, expectedVersion).

- [ ] **Step 1: Write failing authenticated API tests**

Replace the todo tests with tests that:

1. Assert api.listPantryItems rejects while signed out.
2. Sign up pantry-a@example.com with a strong test password through authApi.setAuthState, fetch the local-only confirmation code, and confirm the user.
3. Create milk and assert version equals one.
4. Update milk with expectedVersion one and assert version equals two.
5. Repeat the stale update with expectedVersion one and assert a conditional conflict.
6. Mark milk consumed and verify listPantryItems(false) excludes it while listPantryItems(true) includes it.
7. Sign out, sign up pantry-b@example.com, and verify user B cannot list or update user A's item.

Use the template cookie-jar and server lifecycle helpers exactly:

~~~typescript
installCookieJar();

const state = await authApi.setAuthState({
  action: 'signUp',
  username: 'pantry-a@example.com',
  password: 'PantryTest123!',
});
assert.strictEqual(state.state, 'confirmingSignUp');
const issued = await api.getLastCode();
assert.ok(issued?.code);
const confirmed = await authApi.setAuthState({
  action: 'confirmSignUp',
  username: 'pantry-a@example.com',
  code: issued.code,
  password: 'PantryTest123!',
});
assert.strictEqual(confirmed.state, 'signedIn');
~~~

- [ ] **Step 2: Run the e2e test and verify failure**

~~~bash
npm run test:e2e
~~~

Expected: FAIL because PantryPulse API methods are missing.

- [ ] **Step 3: Configure AuthCognito and storage blocks**

In aws-blocks/index.ts construct:

~~~typescript
const scope = new Scope('pantrypulse');

const logger = new Logger(scope, 'logger', {
  level: process.env.BLOCKS_STACK_NAME ? 'info' : 'debug',
  retention: 14,
  defaultContext: { application: 'PantryPulse' },
});

const metrics = new Metrics(scope, 'metrics', {
  namespace: 'PantryPulse',
  defaultDimensions: { Environment: process.env.BLOCKS_STACK_NAME ? 'aws' : 'local' },
});

let lastCode: { username: string; code: string; purpose: string } | null = null;

const auth = new AuthCognito(scope, 'auth', {
  crossDomain: process.env.BLOCKS_SANDBOX === 'true',
  signInWith: 'email' as const,
  authFlowType: 'USER_PASSWORD_AUTH' as const,
  passwordPolicy: {
    minLength: 12,
    requireDigits: true,
    requireLowercase: true,
    requireUppercase: true,
    requireSymbols: true,
  },
  mfa: 'off' as const,
  selfSignUp: true,
  sessionTtlSeconds: 3600,
  removalPolicy: process.env.BLOCKS_SANDBOX === 'true' ? 'destroy' : 'retain',
  codeDelivery: async (username, code, purpose) => {
    if (!process.env.BLOCKS_STACK_NAME) lastCode = { username, code, purpose };
  },
});

export const authApi = auth.createApi();
~~~

Expose api.getLastCode() with the pinned template's `@blocksSkipCodegen` annotation. It returns `lastCode` only when `BLOCKS_STACK_NAME` is unset and returns null in every deployed Lambda. This supports local confirmation tests without exposing live Cognito codes. Use the dedicated AuthCognito package types if the umbrella package rejects the mock-only `codeDelivery` option.

The mfa off choice is limited to this public challenge MVP to remove demo friction. Do not describe it as a production security default.

Create one DistributedTable named pantry-data using an entity schema that contains userSub, entityId, entityType, sortDate, TTL, and all nullable pantry, scan, preference, and recipe fields. Use a single table to preserve the approved user-partitioned data model:

~~~typescript
const data = new DistributedTable(scope, 'pantry-data', {
  schema: entitySchema,
  key: { partitionKey: 'userSub', sortKey: 'entityId' },
  indexes: {
    byType: { partitionKey: 'userSub', sortKey: 'entityType' },
    byDate: { partitionKey: 'userSub', sortKey: 'sortDate' },
  },
  ttl: 'cleanupAt',
});
~~~

- [ ] **Step 4: Implement pantry repository functions**

In aws-blocks/storage/pantry.ts export:

~~~typescript
export interface PantryRepository {
  create(userSub: string, input: PantryItemInput): Promise<PantryItem>;
  list(userSub: string, includeArchived: boolean): Promise<PantryItem[]>;
  update(userSub: string, itemId: string, expectedVersion: number, patch: PantryItemPatch): Promise<PantryItem>;
  setOutcome(userSub: string, itemId: string, expectedVersion: number, outcome: 'consumed' | 'discarded'): Promise<PantryItem>;
  restore(userSub: string, itemId: string, expectedVersion: number): Promise<PantryItem>;
}
~~~

Every update must read by { userSub, entityId: 'ITEM#' + itemId }, reject missing items, and call table.put with ifFieldEquals: { version: expectedVersion }. Normalize names with trim, lowercase, and collapsed whitespace.

- [ ] **Step 5: Expose protected API methods**

Every method begins with:

~~~typescript
const user = await auth.requireAuth(context);
~~~

Validate input through Zod before the repository call. Log only operation name, item ID, and request-safe status. Emit PantryItemCreated, PantryItemUpdated, PantryItemConsumed, and PantryItemDiscarded count metrics.

- [ ] **Step 6: Run backend verification**

~~~bash
npm run test:e2e
npm test
npm run typecheck
~~~

Expected: all tests pass, including user isolation and stale-write rejection.

- [ ] **Step 7: Commit and push**

~~~bash
git add aws-blocks test/e2e.test.ts
git commit -m "feat: add isolated pantry persistence"
git push origin main
~~~

### Task 4: Add Private Photo Uploads and Bedrock AI Services

**Files:**
- Create: aws-blocks/ai/service.ts
- Create: aws-blocks/ai/prompts.ts
- Create: aws-blocks/ai/parse.ts
- Create: aws-blocks/storage/scans.ts
- Create: aws-blocks/storage/recipes.ts
- Modify: aws-blocks/index.ts
- Modify: aws-blocks/index.cdk.ts
- Modify: package.json
- Create: test/unit/ai-parse.test.ts
- Create: test/unit/ai-service.test.ts
- Modify: test/e2e.test.ts

**Interfaces:**
- Consumes: ScanCandidate, RecipeRequest, Recipe; FileBucket; Bedrock Converse API.
- Produces: AiService.extractIngredients(input); AiService.generateRecipe(input); api.createScanUpload(contentType); api.analyzeScan(scanId); api.generateRecipe(input); api.saveRecipe(recipe); api.listRecipes().

- [ ] **Step 1: Write failing model-response parser tests**

Test these cases:

- Plain valid JSON.
- JSON wrapped in a markdown code fence.
- Text before a valid JSON object.
- Missing required candidate fields.
- Confidence above one.
- Recipe with no steps.

The parser signature is:

~~~typescript
export function parseModelJson<T>(text: string, schema: z.ZodType<T>): T;
~~~

- [ ] **Step 2: Implement strict JSON extraction**

In aws-blocks/ai/parse.ts, remove an optional code fence, slice from the first opening brace to the last closing brace, JSON.parse, and schema.parse. Throw a safe ModelResponseInvalidError without including the raw response.

- [ ] **Step 3: Write failing Bedrock adapter tests**

Use a fake sender:

~~~typescript
const sender = {
  send: vi.fn().mockResolvedValue({
    output: { message: { content: [{ text: JSON.stringify(fixture) }] } },
  }),
};
~~~

Assert:

- Extract uses image bytes plus an instruction.
- Recipe generation never sends hidden user identifiers.
- Every command sets maxTokens.
- Scan maxTokens equals 1200.
- Recipe maxTokens equals 1600.
- Temperature is 0.2 for scan and 0.6 for recipe.
- Malformed output is rejected.

- [ ] **Step 4: Implement the AI service**

Define:

~~~typescript
export interface AiService {
  extractIngredients(input: {
    bytes: Uint8Array;
    format: 'jpeg' | 'png' | 'webp' | 'gif';
    currentDate: string;
  }): Promise<ScanCandidate[]>;
  generateRecipe(input: RecipeRequest): Promise<Recipe>;
}
~~~

Create BedrockRuntimeClient once outside calls:

~~~typescript
const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-2',
  maxAttempts: 5,
  retryMode: 'adaptive',
});
~~~

Use ConverseCommand with modelId from PANTRY_MODEL_ID, explicit system and user blocks, and explicit inferenceConfig. The extraction prompt instructs Nova to return one JSON object with candidates, conservative shelf-life estimates, no invented brands, and confidence. The recipe prompt requires all selected urgent ingredients, allows pantry staples only when explicitly labeled, and returns one JSON recipe.

Create LocalAiService with deterministic candidates and a deterministic rescue recipe. Select it only when BLOCKS_STACK_NAME is absent.

- [ ] **Step 5: Add FileBucket and scan records**

Construct:

~~~typescript
const uploads = new FileBucket(scope, 'uploads', {
  corsRules: [{
    allowedOrigins: [process.env.PANTRY_ALLOWED_ORIGIN || 'http://localhost:3000'],
    allowedMethods: ['PUT', 'HEAD'],
    allowedHeaders: ['content-type'],
    maxAge: 600,
  }],
  lifecycleRules: [{ prefix: 'uploads/', expirationDays: 1 }],
  removalPolicy: process.env.BLOCKS_SANDBOX === 'true' ? 'destroy' : 'retain',
});
~~~

createScanUpload must:

1. require auth;
2. allow image/jpeg, image/png, image/webp, or image/gif;
3. generate scan ID with node:crypto randomBytes;
4. store SCAN# record with pending state and cleanupAt now plus 86,400 seconds;
5. return uploads.createUploadHandle(path, { contentType, expiresIn: 600 }).

analyzeScan must reconstruct the path from authenticated userSub and scanId, read the object, reject missing or larger-than-6-MB objects, invoke AiService, persist validated candidates, and return them. It must not create pantry items.

- [ ] **Step 6: Add recipes**

generateRecipe validates RecipeRequest, caps ingredient count at 20, calls AiService, emits RecipeGenerated, and returns a validated Recipe. saveRecipe writes RECIPE# plus a generated ID. listRecipes queries by entity type and returns newest first.

- [ ] **Step 7: Grant exact Bedrock permission and configuration**

In aws-blocks/index.cdk.ts:

~~~typescript
const modelId = 'amazon.nova-2-lite-v1:0';
blocksStack.handler.addEnvironment('PANTRY_MODEL_ID', modelId);

const modelArn = cdk.Stack.of(blocksStack).formatArn({
  service: 'bedrock',
  region: cdk.Stack.of(blocksStack).region,
  account: '',
  resource: 'foundation-model',
  resourceName: modelId,
  arnFormat: cdk.ArnFormat.SLASH_RESOURCE_NAME,
});

blocksStack.handler.addToRolePolicy(new iam.PolicyStatement({
  actions: ['bedrock:InvokeModel'],
  resources: [modelArn],
}));
~~~

Do not add bedrock wildcard permissions.

- [ ] **Step 8: Run local AI, upload, and recipe tests**

~~~bash
npm test -- test/unit/ai-parse.test.ts test/unit/ai-service.test.ts
npm run test:e2e
npm run typecheck
~~~

Expected: tests pass without invoking AWS.

- [ ] **Step 9: Run the live Bedrock preflight**

~~~bash
aws bedrock-runtime converse --profile pantrypulse --region us-east-2 --model-id amazon.nova-2-lite-v1:0 --messages '[{"role":"user","content":[{"text":"Return JSON with a single key named status and value ready."}]}]' --inference-config '{"maxTokens":64,"temperature":0}'
~~~

Expected: output contains status ready. If AWS returns an inference-profile requirement, list us-east-2 inference profiles, update PANTRY_MODEL_ID and both allowed ARNs, then repeat until it succeeds.

- [ ] **Step 10: Commit and push**

~~~bash
git add aws-blocks shared test
git commit -m "feat: add smart scan and rescue recipe AI"
git push origin main
~~~

### Task 5: Establish the Responsive App Shell, Authentication, and Theme System

**Files:**
- Replace: src/App.tsx
- Modify: src/main.tsx
- Create: src/app/router.tsx
- Create: src/app/providers.tsx
- Create: src/app/auth-context.tsx
- Create: src/components/AppShell.tsx
- Create: src/components/BrandMark.tsx
- Create: src/components/ThemeToggle.tsx
- Create: src/components/AuthenticatorPanel.tsx
- Create: src/routes/LandingRoute.tsx
- Create: src/routes/AuthRoute.tsx
- Create: src/routes/NotFoundRoute.tsx
- Create: src/styles/tokens.css
- Create: src/styles/global.css
- Create: src/styles/components.css
- Create: test/components/theme-toggle.test.tsx
- Create: test/components/app-shell.test.tsx

**Interfaces:**
- Consumes: authApi, onAuthChange, Authenticator, React Router, TanStack Query.
- Produces: useAuth() returning { user, status }; ThemeToggle; AppShell; routes /, /auth, /demo, /pantry, /scan, /recipes, /settings.

- [ ] **Step 1: Write failing theme and shell tests**

Assert:

- First render uses matchMedia dark preference when no saved theme exists.
- Explicit toggle persists pantry-theme as light or dark.
- Navigation has accessible labels and current-route state.
- Reduced-motion media query removes the animated class.
- Signed-out protected routes redirect to /auth and preserve the intended destination.

- [ ] **Step 2: Define theme tokens**

tokens.css must define light and dark custom properties in OKLCH. Use these fixed semantic roles:

~~~css
:root {
  --surface-canvas: oklch(0.975 0.018 98);
  --surface-raised: oklch(0.945 0.022 98);
  --ink-primary: oklch(0.27 0.038 151);
  --ink-muted: oklch(0.49 0.035 151);
  --brand-forest: oklch(0.43 0.108 155);
  --brand-harvest: oklch(0.72 0.145 58);
  --state-urgent: oklch(0.59 0.205 27);
  --focus-ring: oklch(0.58 0.14 155);
  --radius-control: 0.75rem;
  --radius-panel: 1.25rem;
  --shadow-raised: 0 1rem 3rem oklch(0.32 0.04 151 / 0.12);
}

[data-theme='dark'] {
  --surface-canvas: oklch(0.19 0.022 151);
  --surface-raised: oklch(0.245 0.028 151);
  --ink-primary: oklch(0.92 0.022 98);
  --ink-muted: oklch(0.73 0.027 98);
  --brand-forest: oklch(0.68 0.115 151);
  --brand-harvest: oklch(0.78 0.13 68);
  --state-urgent: oklch(0.69 0.18 28);
  --focus-ring: oklch(0.75 0.13 151);
  --shadow-raised: 0 1rem 3rem oklch(0.08 0.02 151 / 0.32);
}
~~~

- [ ] **Step 3: Implement auth context**

Mount Authenticator(authApi) into a React-owned ref exactly once. Subscribe with onAuthChange. Represent status as checking, signed-out, or signed-in. Never infer backend authorization solely from the client state.

- [ ] **Step 4: Implement the app shell**

Desktop uses a 15rem navigation rail and open content canvas. Mobile uses a top bar and bottom navigation for Pantry, Scan, and Recipes. Use Lucide icons with text labels. The theme control appears in both layouts.

Landing uses Newsreader only for the hero heading and Manrope elsewhere. Authenticated UI uses Manrope for controls, labels, and data.

- [ ] **Step 5: Implement the public landing route**

Include:

- Harvest-cycle explanation.
- Live demo call to action linking to /demo.
- Sign-in call to action.
- Three compact capability sections without an identical card grid.
- A small waste-reduction statement with source-neutral copy.
- No unsupported claims or fabricated statistics.

- [ ] **Step 6: Run component and production checks**

~~~bash
npm test -- test/components/theme-toggle.test.tsx test/components/app-shell.test.tsx
npm run typecheck
npm run build
~~~

Expected: PASS.

- [ ] **Step 7: Commit and push**

~~~bash
git add src test/components
git commit -m "feat: add PantryPulse app shell and themes"
git push origin main
~~~

### Task 6: Build the Expiry Pulse Dashboard and Pantry Workflows

**Files:**
- Create: src/features/pantry/api.ts
- Create: src/features/pantry/hooks.ts
- Create: src/features/pantry/PantryRoute.tsx
- Create: src/features/pantry/DemoPantryRoute.tsx
- Create: src/features/pantry/ExpiryPulse.tsx
- Create: src/features/pantry/PantryRow.tsx
- Create: src/features/pantry/PantryEditor.tsx
- Create: src/features/pantry/PantryFilters.tsx
- Create: src/features/pantry/demo-data.ts
- Create: test/components/expiry-pulse.test.tsx
- Create: test/components/pantry-route.test.tsx

**Interfaces:**
- Consumes: typed api pantry methods, PantryItem, urgencyFor, TanStack Query.
- Produces: usePantry(includeArchived); useCreatePantryItem; useUpdatePantryItem; useSetPantryOutcome; DemoPantryRoute.

- [ ] **Step 1: Write failing dashboard tests**

Assert:

- Items are grouped and ordered expired, urgent, use-soon, fresh.
- Urgency is expressed through text, icon, and color.
- ExpiryPulse has no animation when reduced motion is enabled.
- Empty state presents Add ingredient and Scan pantry actions.
- Editing sends expectedVersion.
- A conflict invalidates the query and displays a refresh message.
- Demo data cannot invoke cloud mutation methods.

- [ ] **Step 2: Implement query adapters**

All API calls live in api.ts. hooks.ts owns query keys:

~~~typescript
export const pantryKeys = {
  all: ['pantry'] as const,
  list: (includeArchived: boolean) => ['pantry', { includeArchived }] as const,
};
~~~

Mutations optimistically update only when safe, roll back on failure, and always invalidate the list on settlement.

- [ ] **Step 3: Implement the expiry pulse**

ExpiryPulse uses transform and opacity only. Use a static halo for reduced motion. The label text must be one of Fresh, Use soon, Urgent, or Expired. Do not rely on pulse frequency to communicate status.

- [ ] **Step 4: Implement pantry editing**

Use an inline expandable editor rather than a modal. Fields: name, category, quantity, unit, storage, added date, expiry date. Show schema errors beside the field. Consume and discard use a confirmation row inside the item.

- [ ] **Step 5: Implement the public demo**

Seed strawberries, spinach, yogurt, chickpeas, rice, and mushrooms with dates relative to the current day. Demo interactions can filter and select rescue ingredients but never persist or call protected APIs.

- [ ] **Step 6: Verify dashboard behavior**

~~~bash
npm test -- test/components/expiry-pulse.test.tsx test/components/pantry-route.test.tsx
npm run typecheck
npm run build
~~~

Expected: PASS in both light and dark theme test wrappers.

- [ ] **Step 7: Commit and push**

~~~bash
git add src/features/pantry test/components
git commit -m "feat: build expiry pulse pantry dashboard"
git push origin main
~~~

### Task 7: Build the Smart Scan Confirmation Flow

**Files:**
- Create: src/features/scan/ScanRoute.tsx
- Create: src/features/scan/image.ts
- Create: src/features/scan/ScanDropzone.tsx
- Create: src/features/scan/ScanProgress.tsx
- Create: src/features/scan/CandidateEditor.tsx
- Create: src/features/scan/hooks.ts
- Create: test/unit/image.test.ts
- Create: test/components/scan-route.test.tsx

**Interfaces:**
- Consumes: api.createScanUpload(contentType), returned FileUploadClient.upload(file), api.analyzeScan(scanId), api.createPantryItem(input).
- Produces: compressImage(file, { maxBytes, maxDimension }); useScanUpload; confirmed candidates inserted only after explicit review.

- [ ] **Step 1: Write failing image and route tests**

Assert:

- Non-image files are rejected before upload.
- Images above 6 MB are compressed to JPEG or WebP under 6 MB and at most 2048 pixels.
- Upload, analysis, edit, confirm are distinct states.
- AI candidates are editable and unchecked by default when confidence is below 0.6.
- Confirm creates only checked candidates.
- Failure preserves the local preview and candidate edits.
- The UI states that shelf-life estimates are approximate.

- [ ] **Step 2: Implement browser image normalization**

Use createImageBitmap and canvas.toBlob. Preserve PNG only when transparency is detected; otherwise prefer image/jpeg at iteratively reduced quality. Revoke object URLs after use.

- [ ] **Step 3: Implement the scan state machine**

Represent states as a discriminated union:

~~~typescript
type ScanState =
  | { name: 'idle' }
  | { name: 'preparing'; previewUrl: string }
  | { name: 'uploading'; previewUrl: string; progress: number }
  | { name: 'analyzing'; previewUrl: string; scanId: string }
  | { name: 'reviewing'; previewUrl: string; scanId: string; candidates: EditableCandidate[] }
  | { name: 'saving'; previewUrl: string; candidates: EditableCandidate[] }
  | { name: 'complete'; count: number }
  | { name: 'error'; message: string; recoverable: boolean };
~~~

- [ ] **Step 4: Implement candidate review**

Use a table-like responsive list, not nested cards. Each row has include, name, quantity, unit, storage, and expiry date. Show confidence as text such as High confidence or Needs review, not a raw percentage alone.

- [ ] **Step 5: Verify scan flow**

~~~bash
npm test -- test/unit/image.test.ts test/components/scan-route.test.tsx
npm run typecheck
npm run build
~~~

Expected: PASS without network access.

- [ ] **Step 6: Commit and push**

~~~bash
git add src/features/scan test
git commit -m "feat: add smart pantry scanning flow"
git push origin main
~~~

### Task 8: Build Rescue Recipe Generation and Saving

**Files:**
- Create: src/features/recipes/RecipesRoute.tsx
- Create: src/features/recipes/RecipeComposer.tsx
- Create: src/features/recipes/RecipeView.tsx
- Create: src/features/recipes/SavedRecipes.tsx
- Create: src/features/recipes/hooks.ts
- Create: test/components/recipe-composer.test.tsx
- Create: test/components/recipe-view.test.tsx

**Interfaces:**
- Consumes: urgent PantryItem records; api.generateRecipe(request); api.saveRecipe(recipe); api.listRecipes().
- Produces: useGenerateRecipe; useSaveRecipe; useSavedRecipes; selected item IDs, servings, maximum minutes, and dietary preferences.

- [ ] **Step 1: Write failing recipe tests**

Assert:

- Active urgent items are preselected.
- At least one item is required.
- Servings are one through twelve.
- Maximum minutes are ten through 180.
- Dietary preferences are sent as text only after trimming and length limits.
- Generate failure preserves all inputs.
- A generated recipe displays used pantry items, explicit pantry staples, substitutions, time, servings, and numbered steps.
- Allergy disclaimer remains visible.
- Saved recipe appears in the saved list.

- [ ] **Step 2: Implement recipe composer**

Use a two-column desktop layout and linear mobile flow. Ingredient selection is the primary content, not a modal. The Generate recipe button shows a clear pending label and cannot double submit.

- [ ] **Step 3: Implement recipe display**

Use Newsreader only for the recipe title. Steps are an ordered list with strong action verbs. Provide Print and Save actions. Print CSS removes navigation and controls.

- [ ] **Step 4: Verify recipes**

~~~bash
npm test -- test/components/recipe-composer.test.tsx test/components/recipe-view.test.tsx
npm run typecheck
npm run build
~~~

Expected: PASS.

- [ ] **Step 5: Commit and push**

~~~bash
git add src/features/recipes test/components
git commit -m "feat: add rescue recipe workflows"
git push origin main
~~~

### Task 9: Harden Accessibility, Error States, and Responsive Behavior

**Files:**
- Create: src/components/ErrorBoundary.tsx
- Create: src/components/ToastRegion.tsx
- Create: src/components/Skeleton.tsx
- Create: src/routes/SettingsRoute.tsx
- Modify: all route and feature components
- Modify: src/styles/global.css
- Create: test/components/accessibility.test.tsx
- Create: test/browser/responsive.spec.ts
- Create: playwright.config.ts

**Interfaces:**
- Consumes: complete app routes.
- Produces: keyboard-complete UI, stable loading/error/empty states, responsive layout at 360, 768, 1024, and 1440 pixels.

- [ ] **Step 1: Write failing interaction and responsive tests**

Test:

- Skip link reaches main content.
- Every form control has a label and error association.
- Focus returns to the trigger after inline editor closes.
- Toast region uses aria-live polite; blocking errors use role alert.
- 360-pixel viewport has no horizontal overflow.
- Dark mode screenshots exist for landing, demo, pantry, scan, and recipes.
- Reduced motion screenshot has no pulse animation class.

- [ ] **Step 2: Implement consistent states**

Use skeletons for loading, instructional empty states, inline retry for recoverable failures, and ErrorBoundary for unexpected render failures. Do not center a spinner in an otherwise empty page.

- [ ] **Step 3: Implement settings**

Settings includes theme preference, reduce-motion explanation, sign out, sign out everywhere, and upload privacy/retention copy. Do not expose AWS resource identifiers.

- [ ] **Step 4: Run browser checks**

~~~bash
npx playwright install chromium
npm run dev
npm run test:browser
~~~

Expected: all viewport and theme checks pass. Stop the development server after tests.

- [ ] **Step 5: Run the complete local quality gate**

~~~bash
npm run check
npm run test:e2e
npm run test:browser
~~~

Expected: PASS.

- [ ] **Step 6: Commit and push**

~~~bash
git add src test playwright.config.ts
git commit -m "feat: harden PantryPulse experience"
git push origin main
~~~

### Task 10: Synthesize, Deploy, and Smoke-Test AWS Production

**Files:**
- Modify: aws-blocks/index.cdk.ts
- Modify: package.json
- Create: scripts/smoke.ts
- Create: scripts/read-outputs.ts
- Create: docs/DEPLOY.md
- Create: docs/architecture.md
- Modify: README.md

**Interfaces:**
- Consumes: pantrypulse profile, us-east-2, production build.
- Produces: CloudFormation stack, CloudFront URL, API URL, exact production CORS origin, deployment outputs, live smoke report.

- [ ] **Step 1: Add infrastructure assertions**

Create a test that imports or synthesizes index.cdk.ts and asserts:

- stack Region resolves to us-east-2;
- no Lambda@Edge resource exists;
- upload bucket blocks public access and has one-day lifecycle;
- Cognito app client has no secret;
- DynamoDB uses on-demand billing and scan TTL;
- Lambda environment has PANTRY_MODEL_ID;
- Lambda role includes only bedrock:InvokeModel for the pinned model;
- log retention is 14 days.

- [ ] **Step 2: Add hosting security headers**

Configure Hosting or its supported CDK extension with:

- Content-Security-Policy allowing self plus the generated API and Cognito endpoints.
- Strict-Transport-Security.
- X-Content-Type-Options nosniff.
- Referrer-Policy strict-origin-when-cross-origin.
- frame-ancestors none.

Do not add a custom domain or us-east-1 ACM certificate.

- [ ] **Step 3: Add smoke script**

Add the package script `"outputs": "tsx scripts/read-outputs.ts"`. scripts/read-outputs.ts reads the deployed AWS Blocks output artifact, requires the named key, normalizes HostingUrl to an origin, and exits nonzero when the output is absent.

scripts/smoke.ts accepts APP_URL and verifies:

1. GET / returns 200 and contains PantryPulse.
2. static assets load.
3. /demo returns SPA content.
4. the generated config points to a us-east-2 API.
5. no response exposes bucket contents or credentials.
6. security headers are present.

Authenticated CRUD, scan, recipe, and cross-user checks remain in the typed AWS Blocks e2e test and are repeated against the sandbox before production.

- [ ] **Step 4: Confirm AWS state immediately before deployment**

~~~bash
aws sts get-caller-identity --profile pantrypulse --region us-east-2
aws freetier get-account-plan-state --profile pantrypulse --region us-east-1
aws cloudformation list-stacks --profile pantrypulse --region us-east-2 --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE ROLLBACK_COMPLETE
~~~

Expected: identity succeeds, plan is active, and no conflicting PantryPulse production stack exists.

- [ ] **Step 5: Deploy the AWS sandbox and run cloud integration checks**

~~~bash
AWS_PROFILE=pantrypulse AWS_REGION=us-east-2 npm run sandbox
npm run test:e2e
AWS_PROFILE=pantrypulse AWS_REGION=us-east-2 npm run sandbox:destroy
~~~

Expected: sandbox deploys in us-east-2, Cognito, CRUD, upload, live Nova scan, recipe, and user isolation pass, then the sandbox is destroyed.

- [ ] **Step 6: Run the first production deploy**

~~~bash
AWS_PROFILE=pantrypulse AWS_REGION=us-east-2 PANTRY_ALLOWED_ORIGIN=http://localhost:3000 npm run deploy
~~~

Capture the CloudFront URL and API URL from outputs. Confirm the stack and every Regional resource are in us-east-2.

- [ ] **Step 7: Lock production upload CORS to CloudFront**

Read the first-deploy Hosting URL through scripts/read-outputs.ts, assign its exact origin to `PANTRY_APP_ORIGIN`, and redeploy:

~~~bash
PANTRY_APP_ORIGIN="$(npm run --silent outputs -- --key HostingUrl)"
AWS_PROFILE=pantrypulse AWS_REGION=us-east-2 PANTRY_ALLOWED_ORIGIN="$PANTRY_APP_ORIGIN" npm run deploy
~~~

Inspect bucket CORS and assert it contains only `PANTRY_APP_ORIGIN` for PUT and HEAD.

- [ ] **Step 8: Run live verification**

~~~bash
APP_URL="$PANTRY_APP_ORIGIN" npm run smoke
APP_URL="$PANTRY_APP_ORIGIN" npm run test:browser -- --project=chromium
~~~

Use the live URL for Playwright. Manually verify sign-up email delivery, scan with one sample grocery photo, recipe generation, dark mode persistence, and mobile navigation. Record request IDs for any failure without logging user content.

- [ ] **Step 9: Write deployment documentation**

docs/DEPLOY.md contains prerequisites, exact profile/Region commands, deployment, outputs, smoke checks, and destroy command. docs/architecture.md explains CloudFront, S3, AWS Blocks API/Lambda, Cognito, DynamoDB, FileBucket, Bedrock, logging, data flow, and Region boundaries.

README.md includes vision, feature list, architecture link, local development, tests, deployment, live URL, privacy, and license. Task 11 adds the real captured screenshots after they exist.

- [ ] **Step 10: Commit and push**

~~~bash
git add aws-blocks scripts docs README.md
git commit -m "deploy: launch PantryPulse on AWS"
git push origin main
~~~

### Task 11: Produce the Builder Center Article and Submission Assets

**Files:**
- Create: docs/submission/builder-center-article.md
- Create: docs/submission/architecture.mmd
- Create: docs/submission/demo-script.md
- Create: docs/submission/submission-checklist.md
- Create: docs/submission/screenshots/light-dashboard.png
- Create: docs/submission/screenshots/dark-dashboard.png
- Create: docs/submission/screenshots/scan-review.png
- Create: docs/submission/screenshots/rescue-recipe.png

**Interfaces:**
- Consumes: verified live URL, final AWS architecture, actual build decisions and obstacles.
- Produces: finished article longer than 500 words, accurate architecture diagram source, screenshot set, 60-second narration and shot timing, final entry checklist.

- [ ] **Step 1: Capture real deployed screenshots**

Use Playwright at 1440 by 900 for the landing page, demo dashboard in both themes, scan review state, and generated rescue recipe. Do not fabricate AWS responses. Redact email addresses and any user identifiers.

Update README.md to embed these exact captured files after they pass visual review.

- [ ] **Step 2: Write the article**

Use the exact title:

~~~text
Full Stack Challenge: PantryPulse
~~~

Article sections:

1. Vision and What It Does.
2. Harvest: The Prompt Behind the Product.
3. Full Stack Breakdown: pitch, prototype, MVP, UX, launch.
4. How I Built It.
5. AWS Services and Architecture.
6. Challenges and How I Solved Them.
7. What I Learned.
8. Try PantryPulse.
9. Video Walkthrough.

The article must name only services actually deployed, link the live app, avoid claiming the private repository is public, exceed 500 words, and describe dark mode. Omit the Video Walkthrough URL in this draft; Task 12 adds the exact hosted URL after verifying the MP4.

- [ ] **Step 3: Create the architecture diagram**

architecture.mmd must show:

~~~mermaid
flowchart LR
  User --> CloudFront
  CloudFront --> SiteS3[Static site in S3]
  User --> BlocksAPI[AWS Blocks API on Lambda]
  BlocksAPI --> Cognito
  BlocksAPI --> DynamoDB
  User --> UploadS3[Private S3 upload handle]
  BlocksAPI --> UploadS3
  BlocksAPI --> Bedrock[Amazon Bedrock Nova 2 Lite]
  BlocksAPI --> CloudWatch
~~~

Annotate us-east-2 around every Regional service and identify CloudFront as global.

- [ ] **Step 4: Write the exact 60-second script**

Use 1,800 frames at 30 fps:

- 0 to 6 seconds: problem and brand.
- 6 to 18 seconds: expiry pulse dashboard.
- 18 to 32 seconds: upload and AI candidate review.
- 32 to 47 seconds: rescue recipe generation.
- 47 to 54 seconds: dark mode transformation.
- 54 to 60 seconds: AWS architecture and live URL.

Narration must fit 135 to 150 spoken words.

- [ ] **Step 5: Run content checks**

Verify:

~~~bash
wc -w docs/submission/builder-center-article.md
rg -n "Full Stack Challenge: PantryPulse|Vision|Full Stack Breakdown|How I Built It|AWS Services|What I Learned|https://" docs/submission/builder-center-article.md
~~~

Expected: more than 500 words and all required sections present.

- [ ] **Step 6: Commit and push**

~~~bash
git add docs/submission
git commit -m "docs: prepare challenge submission"
git push origin main
~~~

### Task 12: Render and Host the 60-Second Remotion Walkthrough

**Files:**
- Create: video/package.json
- Create: video/remotion.config.ts
- Create: video/src/Root.tsx
- Create: video/src/PantryPulseDemo.tsx
- Create: video/src/scenes/BrandScene.tsx
- Create: video/src/scenes/DashboardScene.tsx
- Create: video/src/scenes/ScanScene.tsx
- Create: video/src/scenes/RecipeScene.tsx
- Create: video/src/scenes/ThemeScene.tsx
- Create: video/src/scenes/ArchitectureScene.tsx
- Create: video/public/captures/*
- Create: video/public/narration.wav if narration is generated or recorded
- Create: video/out/pantrypulse-demo.mp4
- Copy: public/demo/pantrypulse-demo.mp4
- Modify: docs/submission/builder-center-article.md
- Modify: docs/submission/submission-checklist.md

**Interfaces:**
- Consumes: real screenshots and captured short clips from the live app, approved demo script, live URL.
- Produces: PantryPulseDemo composition, 1920 by 1080, 30 fps, exactly 1,800 frames, H.264 MP4, hosted CloudFront asset.

- [ ] **Step 1: Initialize the Remotion project**

Use the installed Remotion capability and pin a compatible Remotion release. video/package.json scripts:

~~~json
{
  "scripts": {
    "studio": "remotion studio src/Root.tsx",
    "render": "remotion render src/Root.tsx PantryPulseDemo out/pantrypulse-demo.mp4 --codec h264 --crf 18"
  }
}
~~~

- [ ] **Step 2: Write a failing composition metadata test**

Assert width 1920, height 1080, fps 30, durationInFrames 1800, and every scene range exactly covers the timeline without overlap or gaps.

- [ ] **Step 3: Implement the composition**

Register:

~~~tsx
<Composition
  id="PantryPulseDemo"
  component={PantryPulseDemo}
  durationInFrames={1800}
  fps={30}
  width={1920}
  height={1080}
/>
~~~

Use Sequence for the six approved time ranges. Use spring or interpolate only for opacity and transform. Captions remain inside title-safe bounds and meet contrast requirements. Do not simulate fake cursor actions or fake model output.

- [ ] **Step 4: Add actual deployed captures**

Use Playwright video or screenshot capture against the live CloudFront URL. Show the public demo for dashboard shots and an authenticated test session for the real scan and recipe results. Remove account identifiers before copying assets into video/public/captures.

- [ ] **Step 5: Render and verify**

~~~bash
cd video
npm install
npm test
npm run render
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 out/pantrypulse-demo.mp4
~~~

Expected duration: 60.000 seconds within one frame tolerance. Inspect the first, midpoint, dark-mode, and final frames for clipping and readability.

- [ ] **Step 6: Host the video through the app**

Copy the verified MP4 to public/demo/pantrypulse-demo.mp4, rebuild, and redeploy with the locked CloudFront CORS origin:

~~~bash
npm run build
PANTRY_APP_ORIGIN="$(npm run --silent outputs -- --key HostingUrl)"
AWS_PROFILE=pantrypulse AWS_REGION=us-east-2 PANTRY_ALLOWED_ORIGIN="$PANTRY_APP_ORIGIN" npm run deploy
~~~

Verify HTTPS GET /demo/pantrypulse-demo.mp4 returns 200, content-type video/mp4, and supports byte ranges.

- [ ] **Step 7: Complete the article embed**

Add the final CloudFront MP4 URL to the Video Walkthrough section and include Builder Center editor instructions. If the editor requires a supported third-party player instead of direct MP4, preserve the hosted MP4 and document the single remaining manual upload/embed action without claiming it is complete.

- [ ] **Step 8: Commit and push**

Do not commit the intermediate Remotion cache. Commit source, final optimized MP4, and article updates:

~~~bash
git add video public/demo docs/submission
git commit -m "feat: add PantryPulse video walkthrough"
git push origin main
~~~

### Task 13: Final Verification, Repository Audit, and Handoff

**Files:**
- Modify: docs/submission/submission-checklist.md
- Modify: README.md only if final URLs changed

**Interfaces:**
- Consumes: final deployed app, hosted video, article, private GitHub repository.
- Produces: evidence-backed completion report and clean origin/main.

- [ ] **Step 1: Run every local verification gate**

~~~bash
npm run check
npm run test:e2e
npm run test:browser
cd video && npm test && npm run render
~~~

Expected: all commands exit zero.

- [ ] **Step 2: Run final live checks**

Verify:

- CloudFront landing and demo return 200.
- Cognito sign-up and sign-in work.
- User A cannot access user B data.
- Manual CRUD works.
- Scan upload, Nova extraction, candidate confirmation, recipe generation, and save work.
- Every route passes light and dark visual checks.
- Mobile 360-pixel navigation has no overflow.
- Hosted video returns 200 and is 60 seconds.
- Security headers, private upload bucket, lifecycle, and exact CORS are present.
- All Regional resources are in us-east-2.

- [ ] **Step 3: Audit costs and resource inventory**

List PantryPulse CloudFormation, Lambda, DynamoDB, S3, Cognito, and CloudFront resources. Record the stack name and destroy command in the checklist. Do not destroy them because the deployed app is required for judging.

Ask the user after handoff whether to keep the resources for judging or clean them up to reduce credit usage.

- [ ] **Step 4: Audit GitHub**

~~~bash
git status --short --branch
git push origin main
gh repo view shitijkarsolia/pantrypulse --json visibility,url,defaultBranchRef
~~~

Expected: clean main tracking origin/main, visibility PRIVATE, default branch main.

- [ ] **Step 5: Complete submission checklist**

Mark only evidence-backed items complete:

- Working app URL.
- Article above 500 words.
- Required article sections.
- Accurate AWS architecture.
- Dark mode bonus.
- Embedded or ready-to-embed 60-second video bonus.
- Private source pushed.
- Final entry form fields and links prepared.

Leave Builder Center publication and challenge entry form submission unchecked because they require the user's publishing identity and explicit submission action.

- [ ] **Step 6: Commit and push the final state**

~~~bash
git add README.md docs/submission/submission-checklist.md
git commit -m "chore: finalize PantryPulse launch"
git push origin main
~~~

- [ ] **Step 7: Report completion**

Provide the live app URL, private repository URL, hosted video URL, article path, test evidence, AWS stack name, estimated cost posture, known manual publication steps, and the keep-or-clean-up choice.
