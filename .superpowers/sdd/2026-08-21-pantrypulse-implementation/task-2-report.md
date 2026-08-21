# Task 2 Report: Shared Contracts and Expiry Semantics

## Implementation

- Added `shared/expiry.ts` with UTC calendar-day calculations and the shared `fresh`, `use-soon`, `urgent`, and `expired` urgency thresholds.
- Added `shared/contracts.ts` with Zod 4 schemas and inferred types for pantry items, pantry inputs and patches, scan candidates and records, recipe requests, and recipes.
- Added `shared/ids.ts` with the required browser-safe `crypto.getRandomValues` ID generator.

## Files Changed

- `shared/contracts.ts`
- `shared/expiry.ts`
- `shared/ids.ts`
- `test/unit/contracts.test.ts`
- `test/unit/expiry.test.ts`
- `test/unit/ids.test.ts`
- `test/unit/pantry-patch.test.ts`

## TDD Evidence

### Expiry behavior

1. RED: `npm test -- test/unit/expiry.test.ts` failed because `../../shared/expiry` did not exist.
2. GREEN: added the UTC day calculation and urgency classifier.
3. GREEN verification: `npm test -- test/unit/expiry.test.ts` passed with 5 tests.

### Contract behavior

1. RED: `npm test -- test/unit/contracts.test.ts` failed because `../../shared/contracts` did not exist.
2. GREEN: added the Zod schemas and inferred domain types.
3. GREEN verification: `npm test -- test/unit/contracts.test.ts` passed with 8 tests.

### ID behavior

1. RED: `npm test -- test/unit/ids.test.ts` failed because `../../shared/ids` did not exist.
2. GREEN: added the browser-safe ID generator.
3. GREEN verification: `npm test -- test/unit/ids.test.ts` passed with 1 test.

### Lifecycle patch behavior

1. RED: `npm test -- test/unit/pantry-patch.test.ts` failed because the schema stripped the mutable `state` field.
2. GREEN: added `state` to the allowed pantry patch fields.
3. GREEN verification: `npm test -- test/unit/pantry-patch.test.ts` passed with 1 test.

## Verification

- `npm test -- test/unit/contracts.test.ts test/unit/expiry.test.ts test/unit/ids.test.ts test/unit/pantry-patch.test.ts` passed: 4 files, 15 tests.
- `npm run typecheck` passed.
- `npm test` passed: 6 files, 20 tests.
- `git diff --check` passed with no whitespace errors.

## Mutation Checks

- Replacing an urgency threshold or changing its comparison direction is caught by the fresh, five-day, two-day, and expired literal expiry fixtures.
- Replacing UTC midnight handling is caught by the explicit UTC boundary assertion.
- Removing string trimming, date validation, positive quantity enforcement, storage enum validation, confidence bounds, or the non-empty recipe-step requirement is caught by the corresponding contract tests.
- Removing mutable lifecycle-state support from a patch is caught by the focused consumed-state fixture.
- Removing the deterministic prefix or timestamp portion of generated IDs is caught by the fixed-prefix and base-36 timestamp pattern assertion.

## Self-Review

- Shared modules have no React, browser DOM, AWS runtime, or mutable-time dependency except the explicit optional `now` defaults required by the public helpers.
- Validation is performed at the shared boundary with Zod 4; input and patch types are inferred directly from their schemas.
- `cleanupAt` is represented as an integer epoch-second field.
- No code, comments, logs, or program output added by this task contain emojis.

## Concerns

None. The task brief leaves non-pantry schema field names and limits to the shared boundary design; the implemented shapes match the stated downstream scan and recipe flows and are protected by focused tests.
