import { getCachedPublicConfig, getPublicConfig } from "./lib/publicConfig";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const APP_TITLE = import.meta.env.VITE_APP_TITLE || "ContentVault Hub";

export const APP_LOGO =
  import.meta.env.VITE_APP_LOGO ||
  "https://placehold.co/128x128/E1E7EF/1F2937?text=App";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const cfg = getCachedPublicConfig();
  const oauthPortalUrl = cfg?.oauth.portalUrl ?? null;
  const appId = cfg?.oauth.appId ?? null;

  // If OAuth is not configured (e.g., local dev), return a safe fallback.
  // This prevents runtime crashes like "Failed to construct 'URL': Invalid URL".
  if (!oauthPortalUrl || !appId || typeof window === "undefined") {
    return "/";
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
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
