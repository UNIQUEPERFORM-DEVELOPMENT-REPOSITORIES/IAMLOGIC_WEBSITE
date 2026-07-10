# AGENTS.md

This repository's agent/developer guidance lives in **[CLAUDE.md](./CLAUDE.md)**.

Quick summary: this is the IamLogic marketing website — plain HTML/CSS/JS with
**no build step**. Serve the folder from its root (`python3 -m http.server 4599`)
and edit files directly. The header, footer, navigation, icons, and lead-form
logic all live in `assets/main.js`; all styling and design tokens live in
`assets/styles.css`. Don't add frameworks, bundlers, npm dependencies, or
external CDN assets.

See **[CLAUDE.md](./CLAUDE.md)** for the full guide.
