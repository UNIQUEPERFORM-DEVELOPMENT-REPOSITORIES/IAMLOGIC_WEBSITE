"use strict";
/* IamLogic lead-form endpoint.
   POST { name, email, company, phone, interest, message, intent, hp, token,
          website, itRevenuePercent }
   → verify Turnstile + honeypot → forward to the matching Zoho Web-to-Lead
   form → { ok:true }.

   Two distinct generated Zoho forms post through here, picked by `intent`:
   - default (demo/contact/pricing) → "Website lead capture": LEADCF1 is
     Product interest, mapped via INTEREST_MAP below.
   - intent === "partner" → "Website Partner lead capture": its own tokens
     (below, ZOHO_PARTNER), plus Website, LEADCF2 (% of revenue from selling
     IT solutions) and LEADCF3 (partner track — sent as-is, no mapping
     needed since the <select> option text already matches the Zoho
     picklist values verbatim).

   Tokens are copied from each form generated in Zoho CRM (Setup → Developer
   Space → Web Forms). They're meant to sit in public HTML/JS — that's how
   Web-to-Lead identifies which form is posting, not a secret credential.
   Regenerating either form in Zoho (e.g. to add/remove fields) changes its
   xnQsjsdp/xmIwtLD; re-copy them here if that happens. */
const ZOHO = {
  url: "https://crm.zoho.in/crm/WebToLeadForm",
  hidden: {
    xnQsjsdp: "ec19b1c9b14402c67a189547e94aca0a02f1448b344ed9d32e54797b5096adec",
    xmIwtLD: "95209f017f469b71e579c1d5a165394776dbb21c2a7a6e057bb1de7099f32817b11deca7cea43c4cfd3fdabdf9803f66",
    actionType: "TGVhZHM=",
    returnURL: "null",
    zc_gad: "",
    aG9uZXlwb3Q: "" // Zoho's own honeypot field — always posted empty
  }
};
const ZOHO_PARTNER = {
  url: "https://crm.zoho.in/crm/WebToLeadForm",
  hidden: {
    xnQsjsdp: "ed9efe8c2a74ac15f41d86b6701a368e5d8b9187ce2acfa7b43456d986fb6f69",
    xmIwtLD: "36234cfedcd6cb70bf1e18422b7680fc91d0923f430cf452bd9cd5c601bd21501114a5f0f54c6a2b72ac26936bda065d",
    actionType: "TGVhZHM=",
    returnURL: "null",
    zc_gad: "",
    aG9uZXlwb3Q: ""
  }
};

/* Our <select name="interest"> option text (demo, contact, pricing forms) →
   the exact picklist values the "Product interest" field (LEADCF1) expects
   in Zoho. Keep in sync if either side's option wording changes. Not used
   for the partner form — see LEADCF3 above. */
const INTEREST_MAP = {
  "Access Manager": "Access Manager",
  "IamLogic IGA": "Iamlogic IGA",
  "Both products": "Both",
  "IAM services & consulting": "IAM Services and Consulting"
};

function json(statusCode, obj) {
  return { statusCode: statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
}
async function verifyTurnstile(token) {
  if (!token) return { ok: false, codes: ["missing-token"] };
  if (!process.env.TURNSTILE_SECRET) return { ok: false, codes: ["missing-secret-env"] };
  var body = new URLSearchParams();
  body.append("secret", process.env.TURNSTILE_SECRET);
  body.append("response", token);
  try {
    var r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: body });
    var d = await r.json();
    return { ok: !!d.success, codes: d["error-codes"] || [] };
  } catch (e) { return { ok: false, codes: ["verify-fetch-failed"] }; }
}
async function forwardToZoho(zoho, fields) {
  var body = new URLSearchParams();
  Object.keys(zoho.hidden).forEach(function (k) { body.append(k, zoho.hidden[k]); });
  Object.keys(fields).forEach(function (k) { if (fields[k]) body.append(k, fields[k]); });
  await fetch(zoho.url, { method: "POST", body: body });
}

async function main(args) {
  if (String(args.__ow_method || "").toLowerCase() !== "post") return json(405, { ok: false, error: "method_not_allowed" });
  if (args.hp) return json(400, { ok: false, error: "spam_detected" });

  var v = await verifyTurnstile(args.token);
  if (!v.ok) return json(403, { ok: false, error: "captcha_failed", cf: v.codes });

  var name = String(args.name || "").trim();
  var email = String(args.email || "").trim();
  var company = String(args.company || "").trim();
  if (!name || !email || !company) return json(400, { ok: false, error: "missing_fields" });

  var intent = String(args.intent || "").trim();
  var interest = String(args.interest || "").trim();
  var message = String(args.message || "").trim();
  var description = ["Form: " + (intent || "unknown"), message].filter(Boolean).join("\n");
  var isPartner = intent === "partner";

  var fields = {
    "Last Name": name,
    "Email": email,
    "Company": company,
    "Phone": String(args.phone || "").trim(),
    "Description": description,
    "Lead Source": "Website"
  };
  if (isPartner) {
    fields["Website"] = String(args.website || "").trim();
    fields["LEADCF2"] = String(args.itRevenuePercent || "").trim();
    fields["LEADCF3"] = interest;
  } else {
    fields["LEADCF1"] = INTEREST_MAP[interest] || "";
  }

  try {
    await forwardToZoho(isPartner ? ZOHO_PARTNER : ZOHO, fields);
  } catch (e) { return json(502, { ok: false, error: "crm_unavailable" }); }

  return json(200, { ok: true });
}
exports.main = main;
