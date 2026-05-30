# Arsanawa ERP Web UI

Next.js web console for Arsanawa ERP. The app consumes the Laravel API, manages bearer
token sessions, applies company and branch context headers, and exposes the console,
organization, and module workspaces used by ERP operators.

## What is included

- Authentication screens for login, forgot password, and reset password
- Authenticated app shell with console and module workspace modes
- Company and branch context switching
- Organization screens for company creation and module entitlements
- Identity profile settings and user lookup
- Platform settings for read-only currencies and module configuration
- Partners workspace for customers, suppliers, contacts, and addresses
- Dashboard and app launcher
- Indonesian-first operational UI translations with module/app names kept in English
- Initial Inventory workspace:
  - Catalogue
  - Stock
  - Pricing
  - Promotions
- Shared UI primitives, app shell components, and API client

## Requirements

- Node.js compatible with the version expected by Next.js
- Yarn 4.x, as declared by `packageManager`
- A running Arsanawa ERP API, usually at `http://localhost:8000`

The exact dependency versions are pinned in `package.json` and `yarn.lock`.

## Setup

```bash
yarn install
cp .env.example .env.local
```

Configure the API URL:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Running locally

```bash
yarn dev
```

Open:

```text
http://localhost:3000
```

The API must be running separately:

```bash
cd ../api-arsanawa-erp
php artisan serve
```

## Scripts

```bash
yarn dev      # Start the Next.js development server
yarn build    # Create a production build
yarn start    # Serve the production build
yarn lint     # Run ESLint
yarn test     # Run Vitest
```

## Environment

| Variable | Purpose | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL for the Laravel API | `http://localhost:8000` |

The API client appends `/api/v1/...` paths to this base URL.

## API integration

All API calls go through `src/lib/api-client.ts`. It handles:

- `Authorization: Bearer {token}`
- `X-Company-Id`
- `X-Branch-Id`
- JSON request and response headers
- Automatic token refresh on `401` responses
- Shared progress-bar updates during requests

The expected API response envelope is:

```json
{
  "message": "Human-readable message.",
  "data": {}
}
```

Validation errors are surfaced from the API's `{ message, errors }` response.

## App structure

```text
src/app/
|-- (auth)/          # Guest-only auth routes
|-- (app)/           # Authenticated console and module routes
|-- globals.css
`-- layout.tsx

src/components/
|-- app-shell/       # Shell, launcher, guards, dynamic sidebar trees
|-- brands/          # Arsanawa brand assets
`-- ui/              # Shared primitives

src/features/
|-- auth/
|-- dashboard/
|-- identity/
|-- inventory/
|-- organization/
|-- partners/
|-- platform/
`-- pos/

src/lib/
|-- api-client.ts
|-- modules/registry.ts
|-- progress.ts
`-- types.ts
```

## Routing

| Route | Purpose |
| --- | --- |
| `/login` | Login |
| `/forgot-password` | Password reset request |
| `/reset-password` | Password reset form |
| `/` | Console launcher |
| `/dashboard` | Company-scoped dashboard |
| `/organization/companies` | Company management |
| `/organization/modules` | Module entitlement management |
| `/profile` | Identity profile settings and user lookup |
| `/platform/settings` | Platform currencies and module settings |
| `/partners` | Customers, suppliers, contacts, and addresses |
| `/inventory/catalogue` | Inventory catalogue |
| `/inventory/stock` | Stock operations and queries |
| `/inventory/pricing` | Price lists and variant prices |
| `/inventory/promotions` | Discounts and rewards |
| `/finance` | Finance dashboard and sub-workspaces |
| `/pos` | POS register and operational workspaces |

Module route access is filtered by organization entitlements and permissions returned by
the API.

## Session model

The session provider in `src/features/auth/session-provider.tsx` owns login, logout,
workspace loading, company switching, branch switching, and entitlement refreshes.

Session persistence is implemented in `src/features/auth/session-store.ts`. API requests
read the active token and context from that store unless explicit request options are
provided.

## Adding a module screen

1. Add the module entry or navigation item in `src/lib/modules/registry.ts`.
2. Add a route under `src/app/(app)/{module}`.
3. Add feature code under `src/features/{module}`.
4. Use `useSession()` for token, company, branch, permissions, and workspace state.
5. Use `apiRequest()` for API calls so auth headers, context headers, refresh, and
   progress behavior stay consistent.
6. Cover new UI behavior with Vitest and React Testing Library where practical.

## UI conventions

- Keep application modules before console utilities in launcher-style navigation.
- Use `src/components/ui/icon.tsx` for icon aliases instead of importing icon packages directly in feature code.
- Keep module/app names in English, but put operational labels, buttons, statuses, helper copy, and empty states behind the message dictionaries.
- Treat platform currencies as read-only until the API exposes currency mutation routes.

## Quality checks

Before finishing frontend changes, run:

```bash
yarn test
yarn lint
yarn build
```

For API-linked UI changes, also run the backend test suite from the API repository:

```bash
cd ../api-arsanawa-erp
php artisan test
```
