# Agent Instructions

## ui-sdk

Before using `ui-sdk`, follow the `ui-sdk` skill if it's installed, and read `node_modules/@ui-sdk/svelte/docs/llms.txt`. To build a new component, also search `node_modules/@ui-sdk/svelte/docs/core.md` by heading, and read `rendering.md` next to it.

## Toolchain

This project uses Vite+ (`vp`) with `pnpm`:

- `pnpm dev` / `pnpm exec vp dev` — start the dev server
- `pnpm build` / `pnpm exec vp build` — build for production
- `pnpm test:unit` / `pnpm exec vp test` — run unit tests
- `pnpm lint` / `pnpm exec vp check` — format, lint, and type-check
- `pnpm check` — run `svelte-kit sync && svelte-check`
