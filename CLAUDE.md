# CLAUDE.md

Guidance for AI agents and developers working in this repository. Read this
first, then `README.md` for the human-oriented editing walkthrough.

## What this is

The **IamLogic** marketing website. Plain **HTML + CSS + JS**. No framework, no
bundler, no Node server, **no build step**. What you edit is what ships — edit a
file and refresh the browser.

## Run it locally

Serve with a static server — do **not** open files with `file://` (the shared
header/footer won't load). Paths are relative, so serving the repo root works,
and so does serving it from any subpath (see "Paths are RELATIVE" below).

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

## Paths are RELATIVE — the site must work at any base

This is the most important convention. **Never use root-absolute links**
(`/assets/…`, `/about/`). All internal links are **page-relative** so the site
runs unchanged at a domain root, a project subpath (`…/IAMLOGIC_WEBSITE/`), or
any other mount point. The prefix depends on the page's folder depth:

| Page | Depth | Prefix |
|------|-------|--------|
| `index.html`, `404.html` | 0 | `./` |
| `about/index.html` | 1 | `../` |
| `products/access-manager/index.html` | 2 | `../../` |

`assets/main.js` computes the site root at runtime from its own
`<script src="…assets/main.js">` (itself relative) into a `ROOT` var, and every
injected header/footer link goes through `url(path)` = `ROOT + path`. So nav
data in `NAV` / `FOOTER_COLUMNS` is stored **root-relative without a leading
slash** (e.g. `href: "contact/"`), and `main.js` prefixes it per page. Active-nav
state compares `new URL(url(href), location.href).pathname` so it holds at any base.

CSS `url(fonts/…)` is relative to the stylesheet already — leave it.

## Page anatomy (copy this when adding a page)

Every page is a folder with an `index.html`. Copy an existing page **at the same
depth** so the `../` count is already right, then edit content. Skeleton (shown
for a depth-2 page — use `./` at root, `../` one deep):

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>… — IamLogic</title>
  <meta name="description" content="…">
  <link rel="icon" href="../../favicon.ico" sizes="any">
  <link rel="preload" href="../../assets/fonts/source-sans-3-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="../../assets/styles.css">
  <script src="../../assets/main.js" defer></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>
  <header id="site-header"></header>       <!-- filled by main.js -->
  <main id="main">
    <!-- page sections here; in-page links also use ../../ etc. -->
  </main>
  <footer id="site-footer"></footer>       <!-- filled by main.js -->
</body>
</html>
```

When you add a page, also:
- add it to `sitemap.xml`,
- link to it from `NAV` / `FOOTER_COLUMNS` in `assets/main.js` (root-relative,
  no leading slash) if it should be reachable from the chrome.

> **`404.html` caveat:** the host can serve it at any URL depth, so its relative
> assets only resolve for top-level misses; a deep miss renders it unstyled.
> Inherent to relative-path static hosting — accept it, don't "fix" it by
> hard-coding an absolute base.

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
Pages, S3, nginx). Nothing to build, and no per-host base config — paths are
relative (see above). Currently deployed to GitHub Pages at
`https://uniqueperform-development-repositories.github.io/IAMLOGIC_WEBSITE/`
(temporary; production will move to a real domain at the root).

## Conventions & guardrails for agents

- **No dependencies, no build tooling.** Don't introduce npm packages, a
  framework, a bundler, or a `package.json`. If a task seems to need one, stop
  and ask first.
- **Keep everything self-hosted.** No external CDN scripts, fonts, or stylesheets
  — fonts are bundled in `assets/fonts/`.
- **Use page-relative links, never root-absolute** (`../assets/…`, not
  `/assets/…`) — see "Paths are RELATIVE" above. This is what lets the site run
  at any base.
- **Reuse existing component classes and CSS tokens** instead of adding one-off
  styles or inline colours.
- **Header/footer/nav/contact live only in `main.js`** — never hard-code them
  into individual pages (the Contact page duplicates address info intentionally).
- **After edits, verify by loading pages in the local server** above and
  checking the browser console — there are no automated tests.
