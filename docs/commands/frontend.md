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

Check both locales:

```text
http://localhost:3000/
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

The current known failure is missing TypeScript declarations for imported SVG
assets. This should be fixed rather than skipped.

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

## Inspect scripts

```powershell
pnpm run
```

Only scripts defined in `package.json` are project commands.
