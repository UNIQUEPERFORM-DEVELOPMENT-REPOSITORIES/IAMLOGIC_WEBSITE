/* IamLogic — "Book a call" modal.
   Loads the published Microsoft Bookings scheduler in an iframe. Opens for
   any link to #book-a-call, or any element with [data-book]. With a single
   entry in BOOKINGS, every trigger opens that scheduler directly — no
   intermediate "choose a type" step. (Add a second entry back to BOOKINGS
   and the chooser step reappears automatically for generic triggers.) */
(function () {
  "use strict";

  /* ── CONFIG ──────────────────────────────────────────────────────────────
     Add / edit call types here. Each: id, title, desc, icon (inner SVG
     markup), and the published Microsoft Bookings URL. If a `url` still
     contains "PLACEHOLDER", that option shows a friendly notice instead of a
     broken iframe. */
  var BOOKINGS = [
    {
      id: "demo",
      title: "Choose a time that works for you",
      desc: "A focused conversation about your identity and access needs — scoped to what matters most for your team.",
      icon: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h6M9 16l2 2 4-4"/>',
      url: "https://outlook.office.com/book/IamLogicDemo@iamlogic.com/?ismsaljsauthenabled"
    }
  ];
  var CONTACT_EMAIL = "info@iamlogic.com";
  /* ─────────────────────────────────────────────────────────────────────── */

  var overlay, dialog, titleEl, bodyEl, lastFocused, built = false;

  function svg(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
           'stroke-linecap="round" stroke-linejoin="round">' + inner + "</svg>";
  }

  function buildModal() {
    overlay = document.createElement("div");
    overlay.className = "bk-overlay";
    overlay.setAttribute("hidden", "");
    overlay.innerHTML =
      '<div class="bk-dialog" role="dialog" aria-modal="true" aria-labelledby="bk-title">' +
        '<div class="bk-head">' +
          '<div>' +
            '<p class="bk-eyebrow">Book a call</p>' +
            '<h2 id="bk-title" class="h3" style="font-size:1.25rem">Choose a time</h2>' +
          '</div>' +
          '<button class="bk-close" type="button" aria-label="Close booking dialog">&times;</button>' +
        '</div>' +
        '<div class="bk-body"></div>' +
      "</div>";
    document.body.appendChild(overlay);
    dialog = overlay.querySelector(".bk-dialog");
    titleEl = overlay.querySelector("#bk-title");
    bodyEl = overlay.querySelector(".bk-body");
    overlay.querySelector(".bk-close").addEventListener("click", close);
    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });
    built = true;
  }

  function showChooser() {
    titleEl.textContent = "Choose a call type";
    var opts = BOOKINGS.map(function (b) {
      return '<button class="bk-option" type="button" data-id="' + b.id + '">' +
               '<span class="bk-opt-ico">' + svg(b.icon) + "</span>" +
               '<span class="bk-opt-body"><b>' + b.title + "</b><span>" + b.desc + "</span></span>" +
               '<span class="bk-opt-arrow">' + svg('<path d="M5 12h14M13 6l6 6-6 6"/>') + "</span>" +
             "</button>";
    }).join("");
    bodyEl.innerHTML =
      '<div class="bk-choose">' +
        '<p class="bk-choose-intro">Pick what you&rsquo;d like to discuss and we&rsquo;ll open the right scheduler.</p>' +
        opts +
        '<p class="bk-choose-foot">Something else? <a href="mailto:' + CONTACT_EMAIL +
          '?subject=Call%20request">Email us</a> and we&rsquo;ll help.</p>' +
      "</div>";
    bodyEl.querySelectorAll(".bk-option").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var opt = BOOKINGS.filter(function (b) { return b.id === btn.getAttribute("data-id"); })[0];
        if (opt) showBooking(opt);
      });
    });
    var first = bodyEl.querySelector(".bk-option");
    if (first) first.focus();
  }

  function showBooking(opt) {
    titleEl.textContent = opt.title;
    /* Only offer a way back to the chooser if there's more than one option
       to choose from — with a single booking type there's nothing to return to. */
    var back = BOOKINGS.length > 1
      ? '<button class="bk-back" type="button">' +
          svg('<path d="M19 12H5M11 6l-6 6 6 6"/>') + "All call types</button>"
      : "";

    if (opt.url.indexOf("PLACEHOLDER") !== -1) {
      bodyEl.innerHTML = back +
        '<div class="bk-placeholder">' +
          '<div class="bk-ph-ico" aria-hidden="true">' +
            svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/>') +
          "</div>" +
          "<h3>Scheduling is on its way</h3>" +
          "<p>This scheduler will appear here once it&rsquo;s published. In the meantime, email us and we&rsquo;ll get you booked.</p>" +
          '<a class="btn btn--primary" href="mailto:' + CONTACT_EMAIL + "?subject=" +
            encodeURIComponent(opt.title) + '">Email us to book</a>' +
        "</div>";
    } else {
      bodyEl.innerHTML = back +
        '<div class="bk-frame-wrap">' +
          '<div class="bk-loading"><span class="bk-spinner"></span>Loading scheduler&hellip;</div>' +
          '<iframe class="bk-frame" title="' + opt.title + ' — Microsoft Bookings" src="' +
            opt.url + '" scrolling="yes"></iframe>' +
        "</div>";
      var frame = bodyEl.querySelector(".bk-frame");
      var clear = function () {
        var l = bodyEl.querySelector(".bk-loading");
        if (l && l.parentNode) l.parentNode.removeChild(l);
      };
      frame.addEventListener("load", clear);
      setTimeout(clear, 8000); // fallback if load fires late (MS auth redirects)
    }
    var b = bodyEl.querySelector(".bk-back");
    if (b) { b.addEventListener("click", showChooser); b.focus(); }
    else { var dl = bodyEl.querySelector(".btn, .bk-frame"); if (dl) dl.focus(); }
  }

  function open(trigger) {
    if (!built) buildModal();
    lastFocused = trigger || document.activeElement;
    var pre = trigger && trigger.getAttribute ? trigger.getAttribute("data-book") : null;
    var direct = pre ? BOOKINGS.filter(function (b) { return b.id === pre; })[0] : null;
    if (!direct && BOOKINGS.length === 1) direct = BOOKINGS[0];
    if (direct) showBooking(direct); else showChooser();
    overlay.removeAttribute("hidden");
    void overlay.offsetWidth; // reflow so the transition runs
    overlay.classList.add("is-open");
    document.body.classList.add("bk-lock");
  }

  function close() {
    if (!overlay || overlay.hasAttribute("hidden")) return;
    /* Hide immediately — deterministic, no transitionend dependency. Removing
       .is-open already flips the overlay to display:none instantly (see CSS),
       so there is no close-fade to wait for, and waiting on transitionend
       risks a leaked listener firing on a later open and blocking the next
       close. */
    overlay.classList.remove("is-open");
    overlay.setAttribute("hidden", "");
    document.body.classList.remove("bk-lock");
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function onKey(e) {
    if (!overlay || overlay.hasAttribute("hidden")) return;
    if (e.key === "Escape") { close(); return; }
    if (e.key !== "Tab") return;
    var f = dialog.querySelectorAll('a[href], button:not([disabled]), iframe, input, [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  document.addEventListener("keydown", onKey);

  /* Open for any booking CTA (links to #book-a-call, or [data-book]) */
  document.addEventListener("click", function (e) {
    if (!e.target || !e.target.closest) return;
    var t = e.target.closest('a[href*="#book-a-call"], [data-book]');
    if (!t) return;
    e.preventDefault();
    open(t);
  });
})();
