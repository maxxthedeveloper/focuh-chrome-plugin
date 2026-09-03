# Focuh Chrome extension

Local-first Chrome extension (Manifest V3) that blocks distracting websites
during a self-imposed focus challenge. Optional work-hours schedule and daily
time limit. No account, no server, no analytics — everything lives in
`chrome.storage.local`.

Store listing: [Focuh: ADHD Website Blocker for Chrome](https://focuh.com/chrome-extension) ·
Privacy policy: [`PRIVACY_POLICY.md`](PRIVACY_POLICY.md) / https://focuh.com/chrome-extension/privacy

## Stack

React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · Vitest · `@base-ui/react` ·
`@untitledui/icons`

## Develop

```bash
npm ci
npm test          # vitest (src/lib/**/*.test.ts)
npm run build     # tsc --noEmit + vite build → dist/
```

Load the unpacked extension from `dist/` at `chrome://extensions` (Developer
mode → "Load unpacked"). Rebuild and click the reload icon after changes; the
options page is `options.html`, the interstitial is `blocked.html`, and the
service worker is `assets/background.js`.

## Layout

- `public/manifest.json` — MV3 manifest; version must match `package.json`
- `public/icons/` — toolbar/store icons (16/32/48/128)
- `src/background.ts` — service worker: navigation guard, usage alarm, idle handling
- `src/lib/` — pure, unit-tested logic: `decision` (allow/block), `schedule`
  (work hours), `tracking` (daily-limit timer), `storage`, `domain`, `dates`,
  `activity`
- `src/pages/` — `OptionsPage` and `BlockedPage`; `src/components/` — UI pieces
- `store-assets/` — Chrome Web Store screenshots and promo images
- `STORE_LISTING.md` — listing copy, permission justifications, review test steps

## Release

1. Bump `version` in `package.json` and `public/manifest.json` (keep them equal).
2. `npm ci && npm test && npm run build`
3. `cd dist && zip -r ../focuh-chrome-<version>.zip .` and upload the zip in the
   Chrome Web Store developer dashboard. Zips and `dist/` are git-ignored.
4. If permissions or data handling changed, update `STORE_LISTING.md` and
   `PRIVACY_POLICY.md` (and the hosted privacy page) before submitting.
