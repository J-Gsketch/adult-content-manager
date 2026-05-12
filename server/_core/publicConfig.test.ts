import { describe, expect, it } from "vitest";
import { getPublicConfig, isDevAuthBypassEnabled } from "./publicConfig";

describe("publicConfig", () => {
  it("marks oauth configured only when portalUrl + appId are present", () => {
    expect(getPublicConfig({} as any).oauth.configured).toBe(false);
    expect(
      getPublicConfig({
        VITE_OAUTH_PORTAL_URL: "https://example.com",
        VITE_APP_ID: "app",
      } as any).oauth.configured
    ).toBe(true);
  });

  it("enables dev bypass only when not production and DEV_AUTH_BYPASS=1", () => {
    expect(
      isDevAuthBypassEnabled({
        NODE_ENV: "production",
        DEV_AUTH_BYPASS: "1",
      } as any)
    ).toBe(false);
    expect(
      isDevAuthBypassEnabled({
        NODE_ENV: "development",
        DEV_AUTH_BYPASS: "0",
      } as any)
    ).toBe(false);
    expect(
      isDevAuthBypassEnabled({
        NODE_ENV: "development",
        DEV_AUTH_BYPASS: "1",
      } as any)
    ).toBe(true);
  });
});

