# CLAUDE.md

Guidance for AI agents and developers working in this repository. Read this
first, then `README.md` for the human-oriented editing walkthrough.

## What this is

The **IamLogic** marketing website. Plain **HTML + CSS + JS**. No framework, no
bundler, no Node server, **no build step**. What you edit is what ships — edit a
file and refresh the browser.

## Run it locally

Pages use root-relative links (`/about/`, `/assets/…`), so serve from the repo
root — do **not** open files with `file://`.

```bash
python3 -m http.server 4599     # then open http://localhost:4599
# or: npx serve .
```

## Layout

```
index.html                        Home page
404.html                          Not-found page
<route>/index.html                Every route is a folder + index.html
                                  (about/, pricing/, products/access-manager/,
                                   solutions/<slug>/, compliance/<slug>/,
                                   blog/<slug>/, resources/<sub>/, …)
sitemap.xml, robots.txt           SEO
favicon.ico, .nojekyll            (.nojekyll keeps GitHub Pages from processing)

assets/
  styles.css        ALL styling. Hand-written, sectioned (see header comment),
                    driven by CSS variables in the :root { … } block.
  main.js           SINGLE SOURCE for the header + footer, nav data, dropdown /
                    mobile-nav behaviour, lead-form logic, and the icon set.
  fonts/            Self-hosted Source Sans 3 (no external font requests).
  *.svg             Product / platform illustrations.
```

## The three files that control almost everything

1. **`assets/main.js`** — an IIFE (`"use strict"`). Near the top are the only
   things you normally edit here:
   - `SITE` — name, email, phone, address, and `leadEndpoint` (see forms below).
   - `NAV` — header navigation. A `groups` entry renders a dropdown; a bare
     `href` entry is a plain link.
   - `FOOTER_COLUMNS` — footer link columns.
   - `ICONS` — the icon registry (SVG inner paths).
   Edit these and **every page updates at once**, because the header/footer are
   injected into each page's `<header id="site-header">` / `<footer id="site-footer">`.

2. **`assets/styles.css`** — change colours/spacing/fonts by editing the CSS
   variables in `:root { … }` (e.g. `--indigo-800` is the brand colour, `--ink`,
   `--line`, `--surface-muted`). Everything else references these tokens, so
   don't hard-code colours. Reusable component classes (`.section`, `.container`,
   `.card`, `.btn`, `.check-list`, `.faq`, `.section-heading`, `.band-dark`, …)
   are documented section-by-section in the file.

3. Each **`index.html`** — page content only. Compose from the existing
   component classes rather than inventing new markup patterns.

## Page anatomy (copy this when adding a page)

Every page is a folder with an `index.html` and this skeleton:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>… — IamLogic</title>
  <meta name="description" content="…">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="preload" href="/assets/fonts/source-sans-3-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/styles.css">
  <script src="/assets/main.js" defer></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>
  <header id="site-header"></header>       <!-- filled by main.js -->
  <main id="main">
    <!-- page sections here -->
  </main>
  <footer id="site-footer"></footer>       <!-- filled by main.js -->
</body>
</html>
```

When you add a page, also:
- add it to `sitemap.xml`,
- link to it from `NAV` and/or `FOOTER_COLUMNS` in `assets/main.js` if it
  should be reachable from the chrome.

## Icons

Written as `<i data-icon="name"></i>` and drawn from the `ICONS` registry in
`assets/main.js`. To add one, add an entry (its SVG inner paths) to `ICONS`.

## Lead forms (demo / contact / pricing)

Add `data-lead-form` to a `<form>` to wire up client-side validation (see
`/demo/`). There is **no backend by default**. To receive submissions, set
`SITE.leadEndpoint` in `assets/main.js` to a webhook URL (Zoho Flow, Make, n8n,
Formspree, Web3Forms…) that accepts a JSON `POST` of
`{ name, email, company, phone, interest, message, intent }`. Until then, a
submission shows an error prompting the visitor to email directly.

## Deploy

Upload the whole folder to any static host (GitHub Pages, Netlify, Cloudflare
Pages, S3, nginx). Nothing to build.

## Conventions & guardrails for agents

- **No dependencies, no build tooling.** Don't introduce npm packages, a
  framework, a bundler, or a `package.json`. If a task seems to need one, stop
  and ask first.
- **Keep everything self-hosted.** No external CDN scripts, fonts, or stylesheets
  — fonts are bundled in `assets/fonts/`.
- **Use root-relative links** (`/about/`, `/assets/…`), matching existing pages.
- **Reuse existing component classes and CSS tokens** instead of adding one-off
  styles or inline colours.
- **Header/footer/nav/contact live only in `main.js`** — never hard-code them
  into individual pages (the Contact page duplicates address info intentionally).
- **After edits, verify by loading pages in the local server** above and
  checking the browser console — there are no automated tests.
