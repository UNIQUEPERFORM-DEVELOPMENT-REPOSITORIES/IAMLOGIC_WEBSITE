/* ==========================================================================
   IamLogic — shared site chrome & behaviour (no framework, no build step)
   --------------------------------------------------------------------------
   This one file is the SINGLE SOURCE for the header and footer. Edit the
   NAV / FOOTER_COLUMNS / SITE data below and every page updates at once.

   Each page only needs (use a page-RELATIVE path to assets — "../" per folder
   depth — so the site works at any mount point: domain root, subpath, etc.):
     <header id="site-header"></header>   (right after <body>)
     <footer id="site-footer"></footer>   (just before </body>)
     <script src="../assets/main.js" defer></script>   (depth 1; "./" at root)

   All internal links are resolved through url()/ROOT below, which derives the
   site root from this script's own relative src — so nothing hard-codes a base.

   It also powers the lead form (add data-lead-form to a <form>, see demo/)
   and consent-gated analytics (Microsoft Clarity + Google Analytics 4 — see
   CLARITY_PROJECT_ID / GA_MEASUREMENT_ID below). The Microsoft Bookings
   appointment modal lives separately in assets/booking-modal.js (loaded on
   pages that trigger it with data-book or a link to "#book-a-call").
   ========================================================================== */
(function () {
  "use strict";

  /* ----- Editable site data ---------------------------------------------- */
  var SITE = {
    name: "IamLogic",
    email: "info@iamlogic.com",
    phone: "+91-9916421806",
    address:
      "No. 14 & 15, KR Colony, Domlur Layout, Bengaluru, Karnataka 560071, India",
    // Social profiles — leave "" to hide that icon in the footer.
    linkedin: "https://www.linkedin.com/company/iamlogic",
    youtube: "https://www.youtube.com/@IamLogicIdentityManagement",
    // Serverless backend (see functions/packages/forms/lead) that verifies
    // Turnstile and forwards leads to Zoho CRM. Leave "" to disable lead forms.
    leadEndpoint: "/api/forms/lead",
    // Gated case-study download (see functions/packages/forms/download) —
    // verifies Turnstile, forwards the lead, and returns a signed URL to the
    // requested PDF in private Spaces storage. Leave "" to disable.
    downloadEndpoint: "/api/forms/download",
  };

  // Cloudflare Turnstile (bot-check widget on lead forms). The site key is
  // public by design. This default is Cloudflare's own documented dummy
  // "always passes" test key (works on any hostname, no Cloudflare account
  // needed) — replace with your real site key from the Cloudflare dashboard
  // (Turnstile → Add site) before going live. Pair it with the matching
  // dummy secret 1x0000000000000000000000000000000AA as TURNSTILE_SECRET
  // until then (see functions/packages/forms/lead/index.js).
  var TURNSTILE_SITEKEY = "0x4AAAAAAD34xC_Ju3lWEQIG"; 
  var turnstileReady = false;
  var turnstileQueue = [];
  window.iamlogicTurnstileOnload = function () {
    turnstileReady = true;
    turnstileQueue.forEach(function (fn) { fn(); });
    turnstileQueue = [];
  };
  function turnstileWhenReady(fn) {
    if (turnstileReady && window.turnstile) fn();
    else turnstileQueue.push(fn);
  }
  function turnstileRender(el) {
    return window.turnstile.render(el, { sitekey: TURNSTILE_SITEKEY });
  }
  function turnstileResponse(id) {
    try { return window.turnstile.getResponse(id); } catch (e) { return ""; }
  }
  function turnstileReset(id) {
    try { window.turnstile.reset(id); } catch (e) {}
  }
  function turnstileRemove(id) {
    try { window.turnstile.remove(id); } catch (e) {}
  }

  // Microsoft Clarity + Google Analytics 4 (see "Analytics & cookie consent"
  // below). Clarity project ID from clarity.microsoft.com → Settings → Setup;
  // GA4 Measurement ID from Google Analytics → Admin → Data Streams → your
  // stream (format "G-XXXXXXXXXX").
  var CLARITY_PROJECT_ID = "xpvhqz7m4e";
  var GA_MEASUREMENT_ID = "G-Q9M731JPG4";
  // GA4 falls back to this shipped default until a real Measurement ID is
  // set — compared by exact match (not "contains X") since a real ID could
  // contain one.
  var GA_PLACEHOLDER = "G-XXXXXXXXXX";

  // Header navigation. `groups` renders a dropdown; a bare `href` is a plain link.
  var NAV = [
    {
      label: "Products",
      groups: [
        {
          heading: "Products",
          links: [
            { label: "Access Manager", href: "products/access-manager/", description: "SSO, adaptive MFA, passwordless and legacy app access" },
            { label: "IamLogic IGA", href: "products/identity-governance/", description: "Lifecycle automation, access reviews, SoD and role management" },
            { label: "Platform — Better Together", href: "platform/", description: "How Access Manager and IGA work as one identity fabric" },
            { label: "Integrations", href: "integrations/", description: "Directories, business apps, infrastructure and ticketing" }
          ]
        }
      ]
    },
    {
      label: "Solutions",
      groups: [
        {
          heading: "By industry",
          links: [
            { label: "Banking & Financial Services", href: "solutions/banking-financial-services/" },
            { label: "Government & PSU", href: "solutions/government-psu/" },
            { label: "NBFC & Fintech", href: "solutions/nbfc-fintech/" },
            { label: "Insurance", href: "solutions/insurance/" },
            { label: "Healthcare & Pharma", href: "solutions/healthcare-pharma/" },
            { label: "IT & ITeS", href: "solutions/it-ites/" },
            { label: "Manufacturing", href: "solutions/manufacturing/" }
          ]
        },
        {
          heading: "By use case",
          links: [
            { label: "Zero Trust access", href: "solutions/zero-trust-access/" },
            { label: "Joiner–Mover–Leaver automation", href: "solutions/joiner-mover-leaver-automation/" },
            { label: "Access reviews & audit readiness", href: "solutions/access-reviews-audit/" },
            { label: "Passwordless authentication", href: "solutions/passwordless-authentication/" },
            { label: "Legacy application SSO", href: "solutions/legacy-application-sso/" },
            { label: "Hybrid & remote workforce", href: "solutions/hybrid-workforce/" }
          ]
        },
        {
          heading: "By compliance",
          links: [
            { label: "DPDP Act 2023", href: "compliance/dpdp-act/" },
            { label: "RBI Cybersecurity Framework", href: "compliance/rbi-cybersecurity-framework/" },
            { label: "SEBI CSCRF", href: "compliance/sebi-cscrf/" },
            { label: "IRDAI Guidelines", href: "compliance/irdai-guidelines/" },
            { label: "ISO 27001", href: "compliance/iso-27001/" }
          ]
        }
      ]
    },
    {
      label: "Resources",
      groups: [
        {
          heading: "Resources",
          links: [
            { label: "Blog", href: "blog/", description: "Identity security and Indian compliance, explained" },
            { label: "Case studies", href: "resources/case-studies/", description: "Deployment stories by industry" },
            { label: "Datasheets", href: "resources/datasheets/", description: "Product capability summaries" },
            { label: "All resources", href: "resources/", description: "Everything in one place" }
          ]
        }
      ]
    },
    {
      label: "Company",
      groups: [
        {
          heading: "Company",
          links: [
            { label: "About IamLogic", href: "about/", description: "Who we are and why we build in India" },
            { label: "Security & Trust", href: "security/", description: "ISO 27001, architecture and data residency" },
            { label: "IAM Services", href: "services/", description: "Consulting, connectors and managed services" },
            { label: "Partners", href: "partners/", description: "Resell, implement or integrate with IamLogic" },
            { label: "Careers", href: "careers/", description: "Build identity security from Bengaluru" },
            { label: "Contact", href: "contact/", description: "Talk to our team" }
          ]
        }
      ]
    }
  ];

  var FOOTER_COLUMNS = [
    { heading: "Products", links: [
      { label: "Access Manager", href: "products/access-manager/" },
      { label: "IamLogic IGA", href: "products/identity-governance/" },
      { label: "Platform", href: "platform/" },
      { label: "Integrations", href: "integrations/" }
    ]},
    { heading: "Solutions", links: [
      { label: "Banking & Financial Services", href: "solutions/banking-financial-services/" },
      { label: "Government & PSU", href: "solutions/government-psu/" },
      { label: "Zero Trust access", href: "solutions/zero-trust-access/" },
      { label: "JML automation", href: "solutions/joiner-mover-leaver-automation/" },
      { label: "All solutions", href: "solutions/" }
    ]},
    { heading: "Compliance", links: [
      { label: "DPDP Act 2023", href: "compliance/dpdp-act/" },
      { label: "RBI Cybersecurity Framework", href: "compliance/rbi-cybersecurity-framework/" },
      { label: "SEBI CSCRF", href: "compliance/sebi-cscrf/" },
      { label: "IRDAI Guidelines", href: "compliance/irdai-guidelines/" },
      { label: "ISO 27001", href: "compliance/iso-27001/" }
    ]},
    { heading: "Resources", links: [
      { label: "Blog", href: "blog/" },
      { label: "Case studies", href: "resources/case-studies/" },
      { label: "Datasheets", href: "resources/datasheets/" },
      { label: "IAM Services", href: "services/" }
    ]},
    { heading: "Company", links: [
      { label: "About", href: "about/" },
      { label: "Security & Trust", href: "security/" },
      { label: "Partners", href: "partners/" },
      { label: "Careers", href: "careers/" },
      { label: "Contact", href: "contact/" }
    ]}
  ];

  /* ----- Icon registry --------------------------------------------------- */
  /* Line icons (Lucide, ISC-licensed). Add to <i data-icon="name">.
     They inherit colour (currentColor) and size (1em) from their context. */
  var ICONS = {
    "arrow-right": '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    "fingerprint": '<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .13-5.35 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>',
    "key-round": '<path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>',
    "refresh-ccw": '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>',
    "scroll-text": '<path d="M15 12h-5"/><path d="M15 8h-5"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/>',
    "shield-check": '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    "landmark": '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
    "building-2": '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
    "server-cog": '<rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>',
    "workflow": '<rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/>',
    "file-check-2": '<path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m3 15 2 2 4-4"/>',
    "puzzle": '<path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 19.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68L2.71 13.61a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z"/>',
    "globe-2": '<path d="M21.54 15H17a2 2 0 0 0-2 2v4.54"/><path d="M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17"/><path d="M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05"/><circle cx="12" cy="12" r="10"/>',
    "monitor-smartphone": '<path d="M18 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8"/><path d="M10 19v-2"/><path d="M7 19h5"/><rect width="6" height="10" x="16" y="12" rx="2"/>',
    "users": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    "network": '<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>',
    "shield-alert": '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    "git-pull-request": '<circle cx="6" cy="6" r="3"/><path d="M6 9v12"/><circle cx="18" cy="18" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/>',
    "plug": '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
    "bar-chart-3": '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    "mail": '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    "map-pin": '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    "phone": '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    "server": '<rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>',
    "lock": '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    "activity": '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    "file-search": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/><circle cx="11.5" cy="14.5" r="2.5"/><path d="M13.3 16.3 15 18"/>',
    "alert-triangle": '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    "book-open": '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    "file-text": '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h5"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
    "files": '<path d="M20 7h-3a2 2 0 0 1-2-2V2"/><path d="M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z"/><path d="M3 7.6v12.8A1.6 1.6 0 0 0 4.6 22h9.8"/>',
    "download": '<path d="M12 15V3"/><path d="m6 9 6 6 6-6"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
    "scale": '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
    // Brand marks (filled) — stored as complete <svg> so injectIcons paints them
    // with fill=currentColor instead of the line-icon stroke wrapper.
    "linkedin": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
    "youtube": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>'
  };
  function injectIcons(root) {
    var wrap = "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'>";
    Array.prototype.forEach.call((root || document).querySelectorAll("[data-icon]"), function (el) {
      var name = el.getAttribute("data-icon");
      if (ICONS[name] && !el.firstChild) {
        var v = ICONS[name];
        // Full <svg> entries (filled brand marks) are injected verbatim;
        // inner-path entries (line icons) get the stroke wrapper.
        el.innerHTML = v.slice(0, 4) === "<svg" ? v : wrap + v + "</svg>";
      }
    });
  }

  /* ----- Small helpers --------------------------------------------------- */
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  // Normalise a path for active-state comparison ("/about/index.html" -> "/about/")
  function normPath(p) {
    p = p.replace(/index\.html?$/i, "");
    if (p.length > 1 && p.charAt(p.length - 1) !== "/") p += "/";
    return p;
  }
  var CURRENT = normPath(location.pathname);

  // Site root RELATIVE to the current page, derived from this file's own
  // <script src="…assets/main.js">. Because that src is itself page-relative,
  // the whole site works at ANY mount point — a domain root, a project
  // subpath like /IAMLOGIC_WEBSITE/, or anywhere else — with no config.
  var ROOT = (function () {
    var s = document.querySelector('script[src*="assets/main.js"]');
    var src = s ? s.getAttribute("src") : "";
    return src.replace(/assets\/main\.js.*$/, "") || "./";
  })();
  // Resolve a root-relative site path (e.g. "contact/") for the current page.
  function url(p) { return ROOT + p; }

  // Small bridge so other self-contained page scripts (see booking-modal.js,
  // case-study-modal.js) can reuse the site root, the lead endpoint and the
  // shared Turnstile helpers instead of duplicating them.
  window.IAMLOGIC = {
    url: url,
    email: SITE.email,
    leadEndpoint: SITE.leadEndpoint,
    downloadEndpoint: SITE.downloadEndpoint,
    turnstile: {
      whenReady: turnstileWhenReady,
      render: turnstileRender,
      response: turnstileResponse,
      reset: turnstileReset,
      remove: turnstileRemove
    }
  };

  var LOGO_SVG =
    '<svg viewBox="0 0 48 48" fill="none" role="img" aria-label="IamLogic logomark">' +
    '<circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="5"/>' +
    '<circle cx="24" cy="17.5" r="4.75" fill="currentColor"/>' +
    '<path d="M15.5 28.5c1.2-4 4.6-6 8.5-6s7.3 2 8.5 6" stroke="currentColor" stroke-width="4.2" stroke-linecap="round" fill="none"/>' +
    '<line x1="17" y1="30.5" x2="31" y2="30.5" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>' +
    '<line x1="18.5" y1="36" x2="29.5" y2="36" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/></svg>';
  var LOGO =
    '<a class="logo" href="' + url("") + '" aria-label="IamLogic home">' + LOGO_SVG +
    '<span class="logo__word">Iam<b>Logic</b></span></a>';
  var CHEVRON =
    '<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

  /* ----- Header ---------------------------------------------------------- */
  function renderHeader() {
    var desktop = NAV.map(function (item) {
      if (!item.groups) {
        var active = normPath(new URL(url(item.href), location.href).pathname) === CURRENT ? " is-active" : "";
        return '<div class="nav-item"><a class="nav-link' + active + '" href="' + url(item.href) + '">' + esc(item.label) + "</a></div>";
      }
      var mega = item.groups.length > 1;
      var panel = item.groups.map(function (g) {
        var links = g.links.map(function (l) {
          return '<li><a href="' + url(l.href) + '"><span class="nav-group__label">' + esc(l.label) + "</span>" +
            (l.description ? '<span class="nav-group__desc">' + esc(l.description) + "</span>" : "") + "</a></li>";
        }).join("");
        return '<div class="nav-group"><p class="nav-group__heading">' + esc(g.heading) + '</p><ul>' + links + "</ul></div>";
      }).join("");
      return '<div class="nav-item" data-dropdown>' +
        '<button class="nav-trigger" type="button" aria-expanded="false">' + esc(item.label) + CHEVRON + "</button>" +
        '<div class="nav-panel ' + (mega ? "nav-panel--mega" : "nav-panel--single") + '">' + panel + "</div></div>";
    }).join("");

    var mobile = NAV.map(function (item) {
      if (!item.groups) {
        return '<a href="' + url(item.href) + '">' + esc(item.label) + "</a>";
      }
      var groups = item.groups.map(function (g) {
        var links = g.links.map(function (l) {
          return '<a class="nav-mobile__sublink" href="' + url(l.href) + '">' + esc(l.label) + "</a>";
        }).join("");
        return '<p class="nav-mobile__group-heading">' + esc(g.heading) + "</p>" + links;
      }).join("");
      return '<details><summary>' + esc(item.label) + CHEVRON + "</summary><div>" + groups + "</div></details>";
    }).join("");

    return '<div class="container header-inner">' + LOGO +
      '<nav class="nav-desktop" aria-label="Main">' + desktop + "</nav>" +
      '<div class="header-actions"><a class="contact-link" href="' + url("contact/") + '">Contact</a>' +
      '<a class="btn btn--primary" href="' + url("demo/") + '">Request a demo</a></div>' +
      '<button class="nav-toggle" type="button" aria-expanded="false" aria-label="Open menu">' +
      '<svg class="icon-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' +
      '<svg class="icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>' +
      "</button></div>" +
      '<nav class="nav-mobile" aria-label="Mobile"><div class="nav-mobile__inner">' + mobile +
      '<a href="' + url("contact/") + '">Contact</a>' +
      '<div class="mt-2"><a class="btn btn--primary btn--block" href="' + url("demo/") + '">Request a demo</a></div>' +
      "</div></nav>";
  }

  /* ----- Footer ---------------------------------------------------------- */
  function renderFooter() {
    var cols = FOOTER_COLUMNS.map(function (col) {
      var links = col.links.map(function (l) {
        return '<li><a href="' + url(l.href) + '">' + esc(l.label) + "</a></li>";
      }).join("");
      return '<nav class="footer-col" aria-label="' + esc(col.heading) + '"><p class="footer-col__heading">' +
        esc(col.heading) + "</p><ul>" + links + "</ul></nav>";
    }).join("");

    // Social icons — each rendered only if its URL is set; row omitted if none.
    var socialLinks = [
      { href: SITE.linkedin, icon: "linkedin", label: "IamLogic on LinkedIn" },
      { href: SITE.youtube, icon: "youtube", label: "IamLogic on YouTube" }
    ].filter(function (s) { return s.href; }).map(function (s) {
      return '<a href="' + s.href + '" target="_blank" rel="noopener noreferrer" aria-label="' +
        s.label + '"><i data-icon="' + s.icon + '"></i></a>';
    }).join("");
    var social = socialLinks ? '<div class="social-links footer-social">' + socialLinks + "</div>" : "";

    return '<div class="band-dark"><div class="container" style="padding-block:3.5rem">' +
      '<div class="footer-grid"><div class="footer-brand">' +
      '<a class="logo" href="' + url("") + '" aria-label="IamLogic home">' + LOGO_SVG + '<span class="logo__word">Iam<b>Logic</b></span></a>' +
      '<p class="footer-brand__text">Enterprise-grade identity security — engineered in India, built for the world.</p>' +
      '<p class="footer-brand__contact">' + esc(SITE.address) + "<br>" +
      '<a href="mailto:' + SITE.email + '">' + SITE.email + "</a><br>" +
      '<a href="tel:' + SITE.phone + '">' + SITE.phone + "</a></p>" + social + "</div>" + cols + "</div>" +
      '<div class="footer-bottom"><p class="footer-bottom__copy">&copy; <span data-year></span> IamLogic. All rights reserved.</p>' +
      '<div class="footer-bottom__meta"><strong>ISO/IEC 27001:2022 certified</strong>' +
      '<a href="' + url("privacy/") + '">Privacy</a><a href="' + url("terms/") + '">Terms</a>' +
      '<a href="#" data-consent="manage">Cookie settings</a></div></div>' +
      "</div></div>";
  }

  /* ----- Interactions ---------------------------------------------------- */
  function wireHeader(header) {
    var closeTimer = null;
    var items = header.querySelectorAll(".nav-item[data-dropdown]");

    function closeAll() {
      items.forEach(function (it) {
        it.classList.remove("is-open");
        var t = it.querySelector(".nav-trigger");
        if (t) t.setAttribute("aria-expanded", "false");
      });
    }
    function open(it) {
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      closeAll();
      it.classList.add("is-open");
      var t = it.querySelector(".nav-trigger");
      if (t) t.setAttribute("aria-expanded", "true");
    }

    items.forEach(function (it) {
      var trigger = it.querySelector(".nav-trigger");
      trigger.addEventListener("click", function (e) {
        e.stopPropagation();
        if (it.classList.contains("is-open")) closeAll();
        else open(it);
      });
      // Hover (desktop) with a small close delay
      it.addEventListener("mouseenter", function () {
        if (window.matchMedia("(min-width: 1024px)").matches) open(it);
      });
      it.addEventListener("mouseleave", function () {
        if (!window.matchMedia("(min-width: 1024px)").matches) return;
        if (closeTimer) clearTimeout(closeTimer);
        closeTimer = setTimeout(closeAll, 160);
      });
    });

    document.addEventListener("click", function (e) {
      if (!header.contains(e.target)) closeAll();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeAll(); closeMobile(); }
    });

    // Mobile drawer
    var toggle = header.querySelector(".nav-toggle");
    function closeMobile() {
      header.classList.remove("is-mobile-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
    }
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("is-mobile-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
  }

  /* ----- Lead form ------------------------------------------------------- */
  function emailBad(v) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Please enter a valid work email address.";
    if (/@(gmail|yahoo|hotmail|outlook|rediffmail)\./i.test(v))
      return "Please use your work email so we can route your request correctly.";
    return "";
  }
  function validate(name, value, required) {
    if (name === "name" && value.trim().length < 2) return "Please enter your full name.";
    if (name === "email") return emailBad(value.trim());
    if (name === "company" && value.trim().length < 2) return "Please enter your organisation name.";
    if (required && !value.trim()) return "This field is required.";
    return "";
  }
  function fieldError(form, name, msg) {
    var input = form.querySelector('[name="' + name + '"]');
    if (!input) return;
    var errId = input.id + "-err";
    var existing = document.getElementById(errId);
    if (msg) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", errId);
      if (!existing) {
        existing = document.createElement("p");
        existing.id = errId;
        existing.className = "field-error";
        existing.setAttribute("role", "alert");
        input.parentNode.appendChild(existing);
      }
      existing.textContent = msg;
    } else {
      input.removeAttribute("aria-invalid");
      if (existing) existing.remove();
    }
    return !msg;
  }

  function wireLeadForm(form) {
    var requiredInputs = Array.prototype.filter.call(form.elements, function (el) {
      return el.name && el.hasAttribute("required");
    });
    requiredInputs.forEach(function (input) {
      input.addEventListener("blur", function () { fieldError(form, input.name, validate(input.name, input.value, true)); });
    });

    var tsId = null;
    var tsEl = form.querySelector("[data-turnstile]");
    if (tsEl) turnstileWhenReady(function () { tsId = turnstileRender(tsEl); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });

      var ok = true;
      requiredInputs.forEach(function (input) {
        if (!fieldError(form, input.name, validate(input.name, data[input.name] || "", true))) ok = false;
      });
      if (!ok) {
        var bad = form.querySelector('[aria-invalid="true"]');
        if (bad) bad.focus();
        return;
      }

      var submitBtn = form.querySelector('[type="submit"]');
      var banner = form.querySelector("[data-form-error]");
      data.intent = form.getAttribute("data-intent") || "demo";

      function showError(msg) {
        if (banner) { banner.hidden = false; if (msg) banner.textContent = msg; }
        if (submitBtn) submitBtn.disabled = false;
      }
      function showSuccess() {
        var card = form.closest("[data-lead-wrap]") || form;
        var box = document.createElement("div");
        box.className = "form-success";
        box.setAttribute("role", "status");
        box.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>' +
          "<h3>Thank you — we&rsquo;ve got it.</h3>" +
          "<p>Our team will reach out within one business day to schedule your session.</p>";
        form.replaceWith(box);
      }

      if (!SITE.leadEndpoint) { showError(); return; }

      if (tsEl) {
        data.token = turnstileResponse(tsId);
        if (!data.token) { showError("Please complete the verification check, then submit again."); return; }
      }

      if (banner) banner.hidden = true;
      if (submitBtn) { submitBtn.disabled = true; }
      fetch(SITE.leadEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (res) {
          if (!r.ok || !res.ok) throw new Error(res.error || "bad status");
          showSuccess();
        });
      }).catch(function (err) {
        if (tsId !== null) turnstileReset(tsId);
        showError(err && err.message === "captcha_failed"
          ? "Verification failed — please try again."
          : undefined);
      });
    });
  }

  /* ----- Analytics & cookie consent ---------------------------------------
     Microsoft Clarity + Google Analytics 4, opt-in: neither loads for a
     first-time visitor until they click "Accept" on the banner below (a
     returning visitor whose stored choice isn't "denied" loads both
     immediately, no re-prompt). Rejecting stops them immediately (GA's
     official kill switch, plus best-effort cookie cleanup) and the head
     loader skips them entirely on the next navigation. GA4 skips loading
     while GA_MEASUREMENT_ID above is still the shipped placeholder. */
  var clarityLoaded = false, gaLoaded = false;
  function loadClarity() {
    if (clarityLoaded) return;
    clarityLoaded = true;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", CLARITY_PROJECT_ID);
  }
  function loadGA() {
    if (gaLoaded || !GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === GA_PLACEHOLDER) return;
    gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_MEASUREMENT_ID;
    document.head.appendChild(s);
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID);
  }

  var CONSENT_KEY = "iamlogic_consent";
  // Cookies Clarity and GA4 set, cleared on reject.
  var ANALYTICS_COOKIES = [
    "_clck", "_clsk", "CLID", "ANONCHK", "MUID", "SM",
    "_ga", "_gid", "_gat", "_ga_" + GA_MEASUREMENT_ID.replace(/^G-/, "")
  ];
  function readConsent() {
    try { return JSON.parse(localStorage.getItem(CONSENT_KEY) || "null"); } catch (e) { return null; }
  }
  function writeConsent(status) {
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ status: status, ts: new Date().toISOString() })); } catch (e) {}
  }
  function clearAnalyticsCookies() {
    var host = location.hostname;
    var domains = ["", host, "." + host];
    var parts = host.split(".");
    if (parts.length > 2) domains.push("." + parts.slice(-2).join("."));
    ANALYTICS_COOKIES.forEach(function (name) {
      domains.forEach(function (d) {
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + (d ? "; domain=" + d : "");
      });
    });
  }

  function initConsent() {
    var bar = null;
    function build() {
      if (bar) return;
      bar = document.createElement("div");
      bar.className = "cookie-bar";
      bar.setAttribute("hidden", "");
      bar.setAttribute("role", "dialog");
      bar.setAttribute("aria-label", "Cookie consent");
      bar.innerHTML =
        '<p class="cookie-bar__text">We use analytics cookies (Microsoft Clarity and Google Analytics) to understand how visitors use this site. ' +
        'You can reject them or change your choice anytime. See our <a href="' + url("privacy/") + '">Privacy Policy</a>.</p>' +
        '<div class="cookie-bar__actions">' +
          '<button type="button" class="btn btn--secondary" data-consent-action="reject">Reject</button>' +
          '<button type="button" class="btn btn--primary" data-consent-action="accept">Accept</button>' +
        "</div>";
      document.body.appendChild(bar);
      bar.addEventListener("click", function (e) {
        var b = e.target.closest ? e.target.closest("[data-consent-action]") : null;
        if (!b) return;
        if (b.getAttribute("data-consent-action") === "accept") accept(); else reject();
      });
    }
    function open() {
      build();
      bar.removeAttribute("hidden");
      void bar.offsetWidth; // reflow so the transition runs
      bar.classList.add("is-open");
    }
    function close() {
      if (!bar) return;
      bar.classList.remove("is-open");
      bar.setAttribute("hidden", "");
    }
    function accept() {
      writeConsent("granted");
      window["ga-disable-" + GA_MEASUREMENT_ID] = false;
      loadClarity();
      loadGA();
      close();
    }
    function reject() {
      writeConsent("denied");
      window["ga-disable-" + GA_MEASUREMENT_ID] = true; // GA's kill switch — stops hits even if already loaded
      clearAnalyticsCookies();
      close();
    }

    var consent = readConsent();
    if (!consent) open(); // first-time visitor — ask
    else if (consent.status !== "denied") { loadClarity(); loadGA(); }
    else window["ga-disable-" + GA_MEASUREMENT_ID] = true;

    // Footer "Cookie settings" (or any [data-consent="manage"]) reopens it.
    document.addEventListener("click", function (e) {
      var link = e.target.closest ? e.target.closest('[data-consent="manage"]') : null;
      if (!link) return;
      e.preventDefault();
      open();
    });
  }

  /* ----- Boot ------------------------------------------------------------ */
  function init() {
    var header = document.getElementById("site-header");
    if (header) {
      header.className = "site-header";
      header.innerHTML = renderHeader();
      wireHeader(header);
    }
    var footer = document.getElementById("site-footer");
    if (footer) {
      footer.className = "site-footer";
      footer.innerHTML = renderFooter();
    }
    // Current year wherever requested
    Array.prototype.forEach.call(document.querySelectorAll("[data-year]"), function (el) {
      el.textContent = new Date().getFullYear();
    });
    // Lead forms
    Array.prototype.forEach.call(document.querySelectorAll("[data-lead-form]"), wireLeadForm);
    // Icons
    injectIcons(document);
    // Analytics consent
    initConsent();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
