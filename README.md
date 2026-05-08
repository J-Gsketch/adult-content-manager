# Adult Content Manager

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/J-Gsketch/adult-content-manager)

## One-click “Run App” (Recommended)

1. Click the button above
2. Wait for dependencies to install
3. The app opens in a preview tab (port 3000)

## Run Locally

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Then open:
- http://localhost:3000

## Tests

```bash
pnpm test
```

## Notes

- The dev server binds to `PORT` (default `3000`) and auto-finds a free port if it’s taken: [server/_core/index.ts](file:///workspace/adult-content-manager/server/_core/index.ts#L31-L69)
- Some features require environment variables (database, OAuth, Stripe). See: [server/_core/env.ts](file:///workspace/adult-content-manager/server/_core/env.ts#L1-L13)
