/* IamLogic — gated case-study PDF download.
   Opens an accessible modal for any [data-cs="<id>"] trigger, captures name /
   work email / company (+ Turnstile), POSTs to the serverless download
   endpoint (functions/packages/forms/download — verifies Turnstile, forwards
   the lead to Zoho, then presigns a short-lived URL to the PDF in private
   Spaces storage), then reveals that signed URL. The `id` on each STUDIES
   entry must match a key in that function's ASSETS whitelist.

   Self-contained like booking-modal.js, but reuses window.IAMLOGIC (exposed
   by main.js) for the site root, the download endpoint and the shared
   Turnstile helpers, so the sitekey/endpoint stay defined in one place.
   Include the Turnstile script tag (see demo/) on any page that uses this
   modal. */
(function () {
  "use strict";

  var STUDIES = [
    { id: "pam-sso-mfa", title: "SSO/MFA protection for on-premises privileged access" },
    { id: "access-certification", title: "Automating access certification at enterprise scale" },
    { id: "jml-automation", title: "End-to-end identity lifecycle automation (Joiner–Mover–Leaver)" }
  ];
  var LEAD_KEY = "iamlogic_cs_lead"; // last submitter — pre-fills the form next time

  var overlay, dialog, titleEl, bodyEl, eyebrowEl, lastFocused, built = false;
  var tsId = null;

  function svg(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
           'stroke-linecap="round" stroke-linejoin="round">' + inner + "</svg>";
  }
  function study(id) { return STUDIES.filter(function (s) { return s.id === id; })[0]; }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function IL() { return window.IAMLOGIC || {}; }
  function siteUrl(p) { return IL().url ? IL().url(p) : p; }
  /* Unrender the Turnstile widget while its DOM still exists — clearing it
     via bodyEl.innerHTML afterwards leaves Turnstile's own registry holding
     a dead widget id, which logs a console warning next render. */
  function clearTurnstile() {
    if (tsId === null) return;
    var t = IL().turnstile;
    if (t) { if (t.remove) t.remove(tsId); else t.reset(tsId); }
    tsId = null;
  }
  function lastLead() {
    try { return JSON.parse(localStorage.getItem(LEAD_KEY) || "null"); } catch (e) { return null; }
  }
  function rememberLead(data) {
    try { localStorage.setItem(LEAD_KEY, JSON.stringify({ name: data.name, email: data.email, company: data.company })); }
    catch (e) { /* storage unavailable — non-fatal */ }
  }

  /* Mirrors assets/main.js's lead-form validation so the messages match. */
  function emailBad(v) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Please enter a valid work email address.";
    if (/@(gmail|yahoo|hotmail|outlook|rediffmail)\./i.test(v))
      return "Please use your work email so we can route your request correctly.";
    return "";
  }
  function validate(name, value) {
    if (name === "name" && value.trim().length < 2) return "Please enter your full name.";
    if (name === "email") return emailBad(value.trim());
    if (name === "company" && value.trim().length < 2) return "Please enter your organisation name.";
    return "";
  }
  function fieldError(form, name, msg) {
    var input = form.querySelector('[name="' + name + '"]');
    if (!input) return true;
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

  function build() {
    overlay = document.createElement("div");
    overlay.className = "bk-overlay";
    overlay.setAttribute("hidden", "");
    overlay.innerHTML =
      '<div class="bk-dialog" role="dialog" aria-modal="true" aria-labelledby="csm-title">' +
        '<div class="bk-head">' +
          '<div><p class="bk-eyebrow" id="csm-eyebrow">Case study</p>' +
            '<h2 id="csm-title" class="h3" style="font-size:1.25rem">Download case study</h2></div>' +
          '<button class="bk-close" type="button" aria-label="Close dialog">&times;</button>' +
        "</div>" +
        '<div class="bk-body"></div>' +
      "</div>";
    document.body.appendChild(overlay);
    dialog = overlay.querySelector(".bk-dialog");
    titleEl = overlay.querySelector("#csm-title");
    eyebrowEl = overlay.querySelector("#csm-eyebrow");
    bodyEl = overlay.querySelector(".bk-body");
    overlay.querySelector(".bk-close").addEventListener("click", close);
    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });
    built = true;
  }

  function showForm(s) {
    eyebrowEl.textContent = "Case study";
    titleEl.textContent = "Download the case study";
    clearTurnstile();

    bodyEl.innerHTML =
      '<div style="padding:1.5rem">' +
        '<p class="text-muted" style="margin-bottom:1.25rem;line-height:1.6">' +
          esc(s.title) + " &mdash; tell us where to send it and we&rsquo;ll unlock the PDF." +
        "</p>" +
        '<form class="lead-form" novalidate>' +
          '<div class="field"><label for="csm-name">Full name <span class="req">*</span></label>' +
            '<input class="input" id="csm-name" name="name" autocomplete="name" required></div>' +
          '<div class="field"><label for="csm-email">Work email <span class="req">*</span></label>' +
            '<input class="input" id="csm-email" name="email" type="email" autocomplete="email" required></div>' +
          '<div class="field"><label for="csm-company">Company <span class="req">*</span></label>' +
            '<input class="input" id="csm-company" name="company" autocomplete="organization" required></div>' +
          '<input type="text" name="hp" class="lead-hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
          '<div class="ts-widget" data-turnstile></div>' +
          '<p class="form-error-banner" data-form-error hidden>Something went wrong on our side. Please retry, or write to us directly at ' +
            '<a href="mailto:' + esc(IL().email || "") + '">' + esc(IL().email || "") + "</a>.</p>" +
          '<button class="btn btn--primary" type="submit" style="width:100%;justify-content:center">Get the PDF</button>' +
          '<p class="form-note">We use these details only to send this case study and relevant follow-up. No newsletters unless you ask.</p>' +
        "</form>" +
      "</div>";

    var form = bodyEl.querySelector("form");
    var prev = lastLead();
    if (prev) {
      ["name", "email", "company"].forEach(function (n) {
        var input = form.querySelector('[name="' + n + '"]');
        if (input && prev[n]) input.value = prev[n];
      });
    }
    ["name", "email", "company"].forEach(function (n) {
      var input = form.querySelector('[name="' + n + '"]');
      if (input) input.addEventListener("blur", function () { fieldError(form, n, validate(n, input.value)); });
    });

    var tsEl = form.querySelector("[data-turnstile]");
    if (tsEl && IL().turnstile) IL().turnstile.whenReady(function () { tsId = IL().turnstile.render(tsEl); });

    form.addEventListener("submit", function (e) { e.preventDefault(); onSubmit(s, form); });
    var first = form.querySelector("#csm-name");
    if (first && !first.value) first.focus();
  }

  function onSubmit(s, form) {
    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });

    var ok = true;
    ["name", "email", "company"].forEach(function (n) {
      if (!fieldError(form, n, validate(n, data[n] || ""))) ok = false;
    });
    if (!ok) {
      var bad = form.querySelector('[aria-invalid="true"]');
      if (bad) bad.focus();
      return;
    }

    var submitBtn = form.querySelector('[type="submit"]');
    var banner = form.querySelector("[data-form-error]");
    var idleLabel = submitBtn.textContent;
    var turnstile = IL().turnstile;

    function showError(msg) {
      if (banner) { banner.hidden = false; if (msg) banner.textContent = msg; }
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = idleLabel; }
    }

    var endpoint = IL().downloadEndpoint;
    if (!endpoint) { showError(); return; }

    var tsEl = form.querySelector("[data-turnstile]");
    if (tsEl && turnstile) {
      data.token = turnstile.response(tsId);
      if (!data.token) { showError("Please complete the verification check, then submit again."); return; }
    }

    data.assetId = s.id;
    data.consentTs = new Date().toISOString();

    if (banner) banner.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Preparing your download…";

    fetch(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (res) {
        if (!r.ok || !res.ok || !res.url) throw new Error(res.error || "bad status");
        rememberLead(data);
        showSuccess(s, data.name, res.url);
      });
    }).catch(function (err) {
      if (tsId !== null && turnstile) turnstile.reset(tsId);
      showError(err && err.message === "captcha_failed" ? "Verification failed — please try again." : undefined);
    });
  }

  function triggerDownload(href) {
    var a = document.createElement("a");
    a.href = href; a.target = "_blank"; a.rel = "noopener";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function showSuccess(s, name, href) {
    clearTurnstile();
    eyebrowEl.textContent = "Case study";
    titleEl.textContent = "Your case study is ready";
    var hi = name ? esc(String(name).trim().split(/\s+/)[0]) : "there";
    var browseHref = siteUrl("resources/case-studies/");

    var wrap = document.createElement("div");
    wrap.style.padding = "1.5rem";
    wrap.innerHTML =
      '<div class="form-success">' +
        svg('<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 5-5"/>') +
        "<h3>Thanks, " + hi + " &mdash; it&rsquo;s ready.</h3>" +
        "<p>" + esc(s.title) + "</p>" +
        '<div style="margin-top:1.5rem;display:flex;flex-direction:column;gap:0.75rem;align-items:center">' +
          '<a class="btn btn--primary" href="' + esc(href) + '" target="_blank" rel="noopener">Download the PDF</a>' +
          '<a class="text-link" href="' + esc(browseHref) + '">Browse all case studies</a>' +
        "</div>" +
        '<p class="form-note" style="margin-top:1rem">This link is single-use and expires in a couple of minutes — if it lapses, just request it again.</p>' +
      "</div>";
    bodyEl.innerHTML = "";
    bodyEl.appendChild(wrap);

    var dl = bodyEl.querySelector(".btn");
    if (dl) dl.focus();
    triggerDownload(href);
  }

  function open(trigger) {
    if (!built) build();
    lastFocused = trigger || document.activeElement;
    var id = trigger && trigger.getAttribute ? trigger.getAttribute("data-cs") : null;
    var s = study(id);
    if (!s) return;
    showForm(s);
    overlay.removeAttribute("hidden");
    void overlay.offsetWidth; // reflow so the transition runs
    overlay.classList.add("is-open");
    document.body.classList.add("bk-lock");
  }

  function close() {
    if (!overlay || overlay.hasAttribute("hidden")) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("hidden", "");
    document.body.classList.remove("bk-lock");
    clearTurnstile();
    bodyEl.innerHTML = ""; // drop any typed-but-unsubmitted name/email/company
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function onKey(e) {
    if (!overlay || overlay.hasAttribute("hidden")) return;
    if (e.key === "Escape") { close(); return; }
    if (e.key !== "Tab") return;
    var f = dialog.querySelectorAll('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  document.addEventListener("keydown", onKey);

  document.addEventListener("click", function (e) {
    if (!e.target || !e.target.closest) return;
    var t = e.target.closest("[data-cs]");
    if (!t) return;
    e.preventDefault();
    open(t);
  });
})();
