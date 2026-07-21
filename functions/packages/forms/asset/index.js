"use strict";
/* IamLogic ungated asset download — redirects straight to a short-lived
   presigned Spaces URL. GET /api/forms/asset?id=<id> -> 302 to the file.

   Unlike functions/packages/forms/download (case-study PDFs), this endpoint
   has no Turnstile check and no Zoho lead capture — these are plain
   marketing collateral (whitepaper/brochures/deck) meant to be a one-click
   download, not a gated asset. It reuses the same Spaces credentials
   (SPACES_KEY/SPACES_SECRET/SPACES_BUCKET/SPACES_REGION/SPACES_ENDPOINT)
   already configured as runtime env vars on this functions component. */
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

/* id (used in the ?id= query string) -> the Spaces object key. Upload each
   file to SPACES_BUCKET under the exact key below before going live. */
const ASSETS = {
  "dpdp-2025-whitepaper": "IamLogic-dpdp-act-2025-compliance-whitepaper.pdf",
  "am-brochure": "IamLogic-access-manager-brochure.pdf",
  "iga-brochure": "IamLogic-iga-brochure.pdf",
  "iga-demo-deck": "IamLogic-iga-demo-presentation.pptx"
};

function json(statusCode, obj) {
  return { statusCode: statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
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
  if (String(args.__ow_method || "").toLowerCase() !== "get") return json(405, { ok: false, error: "method_not_allowed" });

  var key = ASSETS[args.id];
  if (!key) return json(404, { ok: false, error: "unknown_asset" });

  try {
    var url = await presign(key);
    return { statusCode: 302, headers: { Location: url } };
  } catch (e) { return json(500, { ok: false, error: "signing_failed" }); }
}
exports.main = main;
