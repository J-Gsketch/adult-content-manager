# OAuth Permanent (Runtime Config + Dev Bypass) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Manus OAuth configurable at runtime (no frontend rebuild) and add a safe dev-only auth bypass for full functional testing without external OAuth.

**Architecture:** Server exposes a public config endpoint consumed by the client at runtime; optional dev-only login routes mint the existing session cookie and (when DB is unavailable) allow a synthetic user derived from the cookie to populate `ctx.user`.

**Tech Stack:** Vite + React 19, tRPC v11, Express, jose (JWT), Vitest.

---

## File Map

**Server**
- Create: `/workspace/server/_core/publicConfig.ts` (compute and serialize public config)
- Create: `/workspace/server/_core/devAuthBypass.ts` (gating + dev login/logout route registration + synthetic user builder)
- Modify: `/workspace/server/_core/index.ts` (register `/api/public-config` and dev auth routes)
- Modify: `/workspace/server/_core/context.ts` (fallback to synthetic user in dev bypass mode)
- Create: `/workspace/server/_core/publicConfig.test.ts` (unit tests for config computation)
- Create: `/workspace/server/_core/devAuthBypass.test.ts` (unit tests for bypass gating logic)

**Client**
- Create: `/workspace/client/src/lib/publicConfig.ts` (fetch + cache runtime config)
- Modify: `/workspace/client/src/const.ts` (derive login URL from runtime config)
- Modify: `/workspace/client/src/components/DashboardLayout.tsx` (sign-in screen uses runtime config + dev sign-in button)
- Modify: `/workspace/client/src/main.tsx` (unauthorized redirect checks runtime config)

**Docs**
- Create: `/workspace/.env.example` (document required env vars)

---

### Task 1: Add Server Public Config Endpoint

**Files:**
- Create: `/workspace/server/_core/publicConfig.ts`
- Modify: `/workspace/server/_core/index.ts`
- Test: `/workspace/server/_core/publicConfig.test.ts`

- [ ] **Step 1: Create public config types + computation**

Create `/workspace/server/_core/publicConfig.ts`:

```ts
export type PublicConfig = {
  oauth: {
    configured: boolean;
    portalUrl: string | null;
    appId: string | null;
  };
  devAuthBypass: {
    enabled: boolean;
  };
};

const toNonEmpty = (v: string | undefined | null) => {
  if (!v) return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function isDevAuthBypassEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.NODE_ENV !== "production" && env.DEV_AUTH_BYPASS === "1";
}

export function getPublicConfig(env: NodeJS.ProcessEnv): PublicConfig {
  const portalUrl = toNonEmpty(env.VITE_OAUTH_PORTAL_URL);
  const appId = toNonEmpty(env.VITE_APP_ID);

  return {
    oauth: {
      configured: Boolean(portalUrl && appId),
      portalUrl,
      appId,
    },
    devAuthBypass: {
      enabled: isDevAuthBypassEnabled(env),
    },
  };
}
```

- [ ] **Step 2: Add Express route `GET /api/public-config`**

Modify `/workspace/server/_core/index.ts` to register:

```ts
import { getPublicConfig } from "./publicConfig";

app.get("/api/public-config", (_req, res) => {
  res.status(200).json(getPublicConfig(process.env));
});
```

Place it after body parsers and before Vite/static wiring.

- [ ] **Step 3: Add unit tests for config computation**

Create `/workspace/server/_core/publicConfig.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getPublicConfig, isDevAuthBypassEnabled } from "./publicConfig";

describe("publicConfig", () => {
  it("marks oauth configured only when portalUrl + appId are present", () => {
    expect(getPublicConfig({} as any).oauth.configured).toBe(false);
    expect(
      getPublicConfig({
        VITE_OAUTH_PORTAL_URL: "https://example.com",
        VITE_APP_ID: "app",
      } as any).oauth.configured,
    ).toBe(true);
  });

  it("enables dev bypass only when not production and DEV_AUTH_BYPASS=1", () => {
    expect(isDevAuthBypassEnabled({ NODE_ENV: "production", DEV_AUTH_BYPASS: "1" } as any)).toBe(false);
    expect(isDevAuthBypassEnabled({ NODE_ENV: "development", DEV_AUTH_BYPASS: "0" } as any)).toBe(false);
    expect(isDevAuthBypassEnabled({ NODE_ENV: "development", DEV_AUTH_BYPASS: "1" } as any)).toBe(true);
  });
});
```

- [ ] **Step 4: Run server tests**

Run: `pnpm test`  
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `pnpm check`  
Expected: PASS (current repo may already have unrelated TS errors; if so, document them as pre-existing and continue with build/test gates).

---

### Task 2: Implement Dev Auth Bypass (Server)

**Files:**
- Create: `/workspace/server/_core/devAuthBypass.ts`
- Modify: `/workspace/server/_core/index.ts`
- Modify: `/workspace/server/_core/context.ts`
- Test: `/workspace/server/_core/devAuthBypass.test.ts`

- [ ] **Step 1: Add dev bypass helper + route registration**

Create `/workspace/server/_core/devAuthBypass.ts`:

```ts
import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";
import { isDevAuthBypassEnabled } from "./publicConfig";
import type { User } from "../../drizzle/schema";

type DevLoginBody = {
  openId?: string;
  name?: string;
  email?: string;
};

export function getDevAppId(): string {
  return ENV.appId && ENV.appId.trim().length > 0 ? ENV.appId : "dev-app";
}

export function isDevBypassOn(): boolean {
  return isDevAuthBypassEnabled(process.env);
}

export function buildSyntheticUser(session: { openId: string; name: string }): User {
  const now = new Date();
  return {
    id: 0,
    openId: session.openId,
    name: session.name,
    email: null,
    loginMethod: "dev",
    role: "user",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStatus: "none",
    subscriptionPlan: null,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

export async function tryGetDevBypassUser(req: Request): Promise<User | null> {
  if (!isDevBypassOn()) return null;
  const cookieHeader = req.headers.cookie;
  const cookies = (cookieHeader ?? "")
    .split(";")
    .map(s => s.trim())
    .filter(Boolean);
  const match = cookies.find(c => c.startsWith(`${COOKIE_NAME}=`));
  const cookieValue = match ? decodeURIComponent(match.slice(`${COOKIE_NAME}=`.length)) : null;
  const session = await sdk.verifySession(cookieValue);
  if (!session) return null;
  return buildSyntheticUser({ openId: session.openId, name: session.name });
}

export function registerDevAuthBypassRoutes(app: Express) {
  if (!isDevBypassOn()) return;

  app.post("/api/dev/login", async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as DevLoginBody;
    const openId = (body.openId && body.openId.trim().length > 0) ? body.openId.trim() : "dev-user";
    const name = (body.name && body.name.trim().length > 0) ? body.name.trim() : "Dev User";

    const sessionToken = await sdk.signSession(
      { openId, appId: getDevAppId(), name },
      { expiresInMs: ONE_YEAR_MS },
    );

    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    res.status(200).json({ success: true } as const);
  });

  app.post("/api/dev/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.status(200).json({ success: true } as const);
  });
}
```

- [ ] **Step 2: Register dev bypass routes in server startup**

Modify `/workspace/server/_core/index.ts`:

```ts
import { registerDevAuthBypassRoutes } from "./devAuthBypass";

registerDevAuthBypassRoutes(app);
```

Place it after body parsers and before Vite/static wiring.

- [ ] **Step 3: Use synthetic user in context when DB or OAuth is unavailable**

Modify `/workspace/server/_core/context.ts`:

```ts
import { tryGetDevBypassUser } from "./devAuthBypass";

try {
  user = await sdk.authenticateRequest(opts.req);
} catch {
  user = await tryGetDevBypassUser(opts.req);
}
```

- [ ] **Step 4: Add unit tests for bypass gating**

Create `/workspace/server/_core/devAuthBypass.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildSyntheticUser, getDevAppId } from "./devAuthBypass";
import { ENV } from "./env";

describe("devAuthBypass", () => {
  it("buildSyntheticUser returns a valid user shape", () => {
    const u = buildSyntheticUser({ openId: "x", name: "y" });
    expect(u.openId).toBe("x");
    expect(u.name).toBe("y");
    expect(u.role).toBe("user");
  });

  it("getDevAppId falls back when appId missing", () => {
    const original = ENV.appId;
    (ENV as any).appId = "";
    expect(getDevAppId()).toBe("dev-app");
    (ENV as any).appId = original;
  });
});
```

- [ ] **Step 5: Run server tests**

Run: `pnpm test`  
Expected: PASS

---

### Task 3: Switch Client Login to Runtime Config

**Files:**
- Create: `/workspace/client/src/lib/publicConfig.ts`
- Modify: `/workspace/client/src/const.ts`
- Modify: `/workspace/client/src/main.tsx`

- [ ] **Step 1: Add client public config fetch + cache**

Create `/workspace/client/src/lib/publicConfig.ts`:

```ts
export type PublicConfig = {
  oauth: {
    configured: boolean;
    portalUrl: string | null;
    appId: string | null;
  };
  devAuthBypass: {
    enabled: boolean;
  };
};

let cached: PublicConfig | null = null;
let inflight: Promise<PublicConfig> | null = null;

export async function getPublicConfig(): Promise<PublicConfig> {
  if (cached) return cached;
  if (!inflight) {
    inflight = fetch("/api/public-config", { credentials: "include" })
      .then(async r => {
        if (!r.ok) throw new Error(`public-config ${r.status}`);
        return (await r.json()) as PublicConfig;
      })
      .then(cfg => {
        cached = cfg;
        return cfg;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function getCachedPublicConfig(): PublicConfig | null {
  return cached;
}

export function primePublicConfig(): void {
  void getPublicConfig().catch(() => {});
}
```

- [ ] **Step 2: Update `getLoginUrl()` to use runtime config**

Modify `/workspace/client/src/const.ts` to remove reliance on build-time `OAUTH_CONFIGURED` and use cached config:

```ts
import { getCachedPublicConfig, getPublicConfig } from "./lib/publicConfig";

export const getLoginUrl = () => {
  const cfg = getCachedPublicConfig();
  const portal = cfg?.oauth.portalUrl ?? null;
  const appId = cfg?.oauth.appId ?? null;

  if (!portal || !appId || typeof window === "undefined") return "/";

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);
  const url = new URL(`${portal}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");
  return url.toString();
};

export async function isOauthConfigured(): Promise<boolean> {
  const cfg = await getPublicConfig();
  return cfg.oauth.configured;
}
```

- [ ] **Step 3: Prime config at app startup**

Modify `/workspace/client/src/main.tsx` to call:

```ts
import { isOauthConfigured } from "./const";
import { primePublicConfig } from "./lib/publicConfig";

primePublicConfig();
```

Replace the `OAUTH_CONFIGURED` usage in redirect logic with:

```ts
if (!(await isOauthConfigured())) return;
```

- [ ] **Step 4: Build**

Run: `pnpm build`  
Expected: PASS

---

### Task 4: Add Dev Sign-In UX (Client)

**Files:**
- Modify: `/workspace/client/src/components/DashboardLayout.tsx`

- [ ] **Step 1: Fetch config on the sign-in screen**

In the `if (!user)` branch, load config and render one of:

- OAuth configured: show existing “Sign in with Google” button
- OAuth not configured + dev bypass enabled: show “Dev sign-in” button
- OAuth not configured + bypass disabled: show disabled state and a short message

Use:

```ts
import { useEffect, useState } from "react";
import type { PublicConfig } from "@/lib/publicConfig";
import { getPublicConfig } from "@/lib/publicConfig";
```

Dev sign-in click:

```ts
await fetch("/api/dev/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  credentials: "include",
  body: JSON.stringify({}),
});
window.location.href = "/";
```

- [ ] **Step 2: Manual sanity in browser**

Run the app with `DEV_AUTH_BYPASS=1` and missing OAuth env vars:

- Expect: “Dev sign-in” button appears and logs in successfully
- Expect: authenticated pages load (may show empty states if DB not configured)

---

### Task 5: Add `.env.example` and Operator Notes

**Files:**
- Create: `/workspace/.env.example`

- [ ] **Step 1: Add `.env.example`**

Create `/workspace/.env.example`:

```dotenv
# Required for all auth modes
JWT_SECRET=change-me

# Manus OAuth (production)
VITE_APP_ID=
VITE_OAUTH_PORTAL_URL=
OAUTH_SERVER_URL=

# Optional dev-only bypass for full functional testing (NEVER enable in production)
DEV_AUTH_BYPASS=0

# Database (recommended for real functionality)
DATABASE_URL=

# Optional
OWNER_OPEN_ID=
STRIPE_SECRET_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

- [ ] **Step 2: Verify build + server start**

Run: `pnpm build`  
Run: `pnpm start`  
Expected: server starts and `/api/public-config` returns JSON

---

## Plan Self-Review

- Spec coverage:
  - Runtime-config without rebuild: Task 1 + Task 3
  - Dev-only bypass: Task 2 + Task 4
  - Deploy hygiene: Task 5
- Placeholder scan: No TBD/TODO steps; each step includes concrete edits and code.
- Type consistency: `PublicConfig` shape matches server + client usage.

