# IamLogic — static website

Plain **HTML / CSS / JS**. No framework, no build step, no Node server. Edit the
files directly and refresh the browser; what you edit is what ships.

## Run it locally

Serve the folder with any static server rather than double-clicking a file
(links are relative, so `file://` won't resolve the shared header/footer):

```bash
# any static server works — pick one
python3 -m http.server 4599        # then open http://localhost:4599
npx serve .
```

## Paths are relative — the site works at any base

Every internal link is **page-relative** (`./assets/…`, `../assets/…`,
`../../…` depending on how deep the page is), not root-absolute. That means the
exact same files work unchanged whether the site is served from:

- a **domain root** — `https://iamlogic.com/`
- a **project subpath** — `https://…github.io/IAMLOGIC_WEBSITE/`
- any other mount point.

`assets/main.js` figures out where the site root is at runtime by reading its
own `<script src="…assets/main.js">` (which is itself relative), so the injected
header/footer links resolve correctly from any depth — no base config anywhere.

> **One caveat — `404.html`.** A custom 404 can be served by the host at *any*
> URL depth. Its assets resolve for top-level misses (`/typo`) but a deep miss
> (`/a/b/c/`) will render the 404 unstyled. This is inherent to relative-path
> static hosting; it does not affect real pages.

## Deploy

Upload the whole folder to any static host (GitHub Pages, Netlify, Cloudflare
Pages, S3, nginx…). There is nothing to build. `.nojekyll` is included for
GitHub Pages. Because paths are relative, no per-host base configuration is
needed. (`sitemap.xml` / `robots.txt` still contain absolute URLs — point those
at the final production domain when it's decided.)

## How it's organised

```
index.html                 Home page
about/index.html           /about/   → each route is a folder with an index.html
products/access-manager/index.html
solutions/<slug>/index.html
compliance/<slug>/index.html
blog/<slug>/index.html
…
404.html                   Not-found page
sitemap.xml, robots.txt
favicon.svg                Brand favicon (modern browsers); favicon.ico is the
favicon.ico                raster fallback; apple-touch-icon.png is the iOS icon
apple-touch-icon.png       (all three generated from the logomark)

assets/
  styles.css               ALL styling — hand-written, organised by section,
                           built on CSS variables (brand colours, spacing).
  main.js                  The shared header + footer (single source), the
                           dropdown/mobile-nav behaviour, the lead-form logic,
                           and the icon set.
  fonts/                   Self-hosted Source Sans 3 (no external font requests).
  mockup-am.svg            The product illustrations used on the hero sections
  mockup-iga.svg
  platform-diagram.svg
```

## Editing guide

**Change the header or footer navigation** — edit the `NAV` and
`FOOTER_COLUMNS` arrays near the top of `assets/main.js`. Every page updates at
once (the header/footer are injected from there into each page's
`<header id="site-header">` / `<footer id="site-footer">`).

**Change colours, spacing or fonts** — edit the CSS variables in the
`:root { … }` block at the top of `assets/styles.css` (e.g. `--brand`, `--line`,
`--surface-muted`). Everything else references them.

**Edit page text** — open the page's `index.html` and edit the text directly.
Pages are built from a small set of reusable classes (`.section`, `.container`,
`.card`, `.btn`, `.check-list`, `.faq`, `.section-heading`, `.band-dark`, …) all
documented by section in `styles.css`.

**Add a page** — create `your-route/index.html` (copy an existing page of the
same depth as a starting point). Its `<head>` links to the assets with the right
number of `../` for its depth — one folder deep uses `../assets/…`, two deep
uses `../../assets/…`, the root uses `./assets/…`. To add it to the nav/footer,
put its path in `NAV` / `FOOTER_COLUMNS` in `assets/main.js` as a **root-relative
path without a leading slash** (e.g. `href: "your-route/"`); `main.js` prefixes
it for the current page automatically. Also add the URL to `sitemap.xml`.

**Add an icon** — icons are written as `<i data-icon="name"></i>` and drawn from
the `ICONS` registry in `assets/main.js`. Add a new entry there (SVG inner paths)
to introduce a new icon.

**Contact info** — the address, email and phone live in the `SITE` object in
`assets/main.js` (used by the footer) and are also written directly into the
Contact page.

## The lead forms (demo / contact / pricing)

The forms validate in the browser but have **no backend** by default — this is a
static site. To actually receive submissions, set `SITE.leadEndpoint` in
`assets/main.js` to a webhook URL (e.g. Zoho Flow, Make, n8n, Formspree or
Web3Forms) that accepts a JSON `POST` of
`{ name, email, company, phone, interest, message, intent }`. Until then a
submitted form shows an error prompting the visitor to email directly.
