import { chromium } from 'playwright';
import { execSync } from 'child_process';
import fs from 'fs';

const TARGET_PATH = process.env.TARGET_PATH || '/';
const LOCAL_BASE = (process.env.LOCAL_BASE || process.env.LOCAL_URL || 'http://localhost:5174').replace(/\/$/, '');
const ORIGINAL_BASE = (process.env.ORIGINAL_URL || 'https://001027.xyz').replace(/\/$/, '');
const LOCAL = LOCAL_BASE + TARGET_PATH;
const ORIGINAL = ORIGINAL_BASE + TARGET_PATH;

// Per-area output folder so multiple page comparisons don't clobber each other.
const AREA = (process.env.COMPARE_AREA || TARGET_PATH.replace(/\//g, '_') || 'root').replace(/^_+|_+$/g, '') || 'root';
const OUT = `compare-out/focus${AREA === 'root' ? '' : '/' + AREA}`;
const HISTORY_FILE = 'compare-out/history.jsonl';

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync('compare-out')) fs.mkdirSync('compare-out', { recursive: true });

function extractFn() {
  const pick = (el, props) => {
    if (!el) return null;
    const s = window.getComputedStyle(el);
    const out = {};
    for (const p of props) out[p] = s.getPropertyValue(p);
    return out;
  };
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const typo = ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'color', 'text-transform', 'opacity'];

  const result = {};
  result.viewport = { w: window.innerWidth, h: window.innerHeight };

  // --- NAV ---
  const nav = document.querySelector('header, nav, [class*="nav"]');
  result.nav = {
    cls: nav?.className || null,
    box: box(nav),
    style: pick(nav, ['display', 'justify-content', 'align-items', 'padding', 'height', 'background-color', 'backdrop-filter', 'border-bottom', 'position', 'gap']),
    links: nav ? Array.from(nav.querySelectorAll('a, button')).map(e => ({
      text: e.textContent.trim(),
      style: pick(e, ['font-size', 'font-weight', 'color', 'letter-spacing', 'text-transform', 'padding', 'gap'])
    })).filter(x => x.text) : []
  };

  // --- LEFT TEXT ROTATOR ---
  const rotator = document.querySelector('[class*="rotator"], [class*="hero-title"], .hero-intro h1, .hero-intro h2');
  const eyebrow = document.querySelector('.eyebrow, [class*="eyebrow"]');
  result.heroLeft = {
    eyebrow: eyebrow ? { text: eyebrow.textContent.trim(), style: pick(eyebrow, typo) } : null,
    rotator: rotator ? {
      cls: rotator.className,
      text: rotator.textContent.trim(),
      box: box(rotator),
      style: pick(rotator, [...typo, 'animation-name', 'animation-duration', 'transition', 'transform']),
      html: rotator.innerHTML.slice(0, 300)
    } : null
  };

  // --- FOOTER ---
  const footer = document.querySelector('footer, [class*="footer"]');
  result.footer = footer ? {
    cls: footer.className,
    text: footer.textContent.trim(),
    box: box(footer),
    style: pick(footer, [...typo, 'background-color', 'border-top', 'padding', 'justify-content', 'gap']),
    spans: Array.from(footer.querySelectorAll('span, a')).map(s => ({
      text: s.textContent.trim(), style: pick(s, ['font-size', 'color', 'opacity'])
    })).filter(x => x.text)
  } : null;

  // --- BOOT / LOADING OVERLAY ---
  const boot = document.querySelector('[class*="boot"], [class*="splash"], [class*="preloader"], [class*="loader"], [class*="intro-overlay"]');
  result.boot = boot ? {
    cls: boot.className,
    box: box(boot),
    style: pick(boot, ['position', 'z-index', 'opacity', 'display', 'background-color']),
    canvases: boot.querySelectorAll('canvas').length
  } : null;

  // animations present on the page
  result.keyframeNames = (() => {
    const names = new Set();
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      if (!rules) continue;
      for (const r of rules) {
        if (r.type === CSSRule.KEYFRAMES_RULE) names.add(r.name);
      }
    }
    return Array.from(names);
  })();

  return result;
}

async function sampleRotator(page, label) {
  // sample the rotator text + transform over ~6s to capture the switch animation
  const samples = [];
  for (let i = 0; i < 12; i++) {
    const s = await page.evaluate(() => {
      const r = document.querySelector('[class*="rotator"], [class*="hero-title"], .hero-intro h1, .hero-intro h2');
      if (!r) return null;
      const cs = window.getComputedStyle(r);
      return { t: Date.now(), text: r.textContent.trim().slice(0, 40), opacity: cs.opacity, transform: cs.transform };
    });
    samples.push(s);
    await page.waitForTimeout(500);
  }
  fs.writeFileSync(`${OUT}/${label}-rotator-samples.json`, JSON.stringify(samples, null, 2));
  return samples;
}

async function capture(page, url, label, opts = {}) {
  console.log(`\n=== ${label}: ${url} ===`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  if (opts.bootShots) {
    // capture the very first moments to see any boot/open animation
    for (const ms of [0, 300, 800, 1500, 2500]) {
      await page.waitForTimeout(ms === 0 ? 0 : 300);
      await page.screenshot({ path: `${OUT}/${label}-boot-${ms}.png` });
    }
  }

  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${OUT}/${label}-viewport.png`, fullPage: false });
  await page.screenshot({ path: `${OUT}/${label}-full.png`, fullPage: true });

  const data = await page.evaluate(extractFn);
  fs.writeFileSync(`${OUT}/${label}-data.json`, JSON.stringify(data, null, 2));

  // footer is at the bottom — scroll to it then shoot
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${label}-footer.png` });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  const rot = await sampleRotator(page, label);
  return { data, rot };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

  const p1 = await context.newPage();
  const orig = await capture(p1, ORIGINAL, 'original', { bootShots: true });

  const p2 = await context.newPage();
  const local = await capture(p2, LOCAL, 'local', { bootShots: true });

  const summary = {
    nav: {
      original: orig.data.nav,
      local: local.data.nav,
    },
    heroLeft: {
      original: orig.data.heroLeft,
      local: local.data.heroLeft,
    },
    footer: {
      original: orig.data.footer,
      local: local.data.footer,
    },
    boot: {
      original: orig.data.boot,
      local: local.data.boot,
    },
    keyframeNames: {
      original: orig.data.keyframeNames,
      local: local.data.keyframeNames,
    },
  };
  fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify(summary, null, 2));

  // Compute a rough diff score (lower = closer). Heuristic over key computed-style fields.
  // This is intentionally simple; pixel-diff can be added later via pixelmatch.
  const score = computeDiffScore(orig.data, local.data);

  // Append one line to history.jsonl so progress survives across sessions.
  let commit = 'unknown';
  try { commit = execSync('git rev-parse --short HEAD').toString().trim(); } catch {}
  const iter = readNextIter();
  const historyLine = {
    t: new Date().toISOString(),
    iter,
    area: AREA,
    kind: 'measure',
    score: Number(score.total.toFixed(3)),
    top_diffs: score.topDiffs,
    commit,
    target: TARGET_PATH,
  };
  fs.appendFileSync(HISTORY_FILE, JSON.stringify(historyLine) + '\n');
  console.log('\nDone. Output in', OUT);
  console.log('Score (lower=closer):', historyLine.score, 'top diffs:', historyLine.topDiffs?.join(', ') ?? score.topDiffs.join(', '));

  await browser.close();
})();

function readNextIter() {
  if (!fs.existsSync(HISTORY_FILE)) return 1;
  const lines = fs.readFileSync(HISTORY_FILE, 'utf8').trim().split('\n').filter(Boolean);
  if (lines.length === 0) return 1;
  try {
    const last = JSON.parse(lines[lines.length - 1]);
    return (last.iter || 0) + 1;
  } catch {
    return lines.length + 1;
  }
}

function computeDiffScore(o, l) {
  // Compares a handful of high-signal computed-style fields between original and local.
  // Each mismatched field contributes 1.0; numeric (px) fields contribute scaled diff.
  let total = 0;
  const diffs = [];

  function cmpStyle(path, oStyle, lStyle, keys) {
    if (!oStyle || !lStyle) {
      total += 1;
      diffs.push(`${path}:missing`);
      return;
    }
    for (const k of keys) {
      const a = String(oStyle[k] ?? '').trim();
      const b = String(lStyle[k] ?? '').trim();
      if (a === b) continue;
      const pxA = parseFloat(a); const pxB = parseFloat(b);
      if (!Number.isNaN(pxA) && !Number.isNaN(pxB) && /px|em|rem|%/.test(a + b)) {
        const ratio = Math.min(1, Math.abs(pxA - pxB) / Math.max(1, Math.max(Math.abs(pxA), Math.abs(pxB))));
        total += ratio;
        if (ratio > 0.1) diffs.push(`${path}.${k}(${a}→${b})`);
      } else {
        total += 1;
        diffs.push(`${path}.${k}(${a.slice(0, 20)}→${b.slice(0, 20)})`);
      }
    }
  }

  cmpStyle('nav', o.nav?.style, l.nav?.style, ['height', 'padding', 'background-color', 'position']);
  cmpStyle('heroLeft.eyebrow', o.heroLeft?.eyebrow?.style, l.heroLeft?.eyebrow?.style, ['font-size', 'font-weight', 'letter-spacing', 'color']);
  cmpStyle('heroLeft.rotator', o.heroLeft?.rotator?.style, l.heroLeft?.rotator?.style, ['font-family', 'font-size', 'font-weight', 'line-height', 'color']);
  cmpStyle('footer', o.footer?.style, l.footer?.style, ['font-size', 'color', 'background-color', 'padding']);

  const oKf = new Set(o.keyframeNames || []);
  const lKf = new Set(l.keyframeNames || []);
  const missingKf = [...oKf].filter(x => !lKf.has(x));
  total += missingKf.length * 0.2;
  if (missingKf.length) diffs.push(`keyframes-missing:${missingKf.length}`);

  diffs.sort();
  return { total, topDiffs: diffs.slice(0, 8) };
}
