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

