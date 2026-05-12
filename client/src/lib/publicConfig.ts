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

