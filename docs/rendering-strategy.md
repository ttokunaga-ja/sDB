# Rendering Strategy

sDB is a Vite + React application deployed to Cloudflare Pages. It is not a Next.js or React Server Components application, and it does not use `use client`.

The relevant boundary is:

- Static prerendered HTML generated at build time for first paint, SEO, and non-JavaScript fallback.
- Client-side React for interactive search, navigation state, drawer state, language preference, code-copy buttons, and API calls.

## Route Classification

| Route | Current rendering | Reason |
| --- | --- | --- |
| `/` | Static prerender shell + CSR hydration | The page needs client-side API-key input, autocomplete, cascading selects, and API calls. The static shell exposes the search form labels and page purpose before JavaScript. |
| `/overview/` | Static prerendered article + CSR hydration | Documentation content is Markdown-driven and SEO-relevant. It should be present in initial HTML. Code-copy buttons remain client-side. |
| `/api/` | Static prerendered article + CSR hydration | API documentation is SEO- and developer-facing. Markdown content is present in initial HTML; code-copy buttons remain client-side. |
| `/notices/` | Static prerendered article + CSR hydration | Source, processing, and disclaimer content should be available without waiting for React. |
| `/sources/` | Static prerendered alias of notices + CSR hydration | Backward-compatible notices route. |

## Client-Side Responsibilities

Keep these in React client code:

- Browser history and SPA route transitions.
- Language preference in `localStorage`.
- Drawer open/close state and focus behavior.
- API-key input, validation, and masking.
- Search autocomplete and cascading institution/faculty/department selection.
- Optional selection-event telemetry.
- Code-copy buttons and clipboard fallback.

## Static / Server-Suitable Responsibilities

Keep these static or prerendered:

- Header and public navigation markup.
- Home-page purpose and form labels.
- Markdown documentation body.
- Source attribution and notices.
- Page titles and descriptions.

## `use client` Inventory

There are no `use client` directives in this repository.

If this frontend is migrated to a framework with Server Components later, split the current `src/App.tsx` shape roughly as follows:

- Server/static components: layout shell, header links, markdown article rendering, static home copy.
- Client components: search form, drawer controller, language toggle, code-copy button, SPA navigation adapter.

## Current Tradeoff

The repository remains a Vite SPA to keep the Cloudflare Pages deployment simple. Build-time prerendering is used to cover the most important SSR benefits without changing the runtime architecture or breaking existing client-side behavior.
