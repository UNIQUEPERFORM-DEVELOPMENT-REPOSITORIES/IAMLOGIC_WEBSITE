# IamLogic — static website

Plain **HTML / CSS / JS**. No framework, no build step, no Node server. Edit the
files directly and refresh the browser; what you edit is what ships.

## Run it locally

Because pages use root-relative links (`/about/`, `/assets/…`), serve the folder
from its root rather than double-clicking a file:

```bash
# any static server works — pick one
python3 -m http.server 4599        # then open http://localhost:4599
npx serve .
```

## Deploy

Upload the whole folder to any static host (GitHub Pages, Netlify, Cloudflare
Pages, S3, nginx…). There is nothing to build. `.nojekyll` is included for
GitHub Pages.

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
favicon.ico

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
