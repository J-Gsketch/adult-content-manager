# OAuth “Permanent” Setup Design (Manus OAuth + Dev Bypass)

Date: 2026-05-12  
Branch: oauth-runtime-config-and-dev-bypass

## Context

The app currently supports a Manus-style OAuth flow:

- Client builds a login URL using build-time env (`VITE_OAUTH_PORTAL_URL`, `VITE_APP_ID`) and redirects the user to the OAuth portal.
- Server handles `/api/oauth/callback` to exchange a code for a token and sets a session cookie.
- When `OAUTH_SERVER_URL` is not configured, the server disables the callback route, so sign-in cannot complete.

In the sandbox and in some deployments, OAuth variables might not be present, and we still want:

- A predictable “production” sign-in that uses Manus OAuth.
- A fully functional test mode that allows exercising authenticated parts of the product without real OAuth.

## Goals

- Make OAuth configuration changeable at deploy-time without rebuilding the frontend bundle.
- Keep the Manus OAuth flow as the primary production authentication.
- Provide a safe, explicit, dev-only auth bypass for “full functional test version” environments.
- Improve operator clarity: make misconfiguration visible and easy to fix.

## Non-Goals

- Implement direct Google OAuth to our server (separate project).
- Make a “secretless” local auth mode for production environments.
- Add new user roles/permissions beyond what exists.

## Proposed Design (Do Both)

### 1) Runtime OAuth Configuration

Add a public endpoint that returns runtime configuration needed by the client.

**Option A (recommended): REST endpoint**

- `GET /api/public-config`

Response:

```json
{
  "oauth": {
    "configured": true,
    "portalUrl": "https://…",
    "appId": "…"
  },
  "devAuthBypass": {
    "enabled": false
  }
}
```

Server derives these fields from:

- `VITE_OAUTH_PORTAL_URL`
- `VITE_APP_ID`
- `DEV_AUTH_BYPASS`
- `NODE_ENV`

Notes:

- This endpoint must not leak secrets.
- The name uses “public” to discourage accidental inclusion of secrets later.

**Client changes**

- Replace build-time `OAUTH_CONFIGURED` and `getLoginUrl()` logic with:
  - A lightweight bootstrapped fetch of `/api/public-config` (cached in-memory).
  - Login URL generation based on returned `portalUrl/appId`.
- If `oauth.configured` is false:
  - Hide/disable “Sign in with Google” and show a clear configuration required state (with minimal guidance).

### 2) Dev-Only Auth Bypass (Full Functional Test)

Introduce an explicit bypass that can mint a session cookie without external OAuth.

**Enablement rules**

Bypass is enabled only when BOTH are true:

- `NODE_ENV !== 'production'`
- `DEV_AUTH_BYPASS === '1'`

**Routes**

- `POST /api/dev/login`
  - Input: `{ "openId": "dev-user", "name": "Dev User", "email": "dev@example.com" }` (or defaults if omitted).
  - Behavior:
    - Upsert user in DB if DB is configured; otherwise operate with session-only identity where possible.
    - Create a signed session cookie using existing JWT/session mechanism.
    - Set the normal `COOKIE_NAME` session cookie and return `{ success: true }`.
- `POST /api/dev/logout`
  - Clears the session cookie.

**Client UX**

If `oauth.configured` is false AND `devAuthBypass.enabled` is true:

- Render an additional “Dev sign-in” button on the sign-in page.
- Dev sign-in calls `POST /api/dev/login` then refreshes `auth.me`.

### 3) Server-side Validation & Messaging

At server startup, log configuration state (no secrets):

- OAuth enabled/disabled
- Database enabled/disabled
- Dev bypass enabled/disabled

Additionally, keep `/api/oauth/callback` behavior:

- If `OAUTH_SERVER_URL` missing: respond `503` with a short JSON error (current behavior).
- If present: execute full callback flow.

## Required Environment Variables

### Production (Manus OAuth)

- `VITE_APP_ID` (public identifier)
- `VITE_OAUTH_PORTAL_URL` (public URL)
- `OAUTH_SERVER_URL` (server-to-server base URL)
- `JWT_SECRET` (secret)
- `DATABASE_URL` (secret)

Optional:

- `OWNER_OPEN_ID`
- Stripe vars if using billing

### Sandbox / Dev Full Functional Test

Minimum:

- `JWT_SECRET`
- `DEV_AUTH_BYPASS=1`

Recommended (for full app functionality beyond auth):

- `DATABASE_URL`

## Security Considerations

- Dev bypass must be impossible to enable accidentally in production (guard by `NODE_ENV` and dedicated flag).
- `/api/public-config` must never contain secrets (only public IDs/URLs and booleans).
- Session cookie signing still uses `JWT_SECRET`; never log cookie values.
- If DB is unavailable, bypass mode must degrade safely (features needing DB will still fail with clear errors).

## Testing & Verification

- Unit/Type checks:
  - Ensure client builds login URL based on `/api/public-config`.
  - Ensure dev bypass is hidden unless explicitly enabled.
- E2E sanity (manual):
  - With OAuth configured: clicking “Sign in with Google” redirects to portal URL.
  - With OAuth not configured and `DEV_AUTH_BYPASS=1`: “Dev sign-in” logs in and unlocks authenticated routes.
  - With OAuth not configured and bypass disabled: no redirect loop; UI explains sign-in is unavailable.

## Rollout Plan

- Phase 1: Add `/api/public-config` and switch client login to runtime config.
- Phase 2: Add dev bypass routes + UI affordance.
- Phase 3: Add `.env.example` and docs updates for deploy hygiene.

