# PantryPulse Design Specification

## Product Summary

PantryPulse is a responsive full-stack web application that helps households use food before it expires. Its challenge word is **Harvest**: ingredients move through a living harvest cycle from fresh to urgent, making food rescue feel satisfying rather than administrative.

The primary tagline is: **Your kitchen knows what's for dinner before you do.**

## Goals

- Give each user an isolated pantry they can maintain.
- Convert receipt or fridge photos into editable ingredient suggestions.
- Make expiry urgency immediately understandable through an animated dashboard.
- Generate practical rescue recipes from ingredients that need attention.
- Provide a polished mobile-friendly demo with light and dark themes.
- Deploy a verifiable full-stack application to us-east-2.
- Produce documentation suitable for the Full Stack Challenge submission.

## Non-Goals

- Native mobile apps, grocery delivery, price comparison, or barcode catalogs.
- Household sharing, social feeds, or organization administration.
- Nutrition or medical advice.
- Pantry mutation from AI output without user confirmation.

## User Experience

### Public Experience

The landing page communicates the food-waste problem and PantryPulse's harvest-cycle metaphor. A seeded interactive preview demonstrates the expiry pulse without requiring registration. Preview data is local and cannot mutate cloud data.

### Authentication

Users can register, verify email, sign in, sign out, and recover passwords through Amazon Cognito. Protected API requests carry a Cognito JWT. Backend handlers derive ownership from verified claims and never accept an arbitrary user identifier from the browser.

### Pantry Dashboard

The dashboard groups ingredients into four states:

- Fresh: more than five days remain.
- Use soon: three to five days remain.
- Urgent: zero to two days remain.
- Expired: the expiry date has passed.

Cards show name, category, quantity, storage location, added date, expiry date, and remaining time. Color, glow, and restrained pulse animation communicate urgency while text and icons preserve accessibility. Users can add, edit, consume, discard, restore, search, and filter items. Motion respects the reduced-motion system preference.

### Smart Scan

The browser validates and compresses a receipt or fridge image, requests a short-lived presigned upload URL, and uploads directly to a private S3 bucket. The scan endpoint reads the object and invokes Amazon Nova 2 Lite through Amazon Bedrock with a constrained structured-output prompt.

The model returns candidate names, quantities, categories, storage recommendations, confidence values, and estimated shelf lives. The backend validates and normalizes the response. The user reviews and edits every suggestion before accepting items into the pantry.

### Rescue Recipes

The recipe screen preselects urgent ingredients and lets the user adjust ingredients, servings, cooking time, and dietary preferences. A backend endpoint invokes Bedrock and returns a validated recipe with a title, summary, ingredients, steps, estimated time, servings, pantry items used, and substitutions.

Users can save recipes. Failures preserve the selected ingredients and offer retry. The interface never represents generated recipes as allergy-safe or medical guidance.

### Theme and Presentation

The visual language is warm organic minimalism: forest green #2D6A4F, harvest orange #F4A261, spoilage red #E63946, and parchment #FEFAE0. Dark mode uses purpose-built dark surfaces, persists the user's choice, and respects the operating-system preference on first visit.

The interface is responsive from phones through desktop screens. Keyboard navigation, visible focus, semantic landmarks, descriptive labels, and sufficient contrast are required.

## Architecture

### Frontend

- React, TypeScript, and Vite.
- Routes for landing, authentication, dashboard, scanner, recipes, and settings.
- A typed API client and feature-isolated state layer.
- Components organized by feature rather than one large application file.
- Static assets hosted in private S3 behind CloudFront.

### Backend

- API Gateway exposes versioned JSON endpoints.
- TypeScript Lambda handlers implement pantry, upload, scan, and recipe operations.
- Cognito authorizes protected routes.
- DynamoDB stores pantry items, scan records, preferences, and saved recipes.
- Private S3 stores uploads with encryption, blocked public access, lifecycle deletion, and short-lived presigned operations.
- Bedrock with Nova 2 Lite performs image extraction and recipe generation.
- CloudWatch captures structured logs and operational metrics.

Infrastructure is defined with AWS Blocks where supported. A narrowly scoped CDK construct may be used only when a required capability has no suitable block.

All Regional resources are created in us-east-2. CloudFront is global but does not use Lambda@Edge. There are no cross-Region data flows, StackSets, replication, or multi-Region keys.

## Data Model

DynamoDB uses user-scoped partition keys and entity-prefixed sort keys.

### Pantry Item

- Partition key: USER#<cognito-sub>
- Sort key: ITEM#<item-id>
- Fields: name, normalized name, category, quantity, unit, storage, added date, expiry date, status, source, timestamps, and optimistic version.

### Scan

- Partition key: USER#<cognito-sub>
- Sort key: SCAN#<scan-id>
- Fields: object key, state, normalized candidates, failure summary, timestamp, and cleanup TTL.

### Recipe

- Partition key: USER#<cognito-sub>
- Sort key: RECIPE#<recipe-id>
- Fields: validated recipe, input item references, preferences, and timestamps.

TTL applies only to transient scans. Expired pantry items remain available for review and waste tracking.

## API Surface

- GET /v1/pantry lists the authenticated user's items.
- POST /v1/pantry creates an item.
- PATCH /v1/pantry/{itemId} updates an item with optimistic concurrency.
- DELETE /v1/pantry/{itemId} records consume or discard outcome.
- POST /v1/uploads creates a constrained presigned upload.
- POST /v1/scans analyzes an upload and returns editable candidates.
- POST /v1/recipes/generate generates a validated recipe.
- GET /v1/recipes lists saved recipes.
- POST /v1/recipes saves a recipe.

All bodies are schema-validated. Errors use a stable JSON envelope with request ID, safe message, and machine-readable code.

## Security and Privacy

- Cognito JWT verification protects user data routes.
- Backend ownership comes from the JWT subject.
- IAM roles grant only required DynamoDB, S3, Bedrock, and logging actions.
- S3 blocks public access, encrypts objects, restricts type and size, and deletes uploads after a short retention period.
- CORS allows only the deployed frontend plus explicit local development origins.
- Logs exclude tokens, images, raw prompts containing user data, and sensitive request bodies.
- Model output is untrusted and schema-validated.
- Resources receive project and application tags where supported.

## Failure Handling

- Network failures preserve unsaved form data and expose retry actions.
- Model timeouts or malformed output cannot partially mutate the pantry.
- Photo candidates require confirmation.
- Conditional writes detect stale edits.
- Empty states teach the next useful action.
- The frontend has an error boundary and route-level loading states.

## Testing and Verification

- Unit tests cover expiry calculation, validation, normalization, and model-response parsing.
- Component tests cover urgency rendering, themes, scan confirmation, and recipe states.
- Handler tests mock AWS clients and assert user isolation and stable errors.
- Infrastructure checks assert Region, access blocking, encryption, authorization, and lifecycle behavior.
- Local gates run formatting, linting, type checking, tests, and production builds.
- Live smoke tests verify delivery, auth configuration, pantry CRUD, photo upload, model-backed scan, recipe generation, and cross-user isolation.

## Deployment and Handoff

Deployment uses the pantrypulse CLI profile. Outputs include the CloudFront URL, API endpoint, Cognito identifiers, and resource names needed by frontend configuration. Credentials are never committed.

The final handoff includes:

- Live application URL.
- Source, architecture, deployment, and cleanup documentation.
- A Builder Center article draft of at least 500 words.
- A 60-second demo script and shot list.

The free-plan deployment uses on-demand serverless resources and avoids idle compute. After deployment, the user chooses whether to retain resources for judging or clean them up.

## Acceptance Criteria

PantryPulse is complete when an authenticated user can manage an isolated pantry, upload and confirm image-derived items, generate and save a rescue recipe, switch themes, and use the app on mobile and desktop through CloudFront. Automated checks and live smoke tests pass, and deployment plus submission documentation is present.
