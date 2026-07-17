"use strict";
/* IamLogic lead-form endpoint.
   POST { name, email, company, phone, interest, message, intent, hp, token }
   → verify Turnstile + honeypot → forward to Zoho Web-to-Lead → { ok:true }.

   Tokens below are copied from the Web-to-Lead form generated in Zoho CRM
   (Setup → Developer Space → Web Forms → "Website lead capture", module
   Leads). They're meant to sit in public HTML/JS — that's how Web-to-Lead
   identifies which form is posting, not a secret credential. Regenerating
   the form in Zoho (e.g. to add/remove fields) will change these values;
   re-copy them here if that happens. */
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

/* Our <select name="interest"> option text (demo, contact, pricing forms) →
   the exact picklist values the "Product interest" field (LEADCF1) expects
   in Zoho. Keep in sync if either side's option wording changes. */
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
async function forwardToZoho(fields) {
  var body = new URLSearchParams();
  Object.keys(ZOHO.hidden).forEach(function (k) { body.append(k, ZOHO.hidden[k]); });
  Object.keys(fields).forEach(function (k) { if (fields[k]) body.append(k, fields[k]); });
  await fetch(ZOHO.url, { method: "POST", body: body });
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

  try {
    await forwardToZoho({
      "Last Name": name,
      "Email": email,
      "Company": company,
      "Phone": String(args.phone || "").trim(),
      "LEADCF1": INTEREST_MAP[interest] || "",
      "Description": description,
      "Lead Source": "Website"
    });
  } catch (e) { return json(502, { ok: false, error: "crm_unavailable" }); }

  return json(200, { ok: true });
}
exports.main = main;
