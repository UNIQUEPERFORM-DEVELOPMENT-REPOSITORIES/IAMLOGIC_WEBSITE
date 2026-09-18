#!/usr/bin/env node
/*
 * Re-stamp the service-worker precache revisions for every reckoner deployment.
 *
 *   node reckoner/tools/sw-revisions.js            # check only, exits 1 if stale
 *   node reckoner/tools/sw-revisions.js --apply    # rewrite sw.js in place
 *
 * WHY THIS EXISTS
 * Each reckoner deployment ships a Workbox service worker that precaches ~21
 * files. Every entry carries a `revision` hash. A returning visitor only
 * re-downloads a file when that hash changes -- the file changing is NOT
 * enough, because the filename stays the same. So if you edit a bundle and
 * leave sw.js alone, your change reaches nobody who has visited before, and
 * they have to clear site data by hand to see it.
 *
 * Run this after ANY edit under reckoner/, before committing. It is plain
 * Node with no dependencies, and it refuses to write if anything looks wrong.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const DIRS = ['', 'cloud', 'on-prem'];
const APPLY = process.argv.includes('--apply');
const ENTRY = /\{url:"([^"]+)",revision:(null|"[0-9a-f]{32}")\}/g;

const md5 = p => crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex');

let problems = 0;
let stale = 0;

for (const d of DIRS) {
  const dir = d ? path.join(ROOT, d) : ROOT;
  const swPath = path.join(dir, 'sw.js');
  if (!fs.existsSync(swPath)) { console.log(`(no sw.js in ${d || '<root>'})`); continue; }
  let sw = fs.readFileSync(swPath, 'utf8');

  const entries = [...sw.matchAll(ENTRY)];
  console.log(`\n=== ${d || '<root>'} : ${entries.length} precache entries ===`);

  let changed = 0, kept = 0;
  for (const m of entries) {
    const [full, url, rev] = m;
    const file = path.join(dir, url.replace(/\//g, path.sep));
    if (!fs.existsSync(file)) { console.log(`  [MISSING FILE] ${url}`); problems++; continue; }
    const real = md5(file);
    const cur = rev === 'null' ? null : rev.slice(1, -1);
    if (cur === real) { kept++; continue; }
    // Every entry is re-stamped, index.html included. index.html is the entry
    // point: if its revision goes stale the whole app keeps loading from cache.
    sw = sw.split(full).join(`{url:"${url}",revision:"${real}"}`);
    console.log(`  ${cur === null ? 'set ' : 'upd '} ${url.padEnd(46)} ${cur === null ? '' : cur + ' -> '}${real}`);
    changed++; stale++;
  }
  console.log(`  ${changed} stale, ${kept} already correct`);

  // safety: entry count preserved, no nulls left, still parses
  const after = [...sw.matchAll(ENTRY)];
  if (after.length !== entries.length) { console.error('  ABORT: entry count changed'); problems++; continue; }
  if (/revision:null/.test(sw)) { console.error('  ABORT: a revision:null survived'); problems++; continue; }
  try { new Function(sw); } catch (e) { console.error('  ABORT: sw.js no longer parses: ' + e.message); problems++; continue; }

  if (APPLY && changed) { fs.writeFileSync(swPath, sw, 'utf8'); console.log('  written'); }
  else if (APPLY) console.log('  nothing to write');
  else if (changed) console.log('  (check only - pass --apply to write)');
}

if (problems) { console.log(`\n${problems} PROBLEM(S) - nothing safe to write`); process.exit(1); }
if (!APPLY && stale) { console.log(`\n${stale} STALE REVISION(S) - run with --apply`); process.exit(1); }
console.log(APPLY ? '\nall revisions up to date' : '\nall revisions up to date');
