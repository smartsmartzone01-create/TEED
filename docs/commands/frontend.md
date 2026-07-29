# Frontend Commands

Run frontend commands from:

```text
C:\Users\smart\OneDrive\Desktop\TEED\frontend
```

## Confirm tools

```powershell
node --version
pnpm --version
```

Use the project-supported Node version when one is pinned. Do not mix npm,
yarn, and pnpm lockfiles.

## Install dependencies

Reproducible installation:

```powershell
pnpm install --frozen-lockfile
```

When intentionally updating dependencies and the lockfile:

```powershell
pnpm install
```

## Development server

```powershell
pnpm dev
```

Open the address printed by Next.js, normally:

```text
http://localhost:3000
```


Use `localhost` consistently for both applications during desktop development:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:8000
```

Do not mix `localhost`, `127.0.0.1`, and a LAN IP. For intentional LAN
testing, set `TEED_ALLOWED_DEV_ORIGINS`, configure Django CORS and CSRF trusted
origins, and use the same LAN hostname for both servers.

Check both locales:

```text
http://localhost:3000/en
http://localhost:3000/sw
```

## Lint

```powershell
pnpm lint
```

The configured command rejects warnings.

## TypeScript

```powershell
pnpm typecheck
```

The typecheck command generates Next.js route and asset declarations before
running TypeScript, so it also works in a clean clone.

## Production build

```powershell
pnpm build
```

Run the production server after a successful build:

```powershell
pnpm start
```

## Standard frontend verification

```powershell
pnpm lint
pnpm typecheck
pnpm build
```

All three should pass before frontend work is considered complete.

## Add dependencies

Runtime package:

```powershell
pnpm add package-name
```

Development-only package:

```powershell
pnpm add -D package-name
```

Remove a package:

```powershell
pnpm remove package-name
```

Review `package.json` and `pnpm-lock.yaml` after dependency changes.

## Dependency inspection

```powershell
pnpm list
pnpm outdated
```

Do not update every package automatically during unrelated feature work.

## Clean generated build output

If Next.js generated output becomes inconsistent:

```powershell
Remove-Item -Recurse -Force .\.next
pnpm build
```

This removes generated output only. Confirm the command is being run inside
the `frontend` directory.

## Translation files

Current messages:

```text
src/i18n/messages/global/en.json
src/i18n/messages/global/sw.json
src/i18n/messages/identity/en.json
src/i18n/messages/identity/sw.json
src/i18n/messages/marketing/en.json
src/i18n/messages/marketing/sw.json
```

After editing translations:

```powershell
pnpm lint
pnpm typecheck
pnpm build
```

Test English and Swahili manually in the browser.

## Password-reset smoke test

With Django and Next.js running on the canonical `localhost` origins:

1. open `/en/login` and select **Forgot your password?**;
2. submit an eligible email and confirm the generic success message;
3. enter the latest console-email code on `/en/password-reset/verify`;
4. choose a valid new password on `/en/password-reset/new`;
5. confirm the browser returns to login and the new password works;
6. confirm an older session in another tab no longer restores;
7. repeat invalid-code, attempt-limit, expired-grant, mismatch, and backend
   password-validator cases;
8. repeat the successful path under `/sw`.

Do not inspect, copy, or expose the HttpOnly reset-grant cookie. Its presence
and validity are backend responsibilities.

## Inspect scripts

```powershell
pnpm run
```

Only scripts defined in `package.json` are project commands.
