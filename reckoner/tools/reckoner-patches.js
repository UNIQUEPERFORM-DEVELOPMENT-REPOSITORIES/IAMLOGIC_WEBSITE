#!/usr/bin/env node
/*
 * Every change this repo makes to the compiled reckoner bundles, as data.
 *
 *   node reckoner/tools/reckoner-patches.js           # which patches are present?
 *   node reckoner/tools/reckoner-patches.js --apply   # (re-)apply them to all three copies
 *
 * READ THIS BEFORE YOU TOUCH THE RECKONER
 * The reckoner is a compiled Vite/React app. Its SOURCE IS NOT IN THIS REPO --
 * only the built output under reckoner/, reckoner/cloud/ and reckoner/on-prem/.
 * So everything below is a surgical string edit against minified JavaScript.
 *
 * Whenever someone rebuilds the reckoner from the real source tree and drops the
 * new bundle in, EVERY patch below is wiped. That has already happened once
 * (origin/main b3b829f). The recovery procedure is:
 *
 *   1. take the new bundle as-is
 *   2. node reckoner/tools/reckoner-patches.js --apply
 *   3. node reckoner/tools/sw-revisions.js --apply
 *   4. re-check in a browser
 *
 * Each edit asserts it matches EXACTLY ONCE. If an anchor stops matching, the
 * upstream code moved and that patch needs re-deriving by hand -- the script
 * refuses to write rather than guess. See reckoner/DEVELOPERS.md.
 *
 * The long-term fix is to move these into the real source tree and delete this
 * file. Until then, this is the only record of what the built output contains
 * that a rebuild would not.
 */
const D = '·';        // ·
const MUL = '×';      // ×
const DASH = '—';     // —
const DIV = '÷';      // ÷

const SRCN = 'CPU-Optimized dedicated vCPU. Price from the DigitalOcean Droplet pricing page, 18 Sep 2026. Selected by the linear capacity model above the tested range.';
const dr = (id, v, r, disk, tb, usd) =>
  `{id:"${id}",family:"cpu-optimized",label:"CPU-Optimized ${D} ${v} vCPU / ${r} GB",vcpu:${v},ramGb:${r},diskGb:${disk},transferTb:${tb},monthlyUsd:${usd},verified:!0,note:"${SRCN}"}`;
const NEWDROPS = [
  dr('c-2c-4g', 2, 4, 25, 4, 55),
  dr('c-4c-8g', 4, 8, 50, 5, 109),
  dr('c-8c-16g', 8, 16, 100, 6, 218),
  dr('c-16c-32g', 16, 32, 200, 7, 437),
  dr('c-32c-64g', 32, 64, 400, 9, 874),
  dr('c-48c-96g', 48, 96, 600, 11, 1310),
].join(',');

const DOCS = 'Connection limit and price from the DigitalOcean Managed MySQL configuration reference, 18 Sep 2026.';
const CONSOLE_NOTE = 'Read directly from the DigitalOcean Managed MySQL console on 18 Sep 2026. These larger plans are not published on the public pricing page or in the limits documentation, so the console is the only source.';
const mp = (id, fam, v, r, st, conn, usd, note) =>
  `{id:"${id}",label:"Managed MySQL ${D} ${v} vCPU / ${r} GB / ${st} GiB",vcpu:${v},ramGb:${r},storageGib:${st},connectionLimit:${conn},monthlyUsd:${usd},family:"${fam}",verified:!0,note:"${note}"}`;

const ENTRY = mp('mysql-1c-1g-10g', 'basic', 1, 1, 10, 75, 15.15, 'Basic shared CPU, Regular SSD. ' + DOCS);
const HICAP = [
  mp('mysql-hc-4c-32g', 'high-capacity', 4, 32, 600, 2175, 431, CONSOLE_NOTE),
  mp('mysql-hc-8c-64g', 'high-capacity', 8, 64, 1200, 4425, 868, CONSOLE_NOTE),
  mp('mysql-hc-16c-128g', 'high-capacity', 16, 128, 2400, 9601, 1734, CONSOLE_NOTE),
  mp('mysql-hc-24c-192g', 'high-capacity', 24, 192, 3600, 14401, 2602, CONSOLE_NOTE),
  mp('mysql-hc-32c-256g', 'high-capacity', 32, 256, 4800, 19201, 3458, CONSOLE_NOTE),
].join(',');

const STORAGE = 'mysqlStorage:{perGibMonthlyUsd:.215,advancedPerGibMonthlyUsd:.115,verified:!0,note:"Additional storage beyond a plan' + "'" + 's included minimum, Standard Edition, confirmed from DigitalOcean MySQL pricing documentation on 18 Sep 2026. Advanced Edition is $0.115/GiB/month."},';

// Linear model from the validated 100-VU benchmark. Per concurrent user: AM 0.04 vCPU / 0.08 GB,
// IGA half, AM+IGA double, +25% for platform overhead / HA / burst. Node choice prefers a bigger
// machine over more of them, because load testing showed extra nodes do not add throughput.
// On-premise quotes hardware only, never a price, so it is not limited to a
// provider's catalogue: the spec is emitted directly. Node count starts at the
// 3 managers the on-prem topology was tested with and only grows once one node
// would have to exceed a practical 2-socket server (64 vCPU / 128 GB).
const SIZEX = 'function SIZEX(peak,prod,l,base,op){try{'
  + 'const PU=prod==="iga"?{c:.02,r:.04}:prod==="am-iga"?{c:.08,r:.16}:{c:.04,r:.08},'
  + 'mv=PU.c*100,mr=PU.r*100,'
  + 'cpu=Math.max(peak*PU.c*1.25,base?base.vcpu*2:0),ram=Math.max(peak*PU.r*1.25,base?base.ramGb*2:0),'
  + 'reps=Math.ceil(peak/100)*3,conns=Math.ceil(12.5*reps+15);'
  // ---- on-premise: synthesise the required spec, no prices ----
  + 'if(op){const VS=[2,4,6,8,12,16,20,24,32,40,48,56,64],RS=[4,8,12,16,24,32,40,48,64,80,96,128,160,192,256,384,512],'
  + 'up=(x,S)=>S.find(v=>v>=x)||S[S.length-1],'
  + 'mk=(v,r)=>({id:"onprem-"+v+"c-"+r+"g",family:"on-prem",label:v+" vCPU / "+r+" GB",vcpu:v,ramGb:r,'
  + 'diskGb:Math.max(200,r*5),transferTb:0,monthlyUsd:0,verified:!1}),'
  + 'nodes=Math.max(3,Math.ceil(cpu/64),Math.ceil(ram/128)),'
  + 'pv=Math.max(up(Math.ceil(cpu/nodes),VS),mv),pr=Math.max(up(Math.ceil(ram/nodes),RS),mr),'
  + 'dr=Math.max(4,up(Math.ceil(conns/100)+1,RS)),dv=Math.max(2,up(Math.ceil(dr/8),VS));'
  + 'return{cpu,ram,nodes,droplet:mk(pv,pr),replicas:reps,connections:conns,db:null,dbNode:mk(dv,dr)}}'
  // ---- cloud: choose from the real catalogue ----
  + 'const FAM=x=>x.family==="cpu-optimized"||x.family==="basic-regular",'
  + 'pool=(l.droplets||[]).filter(x=>FAM(x)&&x.vcpu>=mv&&x.ramGb>=mr),'
  + 'cand=(pool.length?pool:(l.droplets||[]).filter(FAM)).map(x=>{'
  + 'const n=Math.max(2,Math.ceil(cpu/x.vcpu),Math.ceil(ram/x.ramGb));return{d:x,n,cost:n*x.monthlyUsd}});'
  + 'if(!cand.length)return null;'
  + 'const mn=Math.min.apply(null,cand.map(x=>x.n)),cap=Math.ceil(mn*1.5),'
  + 'w=cand.filter(x=>x.n<=cap).sort((x,y)=>x.cost-y.cost||x.n-y.n)[0];'
  + 'if(!w)return null;'
  // Size the database for 1.4x the connection demand. Picking the cheapest plan
  // that merely clears the count left quotes riding at 96-98% of the limit, where
  // one extra replica, a rolling restart or a stuck connection means MySQL starts
  // refusing logins outright rather than just slowing down.
  // Selecting on the connection limit alone let the catalogue pick a WEAKER
  // machine as load rose: the 4 vCPU / 32 GB plan carries more connections than
  // the cheaper 6 vCPU / 16 GB one, so between roughly 3,100 and 4,100 users the
  // database dropped from 6 vCPU to 4 while the price nearly doubled. Walk the
  // plans by connection limit keeping a running maximum of vCPU and RAM, and
  // require the chosen plan to meet that floor as well - the same "capacity on
  // every dimension, cheapest that fits" rule the cluster nodes use.
  + 'const need=Math.ceil(conns*1.4),MM=[...(l.managedMysql||[])],'
  + 'fl=(()=>{let v=0,r=0;for(const p of [...MM].sort((x,y)=>x.connectionLimit-y.connectionLimit)){'
  + 'v=Math.max(v,p.vcpu);r=Math.max(r,p.ramGb);if(p.connectionLimit>=need)break}return{v,r}})(),'
  + 'db=MM.sort((x,y)=>x.monthlyUsd-y.monthlyUsd).find(x=>x.connectionLimit>=need&&x.vcpu>=fl.v&&x.ramGb>=fl.r)||null;'
  + 'return{cpu,ram,nodes:w.n,droplet:w.d,replicas:reps,connections:conns,db,dbNode:null}}catch(e){return null}}';

// ---------------------------------------------------------------------------
// Input order and flow.
//
// Total accounts is the first field and drives the suggested peak concurrent
// figure, as it always did. Peak stays editable and uncapped, and the sizing
// and cost follow whatever it ends up as - that part is the fix, and it works
// regardless of which of the two fields the visitor typed in.
// ---------------------------------------------------------------------------

// Walk a balanced JS expression starting at `i`, respecting strings and
// template literals, and return the index just past it.
function endOfExpr(s, i) {
  let d = 0, q = null, tpl = false;
  for (let k = i; k < s.length; k++) {
    const c = s[k];
    if (q) { if (c === '\\') k++; else if (c === q) q = null; continue; }
    if (tpl) { if (c === '\\') k++; else if (c === '`') tpl = false; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '`') { tpl = true; continue; }
    if (c === '(' || c === '[' || c === '{') d++;
    else if (c === ')' || c === ']' || c === '}') { d--; if (d === 0) return k + 1; }
  }
  throw new Error('unbalanced expression');
}

// Move the "Total user accounts" group above "Peak concurrent users".
// Expressed as a transform rather than a literal because the two blocks are
// several thousand characters of minified JSX and their contents are edited by
// other patches in this file.
const GRP = 'o.jsxs("div",{className:"rk-group",children:[';
const groupAt = (t, marker) => {
  let i = -1;
  while ((i = t.indexOf(GRP, i + 1)) >= 0) {
    const end = endOfExpr(t, i + 'o.jsxs'.length);
    if (t.slice(i, end).includes(marker)) return { start: i, end };
  }
  throw new Error('group containing ' + marker + ' not found');
};

function reorderAccountsAbovePeak(t) {
  const peak = groupAt(t, 'htmlFor:"rk-vu"');
  const acct = groupAt(t, 'htmlFor:"rk-total-users"');
  if (acct.start < peak.start) return { text: t, applied: false };   // already in order
  // peak , <anything between> , accounts   ->   accounts , peak , <between>
  const between = t.slice(peak.end, acct.start);          // includes the separating commas
  if (!/^,.*,$/s.test(between)) throw new Error('unexpected text between the two groups');
  const middle = between.slice(1, -1);
  const rebuilt = t.slice(acct.start, acct.end) + ',' + t.slice(peak.start, peak.end) + ',' + middle;
  return { text: t.slice(0, peak.start) + rebuilt + t.slice(acct.end), applied: true };
}

exports.INDEX = [
  // --- input order and flow ---
  ['put Total user accounts above Peak concurrent users', reorderAccountsAbovePeak],
  ['accounts help text says it feeds the peak figure below',
    'children:"Everyone with an account, not just those signing in. For licensing ' + DASH + ' it does not change the sizing."',
    'children:"Everyone with an account, not just those signing in. Used to suggest the peak concurrent figure below."'],
  ['peak help text says the sizing follows it',
    'children:["Logins at the same moment, not the daily total. Load-tested up to"," ",It," users ' + DASH + ' values above that scale the ",It,"-user configuration proportionally (extrapolated, not measured)."]}',
    'children:["Logins at the same moment, not the daily total. Suggested from your total accounts ' + DASH + ' change it if you know the real figure, because the sizing and cost follow this number. Load-tested up to"," ",It," users."]}'],
  ['remove the cap on the peak input',
    'type:"number",min:1,max:Or,value:s??e.peakConcurrent',
    'type:"number",min:1,value:s??e.peakConcurrent'],
  ['a typed peak is not capped either',
    'l("peakConcurrent",Number.isFinite(k)?Math.max(1,Math.min(Or,k)):e.peakConcurrent),i(null)',
    'l("peakConcurrent",Number.isFinite(k)?Math.max(1,k):e.peakConcurrent),i(null)'],

  // --- managed MySQL catalogue ---
  ['mysql 4 GB plan: connection limit 225 -> 400',
    'connectionLimit:225,monthlyUsd:60.9', 'connectionLimit:400,monthlyUsd:60.9'],
  ['mysql 8 GB plan: connection limit 525 -> 800',
    'connectionLimit:525,monthlyUsd:122.1', 'connectionLimit:800,monthlyUsd:122.1'],
  ['mysql 16 GB plan: connection limit 1050 -> 1600',
    'connectionLimit:1050,monthlyUsd:244.35', 'connectionLimit:1600,monthlyUsd:244.35'],
  ['add the 1 GiB managed MySQL entry plan',
    'Mp=[{id:"mysql-1c-2g-30g"', 'Mp=[' + ENTRY + ',{id:"mysql-1c-2g-30g"'],
  ['add the five console-verified high-capacity MySQL plans',
    'pricing page."}],_p={id:"do-lb"', 'pricing page."},' + HICAP + '],_p={id:"do-lb"'],
  ['add the additional-storage rate',
    'Ep={backupsWeeklyPct:.2', 'Ep={' + STORAGE + 'backupsWeeklyPct:.2'],
  ['add the CPU-Optimized worker droplets inside the droplet array',
    '}],Mp=[{id:"mysql-1c-1g-10g"', '},' + NEWDROPS + '],Mp=[{id:"mysql-1c-1g-10g"'],
  ['add the linear sizing function',
    'function Cl(e,t,n,r,l,s,i){', SIZEX + 'function Cl(e,t,n,r,l,s,i){'],
  ['compute the sizing once per configuration',
    'const a=[],u=e.components,d=nn(l,u.appDropletId),y=3,g=u.appCount*t,',
    'const a=[],u=e.components,d=nn(l,u.appDropletId),y=3,g=u.appCount*t,SZ=(r&&n>100&&(s.delivery==="on-prem"?e.topology==="swarm-ha":e.topology==="kubernetes"))?SIZEX(n,s.product,l,d,s.delivery==="on-prem"):null,'],
  ['node count comes from the linear model',
    'v=p?u.appCount:r?Math.min(g,y):g,', 'v=SZ?SZ.nodes:p?u.appCount:r?Math.min(g,y):g,'],
  ['machine choice comes from the linear model',
    'N=(w=>{if(!w||!r||t<=1||!(p||g>y))return w;', 'N=SZ?SZ.droplet:(w=>{if(!w||!r||t<=1||!(p||g>y))return w;'],
  ['label the line item when the linear model drove it',
    '${B&&r&&t>1?" ' + D + ' spec upgrade estimate":""}',
    '${SZ?" ' + D + ' linear sizing estimate":B&&r&&t>1?" ' + D + ' spec upgrade estimate":""}'],
  ['on-premise load balancer is a spec, not a DigitalOcean machine name',
    'detail:`${(w==null?void 0:w.label)??"Premium Intel ' + D + ' 2 vCPU / 2 GB"} ' + D + ' ${c} ${U?"HAProxy":"load balancer"} nodes',
    'detail:`${U?((w==null?void 0:w.label)??"Premium Intel ' + D + ' 2 vCPU / 2 GB"):`${(w==null?void 0:w.vcpu)??2} vCPU / ${(w==null?void 0:w.ramGb)??2} GB`} ' + D + ' ${c} ${U?"HAProxy":"load balancer"} nodes'],
  ['on-premise node spec has no transfer allowance, so do not print one',
    '${b.diskGb} GB NVMe ' + D + ' ${b.transferTb} TB transfer',
    '${b.diskGb} GB NVMe${b.transferTb?` ' + D + ' ${b.transferTb} TB transfer`:""}'],
  ['the self-hosted database node follows the linear model too',
    'const c=(()=>{if(!r||t<=1)return w;const b=l.droplets.filter($=>$.family===w.family).sort(($,se)=>$.monthlyUsd-se.monthlyUsd),A=b.findIndex($=>$.id===w.id);return b[A+1]??w})(),k=c.monthlyUsd,U=he(k);m+=U;const P=r&&t>1?" ' + D + ' spec upgrade estimate":"";',
    'const c=(SZ&&SZ.dbNode)?SZ.dbNode:(()=>{if(!r||t<=1)return w;const b=l.droplets.filter($=>$.family===w.family).sort(($,se)=>$.monthlyUsd-se.monthlyUsd),A=b.findIndex($=>$.id===w.id);return b[A+1]??w})(),k=c.monthlyUsd,U=he(k);m+=U;const P=SZ&&SZ.dbNode?" ' + D + ' linear sizing estimate":r&&t>1?" ' + D + ' spec upgrade estimate":"";'],
  ['database line says what it was sized for, not just "spec upgrade"',
    'k=c.monthlyUsd,U=r&&t>1?" ' + D + ' spec upgrade estimate":"",P=r&&t>1?',
    'k=c.monthlyUsd,U=(SZ&&SZ.db&&SZ.db.id===c.id)?` ' + D + ' sized for ${SZ.connections} concurrent connections`:r&&t>1?" ' + D + ' spec upgrade estimate":"",P=r&&t>1?'],
  ['database chosen by connection demand, floored at the measured plan',
    'const c=(()=>{if(!r||t<=1)return w;const se=[...l.managedMysql].sort((L,I)=>L.monthlyUsd-I.monthlyUsd),E=se.findIndex(L=>L.id===w.id);return se[E+1]??w})()',
    'const c=SZ?((SZ.db&&SZ.db.connectionLimit>=(w.connectionLimit||0))?SZ.db:w):(()=>{if(!r||t<=1)return w;const se=[...l.managedMysql].sort((L,I)=>L.monthlyUsd-I.monthlyUsd),E=se.findIndex(L=>L.id===w.id);return se[E+1]??w})()'],
  ['node line states the replica count that was actually priced',
    '${u.replicas} app replicas',
    '${SZ?SZ.replicas:u.replicas} app replicas'],
  ['line item carries the priced replica count',
    'nodeSpec:{vcpu:b.vcpu,ramGb:b.ramGb,diskGb:b.diskGb,label:b.label}',
    'nodeSpec:{vcpu:b.vcpu,ramGb:b.ramGb,diskGb:b.diskGb,label:b.label,replicas:SZ?SZ.replicas:(u.replicas??null)}'],
  ['topology comparison shows the priced replica count',
    'if(rp&&topo==="kubernetes")s+=`, ${rp} replicas`;',
    'const RP=(n.nodeSpec&&n.nodeSpec.replicas)||rp;if(RP&&topo==="kubernetes")s+=`, ${RP} replicas`;'],
  ['Configuration line describes what was priced',
    'o.jsx("span",{className:"rk-kv__v",style:{maxWidth:"62%"},children:n.label})',
    'o.jsx("span",{className:"rk-kv__v",style:{maxWidth:"62%"},children:PCFGA(e.primary.lineItems,n.components.replicas,e.topologyId,n.label)})'],
  ['on-screen note describes the linear model',
    '" users is above the tested range. The estimate scales the ",It,"-user configuration ' + MUL + '",Math.ceil(e.peakConcurrent/It)," ' + DASH + ' linear extrapolation, not a measurement. A blocker warning is included in the output."',
    '" users is above the tested range. The configuration is sized from the measured ",It,"-user point ' + DASH + ' per concurrent user, with a 25% allowance for platform overhead, HA and burst ' + DASH + ' then fitted to the smallest node count that can carry it. Linear extrapolation, not a measurement. A blocker warning is included in the output."'],
];

exports.MODEL = [
  ['reports show the priced replica count',
    'if(rp&&topo==="kubernetes")s+=`, ${rp} replicas`;',
    'const RP=(n.nodeSpec&&n.nodeSpec.replicas)||rp;if(RP&&topo==="kubernetes")s+=`, ${RP} replicas`;'],
  ['add a priced-replica helper',
    'function CFGLBL(A){',
    'function RPX(A){try{const n=(A.primary.lineItems||[]).find(z=>z&&z.nodeSpec);return(n&&n.nodeSpec.replicas)||A.primary.entry.components.replicas}catch(e){return A.primary.entry.components.replicas}}function CFGLBL(A){'],
  ['Orchestration row states the priced replica count',
    'DigitalOcean Kubernetes${A.primary.entry.components.replicas?`, ${A.primary.entry.components.replicas} application replicas`:""}',
    'DigitalOcean Kubernetes${RPX(A)?`, ${RPX(A)} application replicas`:""}'],
  ['report states the sizing method used above the tested range',
    '`${A.validatedAtVus} concurrent users. ${e.peakConcurrent} is not one of the levels load testing swept (${I.meta.testedLevels.join(", ")}), so this is costed on the next validated tier above it rather than interpolated.`',
    '`${A.validatedAtVus} concurrent users. ${e.peakConcurrent} is not one of the levels load testing swept (${I.meta.testedLevels.join(", ")}). ${A.primary.extrapolated?`It is above the tested range, so the configuration is sized from the measured ${A.validatedAtVus}-user point on a per-concurrent-user basis with a 25% allowance for platform overhead, HA and burst, then fitted to the smallest node count that can carry it. This is an estimate, not a measurement.`:"It is costed on the next validated tier above it rather than interpolated."}`'],
];

// Which built file each edit set belongs to. The model bundle is content-hashed
// by the build, so it is matched by prefix rather than by an exact name.
exports.TARGETS = [
  { glob: /^index-noL58BdD\.js$/, edits: exports.INDEX, name: 'app bundle' },
  { glob: /^model-.*\.js$/, edits: exports.MODEL, name: 'report model' },
];

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  const ROOT = path.resolve(__dirname, '..');
  const DIRS = ['', 'cloud', 'on-prem'];
  const APPLY = process.argv.includes('--apply');

  const resolve = dir => {
    const assets = path.join(dir, 'assets');
    const files = fs.existsSync(assets) ? fs.readdirSync(assets) : [];
    return exports.TARGETS.map(t => {
      const f = files.find(x => t.glob.test(x));
      return f ? { ...t, file: path.join(assets, f), base: f } : { ...t, file: null };
    });
  };

  let missing = 0, applied = 0, already = 0;
  for (const d of DIRS) {
    const dir = d ? path.join(ROOT, d) : ROOT;
    console.log(`\n=== ${d || '<root>'} ===`);
    for (const t of resolve(dir)) {
      if (!t.file) { console.log(`  [MISSING] no ${t.name} found`); missing++; continue; }
      const original = fs.readFileSync(t.file, 'utf8');
      let text = original;
      // Apply in order against the progressively patched text: some anchors are
      // created by an earlier edit (the droplet insert needs the MySQL entry
      // plan that a previous edit adds), so they cannot all be tested up front.
      let present = 0, done = 0;
      const broken = [], pending = [];
      for (const [name, from, to] of t.edits) {
        // A transform edit: a function that returns {text, applied}, or throws
        // if the shape it expects is no longer there.
        if (typeof from === 'function') {
          let r;
          try { r = from(text); } catch (err) { broken.push(`${name} (${err.message})`); continue; }
          if (!r.applied) { present++; continue; }
          text = r.text;
          if (APPLY) { done++; console.log(`    applied: ${name}`); } else pending.push(name);
          continue;
        }
        if (text.includes(to)) { present++; continue; }        // already patched
        const n = text.split(from).length - 1;
        if (n !== 1) { broken.push(`${name} (anchor matched ${n}x)`); continue; }
        if (APPLY) { text = text.split(from).join(to); done++; console.log(`    applied: ${name}`); }
        else { pending.push(name); text = text.split(from).join(to); } // simulate, so later anchors resolve
      }
      console.log(`  ${t.base}: ${present} present, ${APPLY ? done + ' applied' : pending.length + ' to apply'}, ${broken.length} unresolvable`);
      broken.forEach(b => console.log(`    [STUCK] ${b}`));
      if (!APPLY) pending.forEach(n => console.log(`    [would apply] ${n}`));
      if (broken.length) { missing += broken.length; continue; }
      if (APPLY && text !== original) { fs.writeFileSync(t.file, text, 'utf8'); applied += done; }
    }
  }
  if (missing) {
    console.log(`\n${missing} PATCH(ES) COULD NOT BE APPLIED - the upstream bundle moved. Re-derive them by hand; see reckoner/DEVELOPERS.md.`);
    process.exit(1);
  }
  console.log(APPLY
    ? `\n${applied} edit(s) applied. Now run: node reckoner/tools/sw-revisions.js --apply`
    : '\nall patches present (or applyable with --apply)');
}
