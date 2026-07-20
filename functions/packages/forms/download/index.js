"use strict";
/* IamLogic gated case-study download endpoint.
   POST { assetId, name, email, company, consentTs, hp, token }
   → verify Turnstile + honeypot → forward lead to Zoho → presign a short-lived
   Spaces URL for the requested asset → { ok:true, url }.

   Its own dedicated Zoho Web-to-Lead form — "Website casestudy PDF download
   lead capture" (Zoho CRM → Setup → Developer Space → Web Forms) — separate
   from functions/packages/forms/lead's "Website lead capture" form, so leads
   from case-study downloads are distinguishable in Zoho from demo/contact/
   pricing leads. If that form is ever regenerated (fields added/removed),
   its tokens change — re-copy xnQsjsdp/xmIwtLD from the newly generated
   embed HTML into ZOHO.hidden below. */
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const ZOHO = {
  url: "https://crm.zoho.in/crm/WebToLeadForm",
  hidden: {
    xnQsjsdp: "b66ddbf0e548fdd4cab258981e9914753cc885a3114b3b93eb708ef0fcfdf2c6",
    xmIwtLD: "24eb77ccfd66d4bf5b3845337ed73a3290a289409878911db21fbaa0a75d4c27c96e763b696e88ef532c5f5266515ace",
    actionType: "TGVhZHM=",
    returnURL: "null",
    zc_gad: "",
    aG9uZXlwb3Q: "" // Zoho's own honeypot field — always posted empty
  }
};

/* Whitelist — the ONLY files this endpoint will ever sign. assetId → the
   Spaces object key and the display title used in the CRM lead. Upload each
   case study's real PDF to the Spaces bucket (SPACES_BUCKET) under the exact
   key below before going live. */
const ASSETS = {
  "pam-sso-mfa": {
    key: "IamLogic-Case-Study-SSO-MFA-Privileged-Access-Protection.pdf",
    title: "SSO/MFA protection for on-premises privileged access"
  },
  "access-certification": {
    key: "IamLogic-Case-Study-Access-Certification-Automation.pdf",
    title: "Automating access certification at enterprise scale"
  },
  "jml-automation": {
    key: "IamLogic-Case-Study-JML-Identity-Lifecycle-Automation.pdf",
    title: "End-to-end identity lifecycle automation (Joiner–Mover–Leaver)"
  }
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
  try { await fetch(ZOHO.url, { method: "POST", body: body }); }
  catch (e) { /* don't block the download on a CRM hiccup */ }
}
async function presign(key) {
  var s3 = new S3Client({
    region: process.env.SPACES_REGION,
    endpoint: process.env.SPACES_ENDPOINT,
    credentials: { accessKeyId: process.env.SPACES_KEY, secretAccessKey: process.env.SPACES_SECRET }
  });
  var cmd = new GetObjectCommand({
    Bucket: process.env.SPACES_BUCKET,
    Key: key,
    ResponseContentDisposition: 'attachment; filename="' + key + '"'
  });
  return getSignedUrl(s3, cmd, { expiresIn: 120 });
}

async function main(args) {
  if (String(args.__ow_method || "").toLowerCase() !== "post") return json(405, { ok: false, error: "method_not_allowed" });
  if (args.hp) return json(400, { ok: false, error: "spam_detected" });

  var v = await verifyTurnstile(args.token);
  if (!v.ok) return json(403, { ok: false, error: "captcha_failed", cf: v.codes });

  var asset = ASSETS[args.assetId];
  if (!asset) return json(404, { ok: false, error: "unknown_asset" });

  var name = String(args.name || "").trim();
  var email = String(args.email || "").trim();
  var company = String(args.company || "").trim();
  if (!name || !email || !company) return json(400, { ok: false, error: "missing_fields" });

  await forwardToZoho({
    "Last Name": name,
    "Email": email,
    "Company": company,
    "Description": "Form: case-study-download\nCase study: " + asset.title +
      "\nConsent: " + (args.consentTs || new Date().toISOString()),
    "Lead Source": "Website"
  });

  var url;
  try { url = await presign(asset.key); }
  catch (e) { return json(500, { ok: false, error: "signing_failed" }); }

  return json(200, { ok: true, url: url });
}
exports.main = main;
