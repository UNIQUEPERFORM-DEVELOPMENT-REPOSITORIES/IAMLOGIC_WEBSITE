/* ==========================================================================
   IamLogic — blog-only behaviour (no framework, no build step)
   --------------------------------------------------------------------------
   Loaded ONLY by pages under /blog/ (same pattern as assets/booking-modal.js):

     <script src="../assets/blog.js" defer></script>        (listing, depth 1)
     <script src="../../assets/blog.js" defer></script>     (article, depth 2)

   It powers four things and nothing else — no site chrome, no forms:

     1. Table of contents  — built from the H2/H3 already in .article__body.
        Headings carry their own stable id="" in the HTML, so the anchors work
        without JavaScript and survive edits; ids are only generated as a
        fallback.
     2. Scroll-spy         — highlights the section currently being read.
     3. Rail cards         — the contents and "Recent articles" <details> are
        open in the desktop sticky rail, collapsed on mobile where the rail
        sits above the article.
     4. FAQ accordion      — one answer open at a time. Native, from the shared
        name="" on each <details>; this only patches browsers without it.
     5. Share buttons      — plain share URLs, no third-party widgets/scripts.
        Two places: the block at the end of the article, and the control in the
        meta row, which CSS opens on hover and this opens on click/tap and
        closes on Escape — so hover is never the only way in.
     6. Listing filter     — category chips + text filter on /blog/. Every card
        stays in the DOM (and in the crawlable HTML); the filter only hides.

   Analytics: if a GTM dataLayer already exists, interactions are pushed to it
   (event: "blog_interaction"). Nothing is loaded and no new tracker is added.
   ========================================================================== */
(function () {
  "use strict";

  /* ----- helpers ---------------------------------------------------------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function track(action, label) {
    if (!window.dataLayer || typeof window.dataLayer.push !== "function") return;
    window.dataLayer.push({ event: "blog_interaction", blog_action: action, blog_label: label || "" });
  }

  function slugify(text) {
    return String(text).toLowerCase()
      .replace(/[‘’“”]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "section";
  }

  function svg(paths, extra) {
    var s = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" ' +
      (extra || 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"') +
      ">" + paths + "</svg>";
    return s;
  }

  /* ======================================================================
     1 + 2. Table of contents and scroll-spy
     ====================================================================== */
  function buildToc() {
    var host = $("[data-toc]");
    var body = $(".article__body");
    if (!host || !body) return;

    var headings = $$("h2, h3", body).filter(function (h) {
      return h.textContent.trim().length > 0;
    });
    if (headings.length < 3) { host.remove(); return; }   // not worth a TOC

    var used = {};
    headings.forEach(function (h) {
      if (!h.id) {
        var base = slugify(h.textContent);
        var id = base, n = 2;
        while (document.getElementById(id) || used[id]) { id = base + "-" + n++; }
        h.id = id;
      }
      used[h.id] = true;
    });

    var list = document.createElement("ol");
    list.className = "toc__list";
    var sub = null;

    headings.forEach(function (h) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + h.id;
      a.textContent = h.textContent.trim();
      li.appendChild(a);

      if (h.tagName === "H3" && list.lastElementChild) {
        if (!sub) {
          sub = document.createElement("ol");
          sub.className = "toc__list";
          list.lastElementChild.appendChild(sub);
        }
        sub.appendChild(li);
      } else {
        sub = null;
        list.appendChild(li);
      }
    });

    var nav = document.createElement("nav");
    nav.className = "toc__nav";
    nav.setAttribute("aria-label", "Table of contents");
    nav.appendChild(list);
    host.appendChild(nav);

    host.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest("a") : null;
      if (a && host.contains(a)) track("toc_click", a.textContent.trim());
    });

    spy(headings, nav);
  }

  /* Rail cards (contents, recent articles) are open in the desktop sticky rail
     and collapsed on mobile, where the rail sits above the article. <details>
     gives us keyboard support and aria-expanded for free. */
  function syncRailCards() {
    var cards = $$("[data-rail-card]");
    if (!cards.length) return;
    var wide = window.matchMedia("(min-width: 1120px)");
    function apply(mq) { cards.forEach(function (c) { c.open = mq.matches; }); }
    apply(wide);
    if (wide.addEventListener) wide.addEventListener("change", apply);
    else if (wide.addListener) wide.addListener(apply);
  }

  function spy(headings, nav) {
    if (!("IntersectionObserver" in window)) return;
    var links = {};
    $$("a", nav).forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
    var visible = {};

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        visible[entry.target.id] = entry.isIntersecting;
      });
      var current = null;
      for (var i = 0; i < headings.length; i++) {
        if (visible[headings[i].id]) { current = headings[i].id; break; }
      }
      if (!current) return;
      Object.keys(links).forEach(function (id) {
        links[id].classList.toggle("is-current", id === current);
        if (id === current) links[id].setAttribute("aria-current", "true");
        else links[id].removeAttribute("aria-current");
      });
    }, { rootMargin: "-80px 0px -70% 0px", threshold: 0 });

    headings.forEach(function (h) { io.observe(h); });
  }

  /* ======================================================================
     3b. FAQ accordion — one answer open at a time
     ====================================================================== */
  function faqAccordion() {
    var faq = $(".article-faq .faq");
    if (!faq) return;
    /* Modern browsers do this natively from the shared name="" on each
       <details>; only patch the ones that don't support it. */
    if ("name" in document.createElement("details")) return;

    var items = $$("details", faq);
    items.forEach(function (item) {
      item.addEventListener("toggle", function () {
        if (!item.open) return;
        items.forEach(function (other) { if (other !== item) other.open = false; });
      });
    });
  }

  /* ======================================================================
     4. Share buttons — plain URLs, no third-party script
     ====================================================================== */
  var SHARE_ICONS = {
    linkedin: svg('<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM10 9h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.76V21h-4v-5.6c0-1.34-.03-3.06-1.9-3.06-1.9 0-2.2 1.45-2.2 2.96V21h-4z" />',
      'fill="currentColor"'),
    x: svg('<path d="M17.5 3h3.2l-7 8 8.3 10h-6.5l-5-6.1L4.7 21H1.5l7.5-8.6L1 3h6.7l4.6 5.6zm-1.1 16h1.8L7.7 4.8H5.8z" />',
      'fill="currentColor"'),
    whatsapp: svg('<path d="M12 2a9.9 9.9 0 0 0-8.5 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 1.9a8.1 8.1 0 1 1-4.1 15.1l-.3-.2-3.1.8.8-3-.2-.3A8.1 8.1 0 0 1 12 3.9zm4.6 10.1c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.2-2.8c-.1-.2 0-.4.1-.5l.4-.5c.1-.2.1-.3 0-.5l-.7-1.6c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1s.9 2.4 1 2.6a9.3 9.3 0 0 0 3.7 3.3c1.3.5 1.8.6 2.4.5.4-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1z" />',
      'fill="currentColor"'),
    copy: svg('<rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" />')
  };

  function shareTargets() {
    var url = (document.querySelector('link[rel="canonical"]') || {}).href || location.href;
    var title = (document.querySelector("h1") || {}).textContent || document.title;
    var u = encodeURIComponent(url);
    var t = encodeURIComponent(title.trim());
    return { url: url, targets: [
      { key: "linkedin", label: "Share on LinkedIn", href: "https://www.linkedin.com/sharing/share-offsite/?url=" + u },
      { key: "x", label: "Share on X", href: "https://twitter.com/intent/tweet?url=" + u + "&text=" + t },
      { key: "whatsapp", label: "Share on WhatsApp", href: "https://api.whatsapp.com/send?text=" + t + "%20" + u }
    ] };
  }

  function shareLink(target) {
    var a = document.createElement("a");
    a.href = target.href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.setAttribute("aria-label", target.label);
    a.title = target.label;
    a.innerHTML = SHARE_ICONS[target.key];
    a.addEventListener("click", function () { track("share", target.key); });
    return a;
  }

  function copyButton(url, status) {
    var copy = document.createElement("button");
    copy.type = "button";
    copy.className = "share__copy";
    copy.setAttribute("aria-label", "Copy link to this article");
    copy.title = "Copy link";
    copy.innerHTML = SHARE_ICONS.copy;
    copy.addEventListener("click", function () {
      function done(ok) {
        if (!status) return;
        status.textContent = ok ? "Link copied" : "Press Ctrl+C to copy";
        window.setTimeout(function () { status.textContent = ""; }, 3000);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); });
      } else {
        done(false);
      }
      track("share", "copy_link");
    });
    return copy;
  }

  function buildShare() {
    var host = $("[data-share]");
    if (!host) return;
    var share = shareTargets();
    var url = share.url, targets = share.targets;

    var label = document.createElement("span");
    label.className = "share__label";
    label.textContent = "Share this article";

    var links = document.createElement("div");
    links.className = "share__links";

    var status = document.createElement("span");
    status.className = "share__status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    targets.forEach(function (target) { links.appendChild(shareLink(target)); });
    links.appendChild(copyButton(url, status));

    host.appendChild(label);
    host.appendChild(links);
    host.appendChild(status);
  }

  /* The share control in the article meta row. CSS already reveals the icons
     on hover and on focus-within; this adds click/tap and Escape, so hover is
     never the only way to open it. */
  function buildInlineShare() {
    var host = $("[data-share-inline]");
    if (!host) return;
    var toggle = $(".share-inline__toggle", host);
    if (!toggle) return;

    var share = shareTargets();
    var menu = document.createElement("span");
    menu.className = "share-inline__menu";
    share.targets.forEach(function (target) { menu.appendChild(shareLink(target)); });
    menu.appendChild(copyButton(share.url, null));
    host.appendChild(menu);

    function setOpen(open) {
      host.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    }

    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") !== "true";
      setOpen(open);
      if (open) track("share_open", "inline");
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && host.classList.contains("is-open")) { setOpen(false); toggle.focus(); }
    });

    document.addEventListener("click", function (e) {
      if (!host.contains(e.target)) setOpen(false);
    });
  }

  /* ======================================================================
     5. Listing filter — category chips + text filter
     ====================================================================== */
  function buildFilters() {
    var toolbar = $("[data-blog-filters]");
    if (!toolbar) return;

    var cards = $$("[data-post]");
    var chips = $$(".blog-cat", toolbar);
    var search = $("input", toolbar);
    var count = $("[data-blog-count]");
    var empty = $("[data-blog-empty]");
    var active = "all";

    function apply() {
      var term = (search && search.value || "").trim().toLowerCase();
      var shown = 0;

      cards.forEach(function (card) {
        var matchesCat = active === "all" || card.getAttribute("data-category") === active;
        var matchesTerm = !term || (card.getAttribute("data-search") || "").indexOf(term) !== -1;
        var show = matchesCat && matchesTerm;
        card.hidden = !show;
        if (show) shown++;
      });

      if (count) {
        count.textContent = shown === cards.length
          ? "Showing all " + cards.length + " articles"
          : "Showing " + shown + " of " + cards.length + " articles";
      }
      if (empty) empty.hidden = shown !== 0;
    }

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        active = chip.getAttribute("data-category") || "all";
        chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)); });
        apply();
        track("category_filter", active);
      });
    });

    if (search) {
      var timer;
      search.addEventListener("input", function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(apply, 120);
      });
    }

    /* Article breadcrumbs link back as /blog/#access-management — no separate
       (thin, duplicate) category URLs, just a pre-selected chip on this page. */
    function fromHash() {
      var want = (location.hash || "").replace(/^#/, "");
      if (!want) return;
      var match = chips.filter(function (c) { return c.getAttribute("data-category-slug") === want; })[0];
      if (!match) return;
      active = match.getAttribute("data-category") || "all";
      chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c === match)); });
      apply();
    }

    toolbar.hidden = false;
    apply();
    fromHash();
    window.addEventListener("hashchange", fromHash);
  }

  /* ----- boot ------------------------------------------------------------- */
  function init() {
    buildToc();
    syncRailCards();
    faqAccordion();
    buildShare();
    buildInlineShare();
    buildFilters();

    document.addEventListener("click", function (e) {
      var el = e.target.closest ? e.target.closest("[data-blog-track]") : null;
      if (el) track(el.getAttribute("data-blog-track"), el.textContent.trim().slice(0, 80));
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
