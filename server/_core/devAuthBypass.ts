import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import type { User } from "../../drizzle/schema";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { isDevAuthBypassEnabled } from "./publicConfig";
import { sdk } from "./sdk";

type DevLoginBody = {
  openId?: string;
  name?: string;
};

function hasSessionSecret(): boolean {
  return ENV.cookieSecret.trim().length > 0;
}

export function getDevAppId(): string {
  const appId = ENV.appId?.trim();
  return appId && appId.length > 0 ? appId : "dev-app";
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
  if (!hasSessionSecret()) return null;
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const cookies = parseCookieHeader(cookieHeader);
  const sessionCookie = cookies[COOKIE_NAME];
  const session = await sdk.verifySession(sessionCookie);
  if (!session) return null;
  return buildSyntheticUser({ openId: session.openId, name: session.name });
}

export function registerDevAuthBypassRoutes(app: Express) {
  if (!isDevBypassOn()) return;

  app.post("/api/dev/login", async (req: Request, res: Response) => {
    if (!hasSessionSecret()) {
      res.status(503).json({ error: "JWT_SECRET is required for dev auth bypass" });
      return;
    }
    const body = (req.body ?? {}) as DevLoginBody;
    const openId =
      typeof body.openId === "string" && body.openId.trim().length > 0
        ? body.openId.trim()
        : "dev-user";
    const name =
      typeof body.name === "string" && body.name.trim().length > 0
        ? body.name.trim()
        : "Dev User";

    const sessionToken = await sdk.signSession(
      { openId, appId: getDevAppId(), name },
      { expiresInMs: ONE_YEAR_MS }
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
