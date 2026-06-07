# Web Accessibility Review

This project targets WCAG 2.2 AA-equivalent behavior for the public sDB frontend.

## Automated Checks

Run:

```bash
npm run lint
npm run accessibility
npm run lighthouse:a11y
```

`npm run accessibility` builds the site, serves the production bundle with Vite preview, runs axe against the main public routes, and checks basic keyboard behavior:

- `/`
- `/overview/`
- `/api/`
- `/notices/`

`npm run lighthouse:a11y` runs Lighthouse Accessibility for the same routes and fails if any route scores below 90.

## Manual Review Checklist

- The first Tab stop is the skip link and Enter moves focus to the main content.
- Header navigation, drawer navigation, language toggle, and documentation code-copy buttons are keyboard reachable.
- SPA navigation moves focus back to the main content landmark after route changes.
- Form controls have visible labels or MUI labels connected through `labelId`.
- Invalid API-key input is marked invalid and connected to the error text.
- Status messages are not communicated by color alone.
- Icon-only buttons have accessible names.
- Markdown documentation keeps a single page `h1`, then uses section headings in order.
- Code-copy feedback is exposed through an `aria-live` region.
- Color contrast should stay at AA level when changing theme tokens.

## Current Findings And Fixes

| Priority | Area | Finding | Impact | Fix |
| --- | --- | --- | --- | --- |
| High | SPA navigation | Route changes did not move focus to the new page content. | Keyboard and screen-reader users could remain on stale navigation controls after navigation. | Added a skip link, `main` landmark focus target, and route-change focus management. |
| High | Rendering / no-JS HTML | Vite output shipped an empty `#root`, so important page text was not present before JavaScript. | SEO and non-JavaScript accessibility were weak for documentation routes. | Added build-time static prerendered HTML for the home and documentation routes. |
| High | Forms | Several MUI `Select` controls only used `aria-label`. | Labels were less discoverable and not visibly associated with the controls. | Added `InputLabel`, `labelId`, and `label` wiring for select controls. |
| Medium | API-key errors | API-key warning/error text was visually close to the field but not explicitly associated. | Assistive technology users could miss why the input was invalid. | Added stable IDs and `aria-describedby` / `aria-invalid` wiring. |
| Medium | Code copy feedback | Copy success/failure changed button text and icon, but had no live announcement. | Screen-reader users might not hear the result. | Added an `aria-live` status span next to each copy button. |
| Medium | Drawer navigation | Drawer content used a presentational wrapper. | Navigation semantics were weaker than necessary. | Changed the drawer body to a labeled `nav`. |

## Known Limits

- The search form depends on the public sDB API and a valid API key. Automated accessibility tests do not submit authenticated API requests.
- MUI handles modal drawer focus trapping internally; this should be rechecked manually after major MUI upgrades.
- Browser password-manager behavior around API-key fields is browser-extension dependent and should be checked in Chrome/Safari after deployment.
