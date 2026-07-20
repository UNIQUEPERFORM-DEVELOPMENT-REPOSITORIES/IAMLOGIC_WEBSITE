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
favicon.svg                       Brand logomark favicon (modern browsers)
favicon.ico                       Raster fallback favicon
apple-touch-icon.png              180×180 iOS home-screen icon
.nojekyll                         (keeps GitHub Pages from processing the site)

assets/
  styles.css        ALL styling. Hand-written, sectioned (see header comment),
                    driven by CSS variables in the :root { … } block.
  main.js           SINGLE SOURCE for the header + footer, nav data, dropdown /
                    mobile-nav behaviour, lead-form logic, the icon set, and
                    consent-gated analytics (Clarity + GA4).
  booking-modal.js  The Microsoft Bookings appointment modal — self-contained,
                    included only on pages that trigger it (see "Analytics,
                    consent & booking" below).
  fonts/            Self-hosted Source Sans 3 (no external font requests).
  *.svg             Product / platform illustrations.

functions/          Lead-form backend (DigitalOcean Functions) — deployed
                    separately from the static site, see "Lead forms" below.
```

## The three files that control almost everything

1. **`assets/main.js`** — an IIFE (`"use strict"`). Near the top are the only
   things you normally edit here:
   - `SITE` — name, email, phone, address, and `leadEndpoint` (see forms below).
   - `NAV` — header navigation. A `groups` entry renders a dropdown; a bare
     `href` entry is a plain link.
   - `FOOTER_COLUMNS` — footer link columns.
   - `ICONS` — the icon registry (SVG inner paths).
   - `CLARITY_PROJECT_ID`, `GA_MEASUREMENT_ID` — analytics IDs (see
     "Analytics, consent & booking" below).
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
  <link rel="icon" href="../../favicon.ico" sizes="32x32">
  <link rel="icon" href="../../favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="../../apple-touch-icon.png">
  <meta name="theme-color" content="#3a2a85">
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
`/demo/`). Submissions POST JSON (`{ name, email, company, phone, interest,
message, intent, hp, token }`) to `SITE.leadEndpoint` in `assets/main.js`.

Two deliberate exceptions to this repo's "no backend, self-hosted only" rule
power this, both scoped narrowly to the lead forms:

- **`functions/`** — a small Node backend (DigitalOcean App Platform
  Functions, `functions/packages/forms/lead/index.js`), deployed as its own
  component alongside the static site. It verifies Cloudflare Turnstile
  server-side, then forwards the lead to Zoho CRM's Web-to-Lead endpoint
  (real org tokens already filled in — copied from the "Website lead capture"
  form in Zoho CRM → Setup → Developer Space → Web Forms) so the Zoho form
  tokens never reach the browser. It does **not** add a build step to the
  site itself — the HTML/CSS/JS still ships unbuilt. `SITE.leadEndpoint`
  assumes the functions component is routed at `/api`. If that Zoho web form
  is ever regenerated (fields added/removed), its tokens change — re-copy
  `xnQsjsdp`/`xmIwtLD` from the new generated HTML into `ZOHO.hidden`, and
  re-check `INTEREST_MAP` against the "Product interest" picklist's values.
- **Cloudflare Turnstile script** (`challenges.cloudflare.com/turnstile/v0/api.js`,
  included on `demo/`, `contact/`, `pricing/`) — the one external CDN script
  in the site. Unavoidable: no hosted captcha can be self-hosted. Replace the
  placeholder `TURNSTILE_SITEKEY` in `assets/main.js` (currently Cloudflare's
  public "always passes" test key) with your real site key, and set
  `TURNSTILE_SECRET` as an encrypted env var on the functions component.

If `SITE.leadEndpoint` is unset, or the backend is unreachable, a submission
shows an error banner prompting the visitor to email directly instead.

## Gated case-study downloads

`resources/case-studies/` follows the same "no backend, self-hosted only"
exception as the lead forms, extended one step further: `assets/case-study-modal.js`
opens an accessible modal for any `[data-cs="<id>"]` trigger (see the
"Download PDF" buttons on the case-study listing cards and the "Download as
PDF" callouts on each individual case-study page), captures name/work
email/company + Turnstile, and POSTs to `functions/packages/forms/download`
— a second Functions action alongside `forms/lead`. That function verifies
Turnstile, forwards the lead to its own dedicated Zoho Web-to-Lead form
("Website casestudy PDF download lead capture" — separate from the lead
forms' "Website lead capture" form, so downloads are distinguishable in
Zoho), then presigns a short-lived (2-minute) URL to the requested PDF in a
**private DigitalOcean Spaces bucket** (`ASSETS` in that file maps each
`id` to a Spaces object key and a display title — add a new PDF by adding an
entry there and uploading the file to Spaces under that exact key; nothing
else references the file). Requires four more encrypted env vars on the
functions component beyond `TURNSTILE_SECRET`: `SPACES_KEY`, `SPACES_SECRET`,
`SPACES_BUCKET`, `SPACES_REGION` (see `functions/project.yml`'s header
comment). The site itself still ships unbuilt — only the functions component
gained a dependency (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`).
Until Spaces is configured and the real PDFs are uploaded, submitting the
form still captures the lead but the presigned link will 404.

## Analytics, consent & booking

Three more deliberate exceptions to the "self-hosted only" rule.

- **Microsoft Clarity + Google Analytics 4** — wired up in `assets/main.js`,
  no per-page script tags needed since `main.js` already loads on every page.
  Consent-gated (opt-out): both load on first visit unless the visitor
  rejects via the cookie bar, which appears once per visitor (choice
  persisted in `localStorage`, reopenable from the footer's "Cookie settings"
  link). Rejecting sets GA's official `ga-disable-<id>` kill switch and
  best-effort clears Clarity/GA cookies. `CLARITY_PROJECT_ID` and
  `GA_MEASUREMENT_ID` near the top of `main.js` ship as the literal
  placeholders `xxxxxxxxxx` / `G-XXXXXXXXXX` (`CLARITY_PLACEHOLDER` /
  `GA_PLACEHOLDER`, compared by exact match, not "contains x/X" — a real
  Clarity ID is random lowercase-alphanumeric and can legitimately contain an
  "x") — the loaders no-op only while the value is still exactly that
  default. Set your real IDs (Clarity: clarity.microsoft.com → Settings → Setup; GA4: Google
  Analytics → Admin → Data Streams → Measurement ID).
- **Microsoft Bookings iframe** — `assets/booking-modal.js` is a separate,
  self-contained file (unlike everything else, which lives in `main.js`) so
  it can be dropped onto only the pages that need it, the same way the
  Turnstile script is scoped to specific pages. It embeds your published
  Bookings URL (the `BOOKINGS` array's `url`, at the top of the file) in an
  iframe inside a modal dialog, and opens for any `data-book` element or a
  link to `#book-a-call`. Currently included via
  `<script src="../assets/booking-modal.js" defer></script>` on `/demo/` and
  `/contact/` — add the same tag to any other page that gets a `data-book`
  trigger, or the click silently does nothing.
  `BOOKINGS` holds one entry today; the chooser step and "back" button are
  dead code until a second entry is added (they re-appear automatically). A
  `url` containing the literal string `PLACEHOLDER` shows a friendly
  "coming soon" card instead of a broken iframe.
- If the Bookings page is ever republished, update the `url` in
  `assets/booking-modal.js`; nothing else references it.

`privacy/index.html` documents the Clarity/GA cookies — keep it in sync if
the analytics setup changes materially (still marked "draft for legal review"
pending counsel sign-off).

## Deploy

Upload the whole folder to any static host (GitHub Pages, Netlify, Cloudflare
Pages, S3, nginx). Nothing to build, and no per-host base config — paths are
relative (see above). Currently deployed to GitHub Pages at
`https://uniqueperform-development-repositories.github.io/IAMLOGIC_WEBSITE/`
(temporary; production will move to a real domain at the root, on DigitalOcean
App Platform — see `robots.txt`).

`functions/` deploys separately as a Functions component in the same
DigitalOcean App Platform app, routed at `/api` (Create/Edit App → Add
Component → Function, pointing at the `functions/` directory). It only needs
to exist wherever the lead forms are actually used in production — it plays
no part in serving the static pages.

## Conventions & guardrails for agents

- **No dependencies, no build tooling for the site itself.** Don't introduce
  npm packages, a framework, or a bundler into the static site. If a task
  seems to need one, stop and ask first. (`functions/` is a narrow, documented
  exception — see "Lead forms" above — not a precedent for adding more.)
- **Keep everything self-hosted**, with documented exceptions: the Cloudflare
  Turnstile script used by the lead forms (see "Lead forms" above), Microsoft
  Clarity + Google Analytics 4, and the Microsoft Bookings iframe (see
  "Analytics, consent & booking" below). No other external CDN scripts,
  fonts, or stylesheets — fonts are bundled in `assets/fonts/`.
- **Use page-relative links, never root-absolute** (`../assets/…`, not
  `/assets/…`) — see "Paths are RELATIVE" above. This is what lets the site run
  at any base.
- **Reuse existing component classes and CSS tokens** instead of adding one-off
  styles or inline colours.
- **Header/footer/nav/contact live only in `main.js`** — never hard-code them
  into individual pages (the Contact page duplicates address info intentionally).
- **After edits, verify by loading pages in the local server** above and
  checking the browser console — there are no automated tests.
