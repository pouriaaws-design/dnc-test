// Pelak — Copyright (c) 2026 PDNC. PolyForm Noncommercial 1.0.0, see LICENSE.md and LICENSE-PERMISSIONS.md
// One Cloudflare Worker. Settings live in ../site.config.js
import SITE from "../site.config.js";
import HTML from "./home.html";
import OVERLAY_HTML from "./overlay.html";
import NOT_FOUND_HTML from "./404.html";

// ── settings ──
var SOCIAL = SITE.social || {};
var YOUTUBE_HANDLE = SOCIAL.youtube || "";
var GITHUB_USER = SOCIAL.github || "";
var TELEGRAM_CHANNEL = SOCIAL.telegram || "";
var GITHUB_FEATURED = GITHUB_USER ? SOCIAL.featuredRepo || "" : "";
var DONATE = SITE.donate || {};
var DONATE_ON = !!DONATE.enabled;
var DONATE_URL = DONATE_ON && DONATE.button ? DONATE.button.url || "" : "";
var CRYPTO_URL = DONATE_ON && DONATE.crypto ? DONATE.crypto.url || "" : "";
var EXTRA_LINKS = (SITE.links || []).filter((l) => l && /^(https?:|mailto:|tel:|tg:)/i.test(l.url || "") && /^[a-z0-9-]{1,30}$/.test(l.id || ""));
var LANGS = (SITE.languages || ["fa", "en"]).filter((l) => l === "fa" || l === "en");
if (!LANGS.length) LANGS = ["fa", "en"];
var DEFAULT_LANG = LANGS.indexOf(SITE.defaultLang) !== -1 ? SITE.defaultLang : LANGS[0];
function tr(v, lang) {
  if (v && typeof v === "object") return v[lang] || v[DEFAULT_LANG] || v.en || v.fa || "";
  return String(v || "");
}
var DONATE_TITLE = tr(DONATE.goalName, DEFAULT_LANG) || tr(DONATE.title, DEFAULT_LANG);
var LINKS = {};
if (TELEGRAM_CHANNEL) LINKS.telegram = "https://t.me/" + TELEGRAM_CHANNEL;
if (YOUTUBE_HANDLE) LINKS.youtube = "https://youtube.com/@" + YOUTUBE_HANDLE;
if (SOCIAL.instagram) LINKS.instagram = "https://www.instagram.com/" + SOCIAL.instagram;
if (GITHUB_USER) LINKS.github = "https://github.com/" + GITHUB_USER;
if (DONATE_URL) LINKS.donate = DONATE_URL;
if (CRYPTO_URL) LINKS.crypto = CRYPTO_URL;
for (const l of EXTRA_LINKS) LINKS[l.id] = l.url;
var ALIASES = { tg: "telegram", yt: "youtube", ig: "instagram", insta: "instagram", gh: "github", support: "donate", coffee: "donate", usdt: "crypto", nowpayments: "crypto" };
for (const l of EXTRA_LINKS) delete ALIASES[l.id];
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
var worker_default = {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runCron(env, ctx).catch(() => {
    }));
  },
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path.indexOf("/api/") === 0 && path !== "/api/telegram-webhook" && path !== "/api/nowpayments-ipn") {
      if (await overLimit(request, env, "api", 90, 6e4)) return tooMany();
    }
    if (path.indexOf("/thumb/") === 0 || path.indexOf("/f/") === 0 || path === "/fonts.css") {
      if (hitLimit(request, "static", 120, 6e4)) return tooMany();
    }
    if (path === "/api/network/ipinfo") return handleIpInfo(request, url);
    if (path === "/api/network/checkhost") return handleCheckHost(request, url);
    if (path === "/api/nowpayments-ipn" && request.method === "POST") return handleNowPaymentsIpn(request, env, ctx);
    if (path === "/api/donate-stats") {
      if (request.method === "GET") return handleGetDonateStats(request, env, ctx);
      if (request.method === "POST") return handlePostDonateStats(request, env);
    }
    if (path === "/api/guestbook") {
      if (request.method === "GET") return handleGetGuestbook(env);
      if (request.method === "POST") return handlePostGuestbook(request, env, ctx);
      if (request.method === "DELETE") return handleDeleteGuestbook(request, env);
    }
    if (path === "/api/notify-test") return handleNotifyTest(request, env);
    if (path === "/api/telegram-webhook" && request.method === "POST") return handleTelegramWebhook(request, env, ctx);
    if (path === "/api/telegram-setup") return handleTelegramSetup(request, env);
    if (path === "/overlay") return handleOverlay(request, url);
    if (path === "/admin/guestbook") return handleAdminGuestbookPage(request, env);
    if (path === "/api/boot") return handleBoot(request, env, ctx);
    if (path === "/api/me") return handleMe(request, env);
    if (path === "/api/geo") return handleGeo(env);
    if (path === "/api/snake" || path === "/api/snake/start") return handleSnake(request, env, ctx, url);
    if (path === "/api/stats") return handleStats(request, env, ctx);
    if (path.startsWith("/go/")) return handleGo(request, url, env, ctx);
    if (path === "/stats") return handleStatsPage(request, env);
    if (path.startsWith("/thumb/")) return handleThumb(path.slice(7));
    if (path === "/favicon.ico") return Response.redirect(url.origin + "/logo.png", 302);
    if (path === "/manifest.webmanifest") return handleManifest();
    if (path === "/robots.txt") return handleRobots(url);
    if (path === "/.well-known/security.txt" || path === "/security.txt") return handleSecurityTxt(url);
    if (path === "/sitemap.xml") return handleSitemap(url);
    if (path === "/fonts.css") return handleFontsCss();
    if (path.startsWith("/f/")) return handleFontFile(path.slice(3));
    const shortName = path.slice(1).toLowerCase();
    if (shortName && shortName.indexOf("/") === -1 && (Object.prototype.hasOwnProperty.call(LINKS, shortName) || Object.prototype.hasOwnProperty.call(ALIASES, shortName))) {
      const u = new URL(url.toString());
      u.pathname = "/go/" + shortName;
      return handleGo(request, u, env, ctx);
    }
    if (path !== "/") return notFoundResponse(path);
    const asked = url.searchParams.get("lang");
    const lang = LANGS.indexOf(asked) !== -1 ? asked : DEFAULT_LANG;
    if (hitLimit(request, "page", 60, 6e4)) return tooMany();
    if (!isBot(request) && !hitLimit(request, "count", 10, 6e4)) trackClick(env, ctx, visitKeys(request, url));
    const pkey = url.origin + "|" + lang;
    let page = pageCache.get(pkey);
    if (!page) {
      let qr = "";
      try {
        qr = qrSvg(url.origin + "/");
      } catch (e) {
      }
      page = renderHome(url.origin, lang, qr);
      if (pageCache.size > 6) pageCache.clear();
      pageCache.set(pkey, page);
    }
    if (DONATE_ON && donateMem && donateMem.data) {
      page = page.replace("window.DONATE=null", () => "window.DONATE=" + scriptJson(donateMem.data));
    }
    return new Response(page, {
      headers: {
        "content-type": "text/html; charset=UTF-8",
        "cache-control": "public, max-age=60"
      }
    });
  }
};
// ── page rendering: fills src/home.html and src/overlay.html from site.config.js ──
var ICONS = {
  code: '<path d="M4 6.5 9.5 12 4 17.5"/><path d="M12.5 17.5h7.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.7 3.9 5.7 3.9 9S14.6 18.3 12 21c-2.6-2.7-3.9-5.7-3.9-9S9.4 5.7 12 3z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7.5 8 5.5 8-5.5"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  x: '<path d="M4 4l16 16M20 4L4 20"/>',
  discord: '<path d="M8 17c-2.5 0-4.5-1.5-4.5-1.5C3.5 11 5 6.5 5 6.500S6.8 5 9 5l.7 1.500a12 12 0 0 1 4.6 0L15 5c2.2 0 4 1.5 4 1.500s1.5 4.5 1.5 9c0 0-2 1.5-4.5 1.500l-1-1.700a10 10 0 0 1-6 0z"/><circle cx="9.3" cy="11.7" r="1"/><circle cx="14.7" cy="11.7" r="1"/>',
  linkedin: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8 11v5.500M8 7.800v.01M12 16.500V11M12 13.500c0-1.5 1-2.5 2.250-2.500s2.250 1 2.250 2.500v3"/>',
  store: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>',
  star: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.500L12 17.400l-5.9 3.1 1.2-6.500L2.5 9.400l6.6-.9z"/>'
};
function scriptJson(v) {
  return JSON.stringify(v).replace(/</g, "\\u003c").replace(/\u2028|\u2029/g, "");
}
// Replaces {{key}} with a value in one pass, so a value can never inject another placeholder.
function fill(template, values) {
  return template.replace(/\{\{([\w.]+)\}\}/g, (all, k) => Object.prototype.hasOwnProperty.call(values, k) ? values[k] : all);
}
function copyChip(text) {
  const t = escHtml(text);
  return '<span class="chip static copy" data-copy="' + t + '" title="Copy"><span class="dot"></span><b class="num">' + t + '</b><svg class="cp" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/></svg></span>';
}
var GO_ARROW = '<svg class="qgo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
function extraLinksHtml(lang) {
  return EXTRA_LINKS.map((l) => '<a class="qrow" style="--c:' + (/^[\d, ]+$/.test(l.color || "") ? l.color : "139,92,246") + '" href="' + (/^http/i.test(l.url) ? "/go/" + l.id : escHtml(l.url)) + '" target="_blank" rel="noopener"><span class="icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (Object.prototype.hasOwnProperty.call(ICONS, l.icon) ? ICONS[l.icon] : ICONS.globe) + '</svg></span><span class="label" data-i18n="link_' + l.id + '">' + escHtml(tr(l.label, lang) || l.id) + "</span>" + (l.handle ? copyChip(l.handle) : GO_ARROW) + "</a>").join("\n        ");
}
// Names of the parts that are off; the page hides them with CSS (.off-<name>)
function offParts() {
  const sec = SITE.sections || {};
  const off = Object.keys(sec).filter((k) => sec[k] === false && /^\w+$/.test(k));
  const need = { videos: YOUTUBE_HANDLE, posts: TELEGRAM_CHANNEL, project: GITHUB_FEATURED, donate: DONATE_ON, donateButton: DONATE_URL, cryptoButton: CRYPTO_URL, telegram: TELEGRAM_CHANNEL, youtube: YOUTUBE_HANDLE, instagram: SOCIAL.instagram, github: GITHUB_USER, lang: LANGS.length > 1, credit: SITE.showCredit !== false };
  for (const k of Object.keys(need)) if (!need[k] && off.indexOf(k) === -1) off.push(k);
  return off;
}
function handleOf(id) {
  if (id === "telegram") return "@" + TELEGRAM_CHANNEL;
  if (id === "youtube") return "@" + YOUTUBE_HANDLE;
  if (id === "instagram") return "@" + SOCIAL.instagram;
  if (id === "github") return "github.com/" + GITHUB_USER;
  const l = EXTRA_LINKS.find((x) => x.id === id);
  return l && l.handle || shortUrl(LINKS[id]);
}
function shortUrl(u) {
  return String(u || "").replace(/^(https?:\/\/(www\.)?|mailto:|tel:)/, "").replace(/\/$/, "");
}
// What the browser needs to know (everything here is public)
function clientSite() {
  const text = {};
  for (const l of ["fa", "en"]) {
    text[l] = {
      tagline: escHtml(tr(SITE.tagline, l)),
      desc: tr(SITE.description, l),
      donateTitle: tr(DONATE.title, l),
      goalDefault: tr(DONATE.goalName, l) || tr(DONATE.title, l),
      toman: tr(DONATE.currency, l) || "",
      donateButton: DONATE.button ? tr(DONATE.button.label, l) : "",
      donateCrypto: DONATE.crypto ? tr(DONATE.crypto.label, l) : ""
    };
    for (const x of EXTRA_LINKS) text[l]["link_" + x.id] = tr(x.label, l) || x.id;
  }
  const ids = ["telegram", "youtube", "instagram", "github"].filter((k) => LINKS[k]).concat(EXTRA_LINKS.map((l) => l.id));
  return {
    name: SITE.name,
    text,
    langs: LANGS,
    defaultLang: DEFAULT_LANG,
    off: offParts(),
    links: ids.map((id) => ({ id, handle: handleOf(id), host: shortUrl(LINKS[id]) })),
    accent: SITE.theme && SITE.theme.accent || null,
    hub: SITE.hubCountry || "DE",
    hubLabel: SITE.hubLabel || "HQ",
    user: SITE.terminalUser || "guest",
    signature: SITE.signature || "",
    cardSubtitle: SITE.cardSubtitle || ""
  };
}
function renderHome(origin, lang, qr) {
  const tiles = ["telegram", "youtube", "instagram", "github"].filter((k) => LINKS[k]);
  const jsonLd = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebSite", "@id": origin + "/#site", url: origin + "/", name: SITE.name, inLanguage: LANGS },
    { "@type": "Organization", "@id": origin + "/#org", name: SITE.name, url: origin + "/", logo: origin + "/logo.png", sameAs: ["telegram", "youtube", "instagram", "github"].filter((k) => LINKS[k]).map((k) => LINKS[k]) }
  ] };
  return fill(HTML, {
    origin,
    lang,
    dir: lang === "fa" ? "rtl" : "ltr",
    langs: scriptJson(LANGS),
    defaultLang: DEFAULT_LANG,
    off: offParts().map((k) => "off-" + k).concat(tiles.length ? ["tiles-" + tiles.length, "last-" + tiles[tiles.length - 1]] : []).join(" "),
    name: escHtml(SITE.name),
    desc: escHtml(tr(SITE.description, lang)),
    tagline: escHtml(tr(SITE.tagline, lang)),
    signature: escHtml(SITE.signature || ""),
    terminalUser: escHtml(SITE.terminalUser || "guest"),
    telegram: escHtml(TELEGRAM_CHANNEL),
    youtube: escHtml(YOUTUBE_HANDLE),
    github: escHtml(GITHUB_USER),
    instagramChip: copyChip("@" + (SOCIAL.instagram || "")),
    donateTitle: escHtml(tr(DONATE.title, lang)),
    goalName: escHtml(tr(DONATE.goalName, lang) || tr(DONATE.title, lang)),
    currency: escHtml(tr(DONATE.currency, lang)),
    donateButton: escHtml(DONATE.button ? tr(DONATE.button.label, lang) : ""),
    cryptoButton: escHtml(DONATE.crypto ? tr(DONATE.crypto.label, lang) : ""),
    extraLinks: extraLinksHtml(lang),
    jsonLd: scriptJson(jsonLd),
    site: scriptJson(clientSite()),
    qr
  });
}
// ── security headers, 404 ──
function notFoundResponse(path) {
  if (path.indexOf("/api/") === 0) {
    return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  }
  return new Response(fill(NOT_FOUND_HTML, { name: escHtml(SITE.name) }), { status: 404, headers: { "content-type": "text/html; charset=UTF-8", "cache-control": "public, max-age=300", "x-robots-tag": "noindex" } });
}
// the home page only runs inline scripts/styles of its own and talks to its own origin
var PAGE_CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; media-src 'self' data: blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'";
function withSecurityHeaders(request, res) {
  let h;
  try {
    h = new Headers(res.headers);
  } catch (e) {
    return res;
  }
  const path = new URL(request.url).pathname;
  h.set("x-content-type-options", "nosniff");
  h.set("referrer-policy", "strict-origin-when-cross-origin");
  h.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  h.set("strict-transport-security", "max-age=31536000");
  if (path !== "/overlay") h.set("x-frame-options", "SAMEORIGIN");
  if (path !== "/overlay" && (h.get("content-type") || "").indexOf("text/html") === 0) h.set("content-security-policy", PAGE_CSP);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}
var baseFetch = worker_default.fetch;
worker_default.fetch = async function(request, env, ctx) {
  return withSecurityHeaders(request, await baseFetch.call(worker_default, request, env, ctx));
};

async function meInfo(request, env) {
  const cf = request.cf || {};
  let views = 0;
  try {
    const d = await memo("clicks", 2e4, () => tgClickData(env));
    views = d.total && d.total.page || 0;
  } catch (e) {
  }
  const cc = typeof cf.country === "string" && /^[A-Z][A-Z0-9]$/.test(cf.country) ? cf.country : null;
  const colo = typeof cf.colo === "string" && /^[A-Z0-9]{2,4}$/.test(cf.colo) ? cf.colo : null;
  const tz = typeof cf.timezone === "string" && /^[A-Za-z_\/+-]{1,40}$/.test(cf.timezone) ? cf.timezone : null;
  return { country: cc, colo, tz, views };
}
async function handleMe(request, env) {
  return new Response(JSON.stringify(await meInfo(request, env)), {
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}
async function handleBoot(request, env, ctx) {
  const safe = (p, ms) => {
    const q = p.catch(() => void 0);
    ctx.waitUntil(q); // a slow source still finishes and fills the cache for the next request
    return withTimeout(q, ms);
  };
  const [me, geo, snake, stats, donate] = await Promise.all([
    safe(meInfo(request, env), 2500),
    safe(memo("geo", 3e4, () => geoData(env)), 2500),
    safe(memo("snake", 2e4, async () => ({ board: snakePublic(await loadSnake(env)) })), 2500),
    safe(memo("stats", 3e4, () => statsData(env, ctx)), 2500),
    safe(memo("donate", 3e4, async () => (await getDonate(env, ctx, false, 3e4)).data), 1800)
  ]);
  return new Response(JSON.stringify({ me, geo, snake, stats, donate }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}
async function handleIpInfo(request, url) {
  let targetIp = url.searchParams.get("ip") || "";
  targetIp = targetIp.trim();
  if (targetIp && !/^[0-9a-fA-F:.]{2,45}$/.test(targetIp)) return new Response(JSON.stringify({ error: "Invalid IP" }), { status: 400 });
  if (targetIp && hitLimit(request, "net", 10, 6e4)) return tooMany();
  if (!targetIp) {
    const cf = request.cf || {};
    return new Response(JSON.stringify({
      ip: request.headers.get("cf-connecting-ip") || "Unknown",
      country: cf.country || "Unknown",
      city: cf.city || "Unknown",
      asn: cf.asn || "Unknown",
      asOrganization: cf.asOrganization || "Unknown"
    }), { headers: { "content-type": "application/json" } });
  }
  try {
    const UA2 = request.headers.get("User-Agent") || "Mozilla/5.0";
    const res = await fetch("http://ip-api.com/json/" + targetIp, { headers: { "User-Agent": UA2 } });
    const data = await res.json();
    if (data.status === "success") {
      return new Response(JSON.stringify({
        ip: data.query,
        country: data.country || "Unknown",
        city: data.city || "Unknown",
        asn: data.as ? data.as.split(" ")[0].replace("AS", "") : "Unknown",
        asOrganization: data.isp || "Unknown"
      }), { headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: "Invalid IP or lookup failed" }), { status: 400 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
async function handleCheckHost(request, url) {
  let host = url.searchParams.get("host") || "";
  host = host.trim();
  if (!host) return new Response(JSON.stringify({ error: "Missing host" }), { status: 400 });
  if (!/^https?:\/\//i.test(host)) host = "https://" + host;
  if (hitLimit(request, "net", 10, 6e4)) return tooMany();
  let parsed;
  try {
    parsed = new URL(host);
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid host" }), { status: 400 });
  }
  const hn = parsed.hostname.toLowerCase();
  const privateHost = /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(hn) || hn.endsWith(".local") || hn.endsWith(".internal");
  if (privateHost || !(/^[a-z0-9.\-]+$/.test(hn) || /^\[[0-9a-f:]+\]$/.test(hn)) || parsed.port && parsed.port !== "80" && parsed.port !== "443") {
    return new Response(JSON.stringify({ error: "Host not allowed" }), { status: 400 });
  }
  const start = Date.now();
  try {
    const UA2 = request.headers.get("User-Agent") || "Mozilla/5.0";
    const res = await fetch(host, {
      method: "HEAD",
      headers: { "User-Agent": UA2 },
      cf: { cacheTtl: 0 }
    });
    const ms = Date.now() - start;
    return new Response(JSON.stringify({
      status: res.status,
      statusText: res.statusText || "OK",
      timeMs: ms,
      server: res.headers.get("server") || "Unknown"
    }), { headers: { "content-type": "application/json" } });
  } catch (e) {
    const ms = Date.now() - start;
    return new Response(JSON.stringify({ error: "Host unreachable", timeMs: ms, details: e.message }), { status: 400 });
  }
}
var QR_EC = [
  null,
  [10, 1, 16, 0, 0],
  [16, 1, 28, 0, 0],
  [26, 1, 44, 0, 0],
  [18, 2, 32, 0, 0],
  [24, 2, 43, 0, 0],
  [16, 4, 27, 0, 0],
  [18, 4, 31, 0, 0],
  [22, 2, 38, 2, 39],
  [22, 3, 36, 2, 37],
  [26, 4, 43, 1, 44]
];
var QR_ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
var GF_EXP = new Uint8Array(512);
var GF_LOG = new Uint8Array(256);
(function() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 256) x ^= 285;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();
function gfMul(a, b) {
  return a && b ? GF_EXP[GF_LOG[a] + GF_LOG[b]] : 0;
}
function rsGenerator(deg) {
  let g = [1];
  for (let i = 0; i < deg; i++) {
    const next = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      next[j] ^= g[j];
      next[j + 1] ^= gfMul(g[j], GF_EXP[i]);
    }
    g = next;
  }
  return g;
}
function rsRemainder(data, deg) {
  const gen = rsGenerator(deg);
  const rem = new Array(deg).fill(0);
  for (const b of data) {
    const factor = b ^ rem.shift();
    rem.push(0);
    for (let i = 0; i < deg; i++) rem[i] ^= gfMul(gen[i + 1], factor);
  }
  return rem;
}
function qrMatrix(text) {
  const bytes = new TextEncoder().encode(text);
  let ver = 0;
  for (let v = 1; v <= 10; v++) {
    const e = QR_EC[v];
    if (4 + (v < 10 ? 8 : 16) + bytes.length * 8 <= (e[1] * e[2] + e[3] * e[4]) * 8) {
      ver = v;
      break;
    }
  }
  if (!ver) throw new Error("QR: text too long");
  const [ecb, b1, d1, b2, d2] = QR_EC[ver];
  const dataCw = b1 * d1 + b2 * d2;
  const bits = [];
  const push = (val, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push(val >>> i & 1);
  };
  push(4, 4);
  push(bytes.length, ver < 10 ? 8 : 16);
  for (const b of bytes) push(b, 8);
  push(0, Math.min(4, dataCw * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  for (let pad = 236; bits.length < dataCw * 8; pad ^= 236 ^ 17) push(pad, 8);
  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = b << 1 | bits[i + j];
    codewords.push(b);
  }
  const blocks = [];
  let off = 0;
  for (let i = 0; i < b1 + b2; i++) {
    const len = i < b1 ? d1 : d2;
    const d = codewords.slice(off, off + len);
    off += len;
    blocks.push({ d, e: rsRemainder(d, ecb) });
  }
  const finalCw = [];
  for (let i = 0; i < Math.max(d1, d2); i++) for (const bl of blocks) if (i < bl.d.length) finalCw.push(bl.d[i]);
  for (let i = 0; i < ecb; i++) for (const bl of blocks) finalCw.push(bl.e[i]);
  const size = ver * 4 + 17;
  const mod = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const setF = (x, y, dark) => {
    mod[y][x] = dark;
    fn[y][x] = true;
  };
  for (let i = 0; i < size; i++) {
    setF(6, i, i % 2 === 0);
    setF(i, 6, i % 2 === 0);
  }
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        setF(x, y, d !== 2 && d !== 4);
      }
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);
  const ap = QR_ALIGN[ver];
  for (let i = 0; i < ap.length; i++) {
    for (let j = 0; j < ap.length; j++) {
      if (i === 0 && j === 0 || i === 0 && j === ap.length - 1 || i === ap.length - 1 && j === 0) continue;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) setF(ap[i] + dx, ap[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
  const drawFormat = (mask) => {
    const data = mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = rem << 1 ^ (rem >>> 9) * 1335;
    const fb = (data << 10 | rem) ^ 21522;
    const bit = (i) => (fb >>> i & 1) !== 0;
    for (let i = 0; i <= 5; i++) setF(8, i, bit(i));
    setF(8, 7, bit(6));
    setF(8, 8, bit(7));
    setF(7, 8, bit(8));
    for (let i = 9; i < 15; i++) setF(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) setF(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) setF(8, size - 15 + i, bit(i));
    setF(8, size - 8, true);
  };
  drawFormat(0);
  if (ver >= 7) {
    let rem = ver;
    for (let i = 0; i < 12; i++) rem = rem << 1 ^ (rem >>> 11) * 7973;
    const vb = ver << 12 | rem;
    for (let i = 0; i < 18; i++) {
      const b = (vb >>> i & 1) !== 0;
      const a = size - 11 + i % 3, c = Math.floor(i / 3);
      setF(a, c, b);
      setF(c, a, b);
    }
  }
  let bi = 0;
  const totalBits = finalCw.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const y = (right + 1 & 2) === 0 ? size - 1 - vert : vert;
        if (!fn[y][x] && bi < totalBits) {
          mod[y][x] = (finalCw[bi >>> 3] >>> 7 - (bi & 7) & 1) !== 0;
          bi++;
        }
      }
    }
  }
  const applyMask = (m) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (fn[y][x]) continue;
        let inv;
        switch (m) {
          case 0:
            inv = (x + y) % 2 === 0;
            break;
          case 1:
            inv = y % 2 === 0;
            break;
          case 2:
            inv = x % 3 === 0;
            break;
          case 3:
            inv = (x + y) % 3 === 0;
            break;
          case 4:
            inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
            break;
          case 5:
            inv = x * y % 2 + x * y % 3 === 0;
            break;
          case 6:
            inv = (x * y % 2 + x * y % 3) % 2 === 0;
            break;
          default:
            inv = ((x + y) % 2 + x * y % 3) % 2 === 0;
        }
        if (inv) mod[y][x] = !mod[y][x];
      }
    }
  };
  const penalty = () => {
    let score = 0;
    const line = (get) => {
      let run = 1;
      for (let i = 1; i < size; i++) {
        if (get(i) === get(i - 1)) run++;
        else {
          if (run >= 5) score += 3 + (run - 5);
          run = 1;
        }
      }
      if (run >= 5) score += 3 + (run - 5);
      for (let i = 0; i + 7 <= size; i++) {
        if (get(i) && !get(i + 1) && get(i + 2) && get(i + 3) && get(i + 4) && !get(i + 5) && get(i + 6)) {
          const before = i >= 4 && !get(i - 1) && !get(i - 2) && !get(i - 3) && !get(i - 4);
          const after = i + 10 < size + 0 && !get(i + 7) && !get(i + 8) && !get(i + 9) && !get(i + 10);
          if (before || after) score += 40;
        }
      }
    };
    for (let y = 0; y < size; y++) line((i) => mod[y][i]);
    for (let x = 0; x < size; x++) line((i) => mod[i][x]);
    let dark = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (mod[y][x]) dark++;
        if (x < size - 1 && y < size - 1 && mod[y][x] === mod[y][x + 1] && mod[y][x] === mod[y + 1][x] && mod[y][x] === mod[y + 1][x + 1]) score += 3;
      }
    }
    score += 10 * Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size));
    return score;
  };
  let best = 0, bestScore = Infinity;
  for (let m = 0; m < 8; m++) {
    applyMask(m);
    drawFormat(m);
    const s = penalty();
    if (s < bestScore) {
      bestScore = s;
      best = m;
    }
    applyMask(m);
  }
  applyMask(best);
  drawFormat(best);
  return mod;
}
var qrCache = new Map();
function qrSvg(text) {
  if (qrCache.has(text)) return qrCache.get(text);
  const m = qrMatrix(text);
  const n = m.length, q = 4;
  let d = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!m[y][x]) continue;
      let len = 1;
      while (x + len < n && m[y][x + len]) len++;
      d += "M" + (x + q) + " " + (y + q) + "h" + len + "v1h-" + len + "z";
      x += len - 1;
    }
  }
  const total = n + q * 2;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + " " + total + '" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="' + total + '" height="' + total + '" fill="#fff"/><path d="' + d + '" fill="#07090d"/></svg>';
  qrCache.set(text, svg);
  return svg;
}
function getEnv(env, name) {
  let v = env[name];
  if (v === void 0) {
    const k = Object.keys(env).find((x) => x.trim().toUpperCase() === name);
    if (k) v = env[k];
  }
  if (typeof v !== "string") return "";
  v = v.trim().replace(/^[\s("'`]+|[\s)"'`]+$/g, "");
  // A sample or very short password counts as not set: the private pages stay closed
  if (name === "STATS_PASSWORD" && (v.length < 10 || /^change-?me/i.test(v))) return "";
  return v;
}
var memoStore = new Map();
// Caches finished values only: in Workers a promise must not be shared between requests.
async function memo(key, ttlMs, fn) {
  const hit = memoStore.get(key);
  if (hit && Date.now() - hit.t < ttlMs) return hit.v;
  const v = await fn();
  memoStore.set(key, { t: Date.now(), v });
  return v;
}
function withTimeout(p, ms) {
  return Promise.race([p, new Promise((resolve) => setTimeout(() => resolve(void 0), ms))]);
}
var limitStore = new Map();
function clientIp(request) {
  return request.headers.get("cf-connecting-ip") || "unknown";
}
function hitLimit(request, bucket, max, windowMs) {
  const now = Date.now(), key = bucket + "|" + clientIp(request);
  let e = limitStore.get(key);
  if (!e || now - e.t > windowMs) {
    e = { t: now, n: 0 };
    limitStore.set(key, e);
  }
  e.n++;
  if (limitStore.size > 6e3) {
    for (const [k, v] of limitStore) if (now - v.t > 6e5) limitStore.delete(k);
    if (limitStore.size > 9e3) limitStore.clear();
  }
  return e.n > max;
}
async function overLimit(request, env, bucket, max, windowMs) {
  if (hitLimit(request, bucket, max, windowMs)) return true;
  if (env.RATE_LIMITER && typeof env.RATE_LIMITER.limit === "function") {
    try {
      const r = await env.RATE_LIMITER.limit({ key: clientIp(request) });
      if (!r.success) return true;
    } catch (e) {
    }
  }
  return false;
}
function tooMany() {
  return new Response(JSON.stringify({ error: "too many requests" }), {
    status: 429,
    headers: { "content-type": "application/json", "retry-after": "30", "cache-control": "no-store" }
  });
}
var pageCache = new Map();
function decodeEntities(s) {
  const cp = (n) => {
    try {
      return n > 0 && n <= 1114111 ? String.fromCodePoint(n) : "";
    } catch (e) {
      return "";
    }
  };
  return String(s).replace(/&#x([0-9a-f]+);/gi, (_, h) => cp(parseInt(h, 16))).replace(/&#(\d+);/g, (_, n) => cp(parseInt(n, 10))).replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&");
}
var FONTS_URL = "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Rajdhani:wght@700&display=swap";
async function handleFontsCss() {
  const res = await fetch(FONTS_URL, {
    headers: { "User-Agent": UA },
    cf: { cacheTtl: 86400, cacheEverything: true }
  });
  if (!res.ok) {
    return new Response("/* fonts unavailable */", { status: 502, headers: { "content-type": "text/css" } });
  }
  const css = (await res.text()).split("https://fonts.gstatic.com/").join("/f/");
  return new Response(css, {
    headers: { "content-type": "text/css; charset=utf-8", "cache-control": "public, max-age=86400" }
  });
}
async function handleFontFile(path) {
  if (!/^[\w\-./]+\.woff2$/.test(path) || path.indexOf("..") !== -1) {
    return new Response("bad path", { status: 400 });
  }
  const res = await fetch("https://fonts.gstatic.com/" + path, {
    cf: { cacheTtl: 31536e3, cacheEverything: true }
  });
  if (!res.ok) return new Response("not found", { status: 404 });
  return new Response(res.body, {
    headers: {
      "content-type": "font/woff2",
      "cache-control": "public, max-age=31536000, immutable",
      "access-control-allow-origin": "*"
    }
  });
}
async function handleThumb(id) {
  if (!/^[\w-]{11}$/.test(id)) return new Response("bad id", { status: 400 });
  for (const name of ["maxresdefault", "hqdefault"]) {
    const res = await fetch("https://i.ytimg.com/vi/" + id + "/" + name + ".jpg", {
      cf: { cacheTtl: 86400, cacheEverything: true }
    });
    if (res.ok) {
      return new Response(res.body, {
        headers: {
          "content-type": res.headers.get("content-type") || "image/jpeg",
          "cache-control": "public, max-age=86400"
        }
      });
    }
  }
  return new Response("not found", { status: 404 });
}
var BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|discord|curl|wget|headless|monitor/i;
var SOURCE_MAP = [
  [/(^|\.)instagram\.com$|^(ig|insta|instagram)$/, "Instagram"],
  [/(^|\.)(t\.me|telegram\.org|telegram\.me)$|^(tg|telegram)$/, "Telegram"],
  [/(^|\.)(youtube\.com|youtu\.be)$|^(yt|youtube)$/, "YouTube"],
  [/(^|\.)github\.com$|^(gh|github)$/, "GitHub"],
  [/(^|\.)(x\.com|twitter\.com|t\.co)$|^(x|twitter)$/, "X"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$|^(fb|facebook)$/, "Facebook"],
  [/(^|\.)linkedin\.com$|^linkedin$/, "LinkedIn"],
  [/(^|\.)google\.[a-z.]+$|^google$/, "Google"],
  [/(^|\.)bing\.com$|^bing$/, "Bing"],
  [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)(whatsapp\.com|wa\.me)$|^whatsapp$/, "WhatsApp"],
  [/(^|\.)reddit\.com$|^reddit$/, "Reddit"]
];
function classifySource(request, url) {
  const tag = (url.searchParams.get("ref") || url.searchParams.get("utm_source") || "").toLowerCase();
  let raw = /^[\w.-]{1,30}$/.test(tag) ? tag : "";
  if (!raw) {
    try {
      const host = new URL(request.headers.get("referer") || "").hostname.toLowerCase().replace(/^www\./, "");
      if (host && host !== url.hostname.toLowerCase().replace(/^www\./, "")) raw = host;
    } catch (e) {
    }
  }
  if (!raw) return "Direct";
  for (const item of SOURCE_MAP) {
    const re = item[0];
    const label = item[1];
    if (re instanceof RegExp && re.test(raw)) return String(label);
  }
  return /^[a-z0-9.-]{1,40}$/.test(raw) ? raw : "Other";
}
function visitKeys(request, url) {
  const keys = ["page", "s:" + classifySource(request, url)];
  const cc = request.cf && request.cf.country;
  if (typeof cc === "string" && /^[A-Z][A-Z0-9]$/.test(cc)) keys.push("c:" + cc);
  return keys;
}
function isBot(request) {
  return request.method === "HEAD" || BOT_RE.test(request.headers.get("user-agent") || "");
}
var CLICKS_KEY = "clicks:v1";
var CLICK_FLUSH_MS = 5 * 60 * 1e3;
var CLICK_FLUSH_BUSY_MS = 15 * 60 * 1e3;
var clickPending = {};
var clickFlushTimes = [];
var clickLastFlush = 0;
var clickFlushing = false;
var clickTrailing = false;
function clickWindow(now) {
  while (clickFlushTimes.length && now - clickFlushTimes[0] > 36e5) clickFlushTimes.shift();
  return clickFlushTimes.length >= 30 ? CLICK_FLUSH_BUSY_MS : CLICK_FLUSH_MS;
}
function trackClick(env, ctx, ids) {
  if (!env.STATS_KV) return;
  for (const id of [].concat(ids)) clickPending[id] = (clickPending[id] || 0) + 1;
  const now = Date.now();
  const wait = Math.max(0, clickLastFlush + clickWindow(now) - now);
  if (wait === 0) {
    ctx.waitUntil(flushClicks(env));
  } else if (!clickTrailing && wait <= 25e3) {
    clickTrailing = true;
    ctx.waitUntil(
      new Promise((r) => setTimeout(r, wait)).then(() => {
        clickTrailing = false;
        return flushClicks(env);
      })
    );
  }
}
async function flushClicks(env) {
  if (clickFlushing) return;
  const snap = {};
  let any = false;
  for (const k of Object.keys(clickPending)) {
    if (clickPending[k] > 0) {
      snap[k] = clickPending[k];
      any = true;
    }
  }
  if (!any) return;
  clickFlushing = true;
  clickLastFlush = Date.now();
  clickFlushTimes.push(clickLastFlush);
  for (const k in snap) clickPending[k] -= snap[k];
  try {
    const data = await env.STATS_KV.get(CLICKS_KEY, "json") || { total: {}, days: {}, since: Date.now() };
    const day = new Date().toISOString().slice(0, 10);
    data.days[day] = data.days[day] || {};
    const sourceKeys = () => Object.keys(data.total).filter((x) => x.startsWith("s:")).length;
    for (const key in snap) {
      let k = key;
      if (k.startsWith("s:") && !(k in data.total) && sourceKeys() >= 80) k = "s:Other";
      data.total[k] = (data.total[k] || 0) + snap[key];
      data.days[day][k] = (data.days[day][k] || 0) + snap[key];
    }
    const days = {};
    for (const d of Object.keys(data.days).sort().slice(-60)) days[d] = data.days[d];
    data.days = days;
    await env.STATS_KV.put(CLICKS_KEY, JSON.stringify(data));
  } catch (e) {
    for (const k in snap) clickPending[k] += snap[k];
    clickLastFlush = Date.now() + 25 * 60 * 1e3;
  } finally {
    clickFlushing = false;
  }
}
function handleGo(request, url, env, ctx) {
  let name = url.pathname.slice(4).replace(/\/+$/, "").toLowerCase();
  if (Object.prototype.hasOwnProperty.call(ALIASES, name)) name = ALIASES[name];
  let target = null;
  if (name === "video") {
    const id = url.searchParams.get("v") || "";
    if (/^[\w-]{11}$/.test(id)) target = "https://www.youtube.com/watch?v=" + id;
  } else if (name === "post") {
    const n = url.searchParams.get("p") || "";
    if (/^\d{1,10}$/.test(n)) target = "https://t.me/" + TELEGRAM_CHANNEL + "/" + n;
  } else if (name === "project" && GITHUB_FEATURED) {
    target = "https://github.com/" + GITHUB_USER + "/" + GITHUB_FEATURED;
  } else if (Object.prototype.hasOwnProperty.call(LINKS, name)) {
    target = LINKS[name];
  }
  if (!target) return Response.redirect(url.origin + "/", 302);
  if (!isBot(request)) trackClick(env, ctx, name);
  return new Response(null, {
    status: 302,
    headers: { location: target, "cache-control": "no-store", "x-robots-tag": "noindex" }
  });
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function basicAuthOk(request, password) {
  const h = request.headers.get("authorization") || "";
  if (!/^basic /i.test(h)) return false;
  if (hitLimit(request, "auth", 60, 6e5)) return false;
  try {
    const bin = atob(h.slice(6).trim());
    const decoded = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    const given = decoded.slice(decoded.indexOf(":") + 1);
    return safeEqual(given, password);
  } catch (e) {
    return false;
  }
}
var STAT_LABELS = [["page", "Page views"]].concat(
  [["telegram", "Telegram"], ["youtube", "YouTube"], ["instagram", "Instagram"], ["github", "GitHub"]].filter((x) => LINKS[x[0]]),
  EXTRA_LINKS.map((l) => [l.id, escHtml(tr(l.label, "en") || l.id)]),
  [["project", "Featured project"], ["video", "Videos"], ["post", "Telegram posts"]],
  DONATE_ON ? [["donate", "Support"], ["crypto", "Crypto support"]] : []
);
function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function countryLabel(code) {
  if (code === "XX") return "Unknown";
  if (code === "T1") return "Tor network";
  let name = code;
  try {
    name = new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch (e) {
  }
  const flag = /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((c) => 127462 + c.charCodeAt(0) - 65)) + " " : "";
  return flag + name;
}
function renderStatsHtml(total, days) {
  const dayList = (n) => Array.from({ length: n }, (_, i) => new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
  const val = (d, k) => days[d] && days[d][k] || 0;
  const sum = (n, k) => dayList(n).reduce((s, d) => s + val(d, k), 0);
  const rows = STAT_LABELS.map(
    ([k, label]) => "<tr><td>" + label + "</td><td>" + (total[k] || 0) + "</td><td>" + sum(7, k) + "</td><td>" + sum(30, k) + "</td></tr>"
  ).join("");
  const last14 = dayList(14).reverse();
  const clicksOf = (d) => STAT_LABELS.filter((x) => x[0] !== "page").reduce((s, x) => s + val(d, x[0]), 0);
  const views = last14.map((d) => val(d, "page"));
  const clicks = last14.map(clicksOf);
  const max = Math.max(1, ...views, ...clicks);
  const bars = last14.map(
    (d, i) => '<div class="day" title="' + d + ": " + views[i] + " views, " + clicks[i] + ' clicks"><div class="b v" style="height:' + Math.round(views[i] / max * 100) + '%"></div><div class="b c" style="height:' + Math.round(clicks[i] / max * 100) + '%"></div><span>' + d.slice(5) + "</span></div>"
  ).join("");
  const topRows = (prefix, nameOf) => {
    const keys = new Set(Object.keys(total).filter((k) => k.startsWith(prefix)));
    for (const d in days) for (const k in days[d]) if (k.startsWith(prefix)) keys.add(k);
    const list = [...keys].map((k) => ({ name: nameOf(k.slice(prefix.length)), all: total[k] || 0, d30: sum(30, k) })).sort((a, b) => b.all - a.all).slice(0, 8);
    const grand = list.reduce((s, r) => s + r.all, 0) || 1;
    if (!list.length) return '<tr><td colspan="3" class="empty">No data yet</td></tr>';
    return list.map(
      (r) => '<tr><td class="bar" style="--p:' + Math.round(r.all / grand * 100) + '%">' + escHtml(r.name) + "</td><td>" + r.all + "</td><td>" + r.d30 + "</td></tr>"
    ).join("");
  };
  const breakdown = "<h2>Traffic sources</h2><table><thead><tr><th></th><th>Total</th><th>30 days</th></tr></thead><tbody>" + topRows("s:", (n) => n) + "</tbody></table><h2>Countries</h2><table><thead><tr><th></th><th>Total</th><th>30 days</th></tr></thead><tbody>" + topRows("c:", countryLabel) + "</tbody></table>";
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>' + escHtml(SITE.name) + ' · stats</title><style>body{margin:0;background:#07090d;color:#f2f4f7;font:15px/1.6 system-ui,sans-serif;padding:24px}main{max-width:640px;margin:0 auto}h1{font-size:1.3rem;margin:0 0 4px}p{color:#8d97a3;margin:0 0 20px;font-size:.85rem}table{width:100%;border-collapse:collapse;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:14px;overflow:hidden}th,td{padding:10px 14px;text-align:right;border-bottom:1px solid rgba(255,255,255,.07)}th:first-child,td:first-child{text-align:left}th{color:#8d97a3;font-weight:500;font-size:.8rem}tr:last-child td{border-bottom:0}td:not(:first-child){font-variant-numeric:tabular-nums;font-weight:600}.chart{display:flex;gap:6px;align-items:flex-end;height:140px;margin:22px 0 6px;padding:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:14px}.day{flex:1;height:100%;display:flex;align-items:flex-end;gap:2px;position:relative}.b{flex:1;border-radius:3px 3px 0 0;min-height:2px}.v{background:#8b5cf6}.c{background:#2f8bff}.day span{position:absolute;bottom:-20px;left:50%;transform:translateX(-50%);font-size:.6rem;color:#8d97a3}.legend{font-size:.8rem;color:#8d97a3;margin-top:26px}.legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin:0 6px 0 12px}h2{font-size:.95rem;margin:30px 0 10px;color:#c9d1db}.empty{text-align:center!important;color:#8d97a3;font-weight:400!important}td.bar{background:linear-gradient(90deg,rgba(139,92,246,.28) var(--p),transparent var(--p))}</style></head><body><main><h1>' + escHtml(SITE.name) + ' · stats</h1><p>Private. Counts are batched and approximate; bots are excluded. No IP addresses or cookies are stored, only aggregate counters.</p><table><thead><tr><th></th><th>Total</th><th>7 days</th><th>30 days</th></tr></thead><tbody>' + rows + '</tbody></table><div class="chart">' + bars + '</div><div class="legend"><i style="background:#8b5cf6"></i>Page views<i style="background:#2f8bff"></i>Link clicks (last 14 days)</div>' + breakdown + "</main></body></html>";
}
async function handleStatsPage(request, env) {
  const headers = { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" };
  const pass = getEnv(env, "STATS_PASSWORD");
  if (!pass) {
    return new Response(
      "<!DOCTYPE html><meta charset=utf-8><body style='font:16px system-ui;padding:24px;background:#07090d;color:#f2f4f7'><h2>Stats page is disabled</h2><p>Add a <b>Secret</b> named <code>STATS_PASSWORD</code> (10 characters or more) to the Worker, deploy, then reload this page.</p>",
      { status: 503, headers }
    );
  }
  if (!basicAuthOk(request, pass)) {
    return new Response("Authentication required", {
      status: 401,
      headers: { ...headers, "www-authenticate": 'Basic realm="stats", charset="UTF-8"' }
    });
  }
  let data = { total: {}, days: {} };
  if (env.STATS_KV) {
    try {
      data = await env.STATS_KV.get(CLICKS_KEY, "json") || data;
    } catch (e) {
    }
  }
  const total = { ...data.total || {} };
  const days = JSON.parse(JSON.stringify(data.days || {}));
  const today = new Date().toISOString().slice(0, 10);
  for (const k of Object.keys(clickPending)) {
    if (clickPending[k] > 0) {
      total[k] = (total[k] || 0) + clickPending[k];
      days[today] = days[today] || {};
      days[today][k] = (days[today][k] || 0) + clickPending[k];
    }
  }
  return new Response(renderStatsHtml(total, days), { headers });
}
function tgEscape(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
async function sendTelegram(env, html, markup) {
  const token = getEnv(env, "TELEGRAM_BOT_TOKEN");
  const chat = getEnv(env, "TELEGRAM_CHAT_ID");
  if (!token || !chat) return { ok: false, error: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set" };
  try {
    const res = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.assign(
        { chat_id: chat, text: html, parse_mode: "HTML", disable_web_page_preview: true },
        markup ? { reply_markup: markup } : {}
      )),
      signal: AbortSignal.timeout(8e3)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) return { ok: false, error: data.description || "HTTP " + res.status };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
}
function notifyTelegram(env, ctx, html, markup) {
  const p = sendTelegram(env, html, markup).catch(() => {
  });
  if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(p);
  return p;
}
async function handleNotifyTest(request, env) {
  const pass = getEnv(env, "STATS_PASSWORD");
  if (!pass || !basicAuthOk(request, pass)) {
    return new Response("Unauthorized", { status: 401, headers: { "www-authenticate": 'Basic realm="notify test"' } });
  }
  const r = await sendTelegram(env, "✅ <b>" + tgEscape(SITE.name) + "</b>\nTelegram notifications are working.");
  return json(r, "no-store", 2);
}
async function geoData(env) {
  const { total, days } = await memo("clicks", 2e4, () => tgClickData(env));
  const ok = (cc) => /^[A-Z]{2}$/.test(cc) && cc !== "XX";
  const all = {};
  for (const k of Object.keys(total)) if (k.indexOf("c:") === 0 && ok(k.slice(2))) all[k.slice(2)] = total[k];
  const week = {};
  for (const d of tgDays(7)) {
    const day = days[d] || {};
    for (const k of Object.keys(day)) if (k.indexOf("c:") === 0 && ok(k.slice(2))) week[k.slice(2)] = (week[k.slice(2)] || 0) + day[k];
  }
  const top = Object.keys(all).sort((a, b) => all[b] - all[a]).slice(0, 80);
  const countries = {};
  for (const k of top) countries[k] = all[k];
  return { countries, week, visits: total.page || 0 };
}
async function handleGeo(env) {
  const data = await memo("geo", 3e4, () => geoData(env));
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=30", "access-control-allow-origin": "*" }
  });
}
var SNAKE_KEY = "snake:v1";
var snakeKeyMem = "";
// Signs game sessions. Uses your secret if set, otherwise a random one kept in KV.
async function snakeSecret(env) {
  const own = getEnv(env, "SNAKE_SECRET") || getEnv(env, "STATS_PASSWORD") || getEnv(env, "TELEGRAM_BOT_TOKEN");
  if (own) return own;
  if (snakeKeyMem) return snakeKeyMem;
  if (!env.STATS_KV) return snakeKeyMem = crypto.randomUUID();
  let k = await env.STATS_KV.get("snake:key");
  if (!k) {
    k = crypto.randomUUID() + crypto.randomUUID();
    await env.STATS_KV.put("snake:key", k);
  }
  return snakeKeyMem = k;
}
async function hmacSha256Hex(secret, msg) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function plainJson(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
async function loadSnake(env) {
  let rec = null;
  if (env.STATS_KV) {
    try {
      rec = await env.STATS_KV.get(SNAKE_KEY, "json");
    } catch (e) {
    }
  }
  rec = rec || {};
  rec.board = rec.board || [];
  rec.ids = rec.ids || [];
  return rec;
}
var snakePublic = (rec) => rec.board.slice(0, 10).map((e) => ({ name: e.name, score: e.score }));
async function handleSnake(request, env, ctx, url) {
  if (url.pathname === "/api/snake/start") {
    if (request.method !== "POST") return plainJson({ error: "POST only" }, 405);
    if (hitLimit(request, "snstart", 20, 6e5)) return tooMany();
    const ts = Date.now(), rnd = Math.random().toString(36).slice(2, 10);
    const sig = (await hmacSha256Hex(await snakeSecret(env), ts + "." + rnd)).slice(0, 24);
    return plainJson({ sid: ts + "." + rnd + "." + sig });
  }
  if (request.method === "GET") return plainJson(await memo("snake", 2e4, async () => ({ board: snakePublic(await loadSnake(env)) })));
  if (request.method !== "POST") return plainJson({ error: "method not allowed" }, 405);
  if (hitLimit(request, "snpost", 10, 6e5)) return tooMany();
  if (!env.STATS_KV) return plainJson({ error: "KV not configured" }, 500);
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return plainJson({ error: "bad json" }, 400);
  }
  const sid = String(body.sid || "");
  const parts = sid.split(".");
  if (parts.length !== 3) return plainJson({ error: "bad session" }, 400);
  const expected = (await hmacSha256Hex(await snakeSecret(env), parts[0] + "." + parts[1])).slice(0, 24);
  if (!safeEqual(parts[2], expected)) return plainJson({ error: "bad session" }, 403);
  const started = parseInt(parts[0], 10), now = Date.now();
  const score = Math.floor(Number(body.score));
  if (!(score >= 1 && score <= 400)) return plainJson({ error: "bad score" }, 400);
  if (!(now - started < 40 * 60 * 1e3)) return plainJson({ error: "session expired" }, 400);
  if (now - started < 1500 + score * 300) return plainJson({ error: "too fast" }, 400);
  const name = String(body.name || "").replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, 16) || "Anonymous";
  const rec = await loadSnake(env);
  if (rec.ids.indexOf(sid) !== -1) return plainJson({ error: "already submitted" }, 409);
  rec.ids = rec.ids.concat(sid).slice(-200);
  const prevTop = rec.board.length ? rec.board[0].score : 0;
  const lower = name.toLowerCase();
  const ex = rec.board.find((e) => e.name.toLowerCase() === lower);
  if (ex) {
    if (score > ex.score) {
      ex.score = score;
      ex.ts = now;
      ex.name = name;
    }
  } else rec.board.push({ name, score, ts: now });
  rec.board.sort((a, b) => b.score - a.score || a.ts - b.ts);
  rec.board = rec.board.slice(0, 20);
  await env.STATS_KV.put(SNAKE_KEY, JSON.stringify(rec));
  memoStore.delete("snake");
  const rank = rec.board.findIndex((e) => e.name.toLowerCase() === lower) + 1;
  if (rank === 1 && score > prevTop) {
    notifyTelegram(env, ctx, "🐍 <b>رکورد جدید Snake!</b>\n👤 " + tgEscape(name) + " — <b>" + score + "</b>");
  }
  return plainJson({ ok: true, rank, board: snakePublic(rec) });
}
function tgBtn(text, data) {
  return { text, callback_data: data };
}
function tgNav(view) {
  return [tgBtn("🔄 بروزرسانی", "v:" + view), tgBtn("🏠 منو", "m")];
}
var TG_MENU_TEXT = "🎛 <b>پنل " + tgEscape(SITE.name) + "</b>\nیکی از گزینه‌ها رو انتخاب کن 👇";
var TG_MENU = {
  inline_keyboard: [
    [tgBtn("📊 امروز", "v:today"), tgBtn("📈 آمار کلی", "v:total")],
    [tgBtn("📅 روند ۱۴ روز", "v:trend"), tgBtn("🌍 منبع و کشور", "v:geo")],
    [tgBtn("💰 حمایت‌ها", "v:donate"), tgBtn("👥 شبکه‌ها", "v:social")],
    [tgBtn("🎬 ویدیو و پست", "v:media"), tgBtn("💬 یادگاری", "v:gb")],
    [tgBtn("🐍 رکوردداران", "v:snake"), tgBtn("🩺 سلامت سایت", "v:health")],
    [tgBtn("💼 مدیریت دونیت", "a:don"), tgBtn("⚙️ تنظیمات", "a:set")]
  ]
};
var TG_COMMANDS = [
  { command: "menu", description: "منوی اصلی" },
  { command: "admin", description: "مدیریت دونیت" },
  { command: "settings", description: "تنظیمات" },
  { command: "cancel", description: "لغو عملیات" },
  { command: "today", description: "آمار امروز" },
  { command: "donate", description: "حمایت‌ها" },
  { command: "social", description: "تلگرام، یوتوب و گیتهاب" },
  { command: "guestbook", description: "پیام‌های یادگاری" },
  { command: "health", description: "سلامت سایت" }
];
async function tgApi(token, method, body) {
  try {
    const res = await fetch("https://api.telegram.org/bot" + token + "/" + method, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body || {}),
      signal: AbortSignal.timeout(1e4)
    });
    return await res.json().catch(() => ({ ok: false, description: "HTTP " + res.status }));
  } catch (e) {
    return { ok: false, description: String(e && e.message || e) };
  }
}
async function tgWebhookSecret(token) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token + ":pelak-webhook"));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
var tgN = (n) => Number(n || 0).toLocaleString("en-US");
var tgPad = (x, n) => {
  x = String(x);
  while (x.length < n) x += " ";
  return x;
};
var tgCut = (x, n) => {
  const a = Array.from(String(x));
  return a.length > n ? a.slice(0, n - 1).join("") + "…" : String(x);
};
var tgBar = (v, max, len) => "█".repeat(max > 0 ? Math.round(Math.min(v, max) / max * (len || 10)) : 0) || "·";
var tgDays = (n) => Array.from({ length: n }, (_, i) => new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
async function tgClickData(env) {
  let data = { total: {}, days: {}, since: null };
  if (env.STATS_KV) {
    try {
      data = await env.STATS_KV.get(CLICKS_KEY, "json") || data;
    } catch (e) {
    }
  }
  const total = Object.assign({}, data.total || {});
  const days = JSON.parse(JSON.stringify(data.days || {}));
  const today = new Date().toISOString().slice(0, 10);
  for (const k of Object.keys(clickPending)) {
    if (clickPending[k] > 0) {
      total[k] = (total[k] || 0) + clickPending[k];
      days[today] = days[today] || {};
      days[today][k] = (days[today][k] || 0) + clickPending[k];
    }
  }
  return { total, days, since: data.since || null };
}
async function tgViewToday(env) {
  const { days } = await tgClickData(env);
  const val = (d, k) => days[d] && days[d][k] || 0;
  const sum = (n, k) => tgDays(n).reduce((a, d) => a + val(d, k), 0);
  const clickKeys = STAT_LABELS.filter((x) => x[0] !== "page");
  const today = tgDays(1)[0];
  const clicksOn = (n) => clickKeys.reduce((a, x) => a + sum(n, x[0]), 0);
  let t = "📊 <b>آمار امروز</b> <i>(" + today + "، ساعت UTC)</i>\n\n";
  t += "👁 بازدید صفحه: <b>" + tgN(val(today, "page")) + "</b>\n";
  t += "🔗 کلیک روی لینک‌ها: <b>" + tgN(clicksOn(1)) + "</b>\n";
  const lines = clickKeys.filter((x) => val(today, x[0]) > 0).map((x) => "   \u2022 " + x[1] + ": " + tgN(val(today, x[0])));
  if (lines.length) t += lines.join("\n") + "\n";
  t += "\n🗓 <b>۷ روز اخیر:</b> " + tgN(sum(7, "page")) + " بازدید · " + tgN(clicksOn(7)) + " کلیک";
  t += "\n🗓 <b>۳۰ روز اخیر:</b> " + tgN(sum(30, "page")) + " بازدید · " + tgN(clicksOn(30)) + " کلیک";
  return { text: t, kb: { inline_keyboard: [tgNav("today")] } };
}
async function tgViewTotal(env) {
  const { total, days, since } = await tgClickData(env);
  const val = (d, k) => days[d] && days[d][k] || 0;
  const sum = (n, k) => tgDays(n).reduce((a, d) => a + val(d, k), 0);
  let t = "📈 <b>آمار کلی</b>" + (since ? " <i>(از " + new Date(since).toISOString().slice(0, 10) + ")</i>" : "") + "\n";
  t += "<pre>" + tgPad("", 17) + tgPad("کل", 7) + tgPad("۷ر", 6) + "۳۰ر\n";
  for (const x of STAT_LABELS) t += tgPad(x[1], 17) + tgPad(tgN(total[x[0]]), 7) + tgPad(tgN(sum(7, x[0])), 6) + tgN(sum(30, x[0])) + "\n";
  t += "</pre>";
  return { text: t, kb: { inline_keyboard: [tgNav("total")] } };
}
async function tgViewTrend(env) {
  const { days } = await tgClickData(env);
  const val = (d, k) => days[d] && days[d][k] || 0;
  const clickKeys = STAT_LABELS.filter((x) => x[0] !== "page");
  const list = tgDays(14).reverse();
  const views = list.map((d) => val(d, "page"));
  const clicks = list.map((d) => clickKeys.reduce((a, x) => a + val(d, x[0]), 0));
  const max = Math.max(1, ...views);
  let t = "📅 <b>روند ۱۴ روز اخیر</b>\n<pre>تاریخ  بازدید کلیک\n";
  list.forEach((d, i) => {
    t += d.slice(5) + "  " + tgPad(views[i], 6) + " " + tgPad(clicks[i], 5) + " " + tgBar(views[i], max, 10) + "\n";
  });
  t += "</pre>";
  return { text: t, kb: { inline_keyboard: [tgNav("trend")] } };
}
async function tgViewGeo(env) {
  const { total, days } = await tgClickData(env);
  const val = (d, k) => days[d] && days[d][k] || 0;
  const sum = (n, k) => tgDays(n).reduce((a, d) => a + val(d, k), 0);
  const top = (prefix, nameOf) => {
    const keys = new Set(Object.keys(total).filter((k) => k.startsWith(prefix)));
    const arr = [...keys].map((k) => ({ name: nameOf(k.slice(prefix.length)), all: total[k] || 0, d30: sum(30, k) })).sort((a, b) => b.all - a.all).slice(0, 8);
    return arr.length ? arr.map((r, i) => i + 1 + ". " + tgEscape(r.name) + " — <b>" + tgN(r.all) + "</b> <i>(۳۰ روز: " + tgN(r.d30) + ")</i>").join("\n") : "هنوز داده‌ای نیست";
  };
  const t = "🌍 <b>منبع ترافیک</b>\n" + top("s:", (n) => n) + "\n\n🗺 <b>کشورها</b>\n" + top("c:", countryLabel);
  return { text: t, kb: { inline_keyboard: [tgNav("geo")] } };
}
async function tgViewDonate(env, ctx) {
  const res = await getDonate(env, ctx, false, 6e3);
  const d = res.data;
  let c = null;
  if (env.STATS_KV) {
    try {
      c = await env.STATS_KV.get(CRYPTO_KEY, "json");
    } catch (e) {
    }
  }
  const parts = res.parts || {};
  const cryptoPart = (parts.crypto || 0) + (parts.extra || 0);
  const reymitPart = parts.reymit !== void 0 ? parts.reymit : Math.max(0, (d.current || 0) - cryptoPart);
  const pct = d.percent || 0;
  let t = "💰 <b>حمایت‌ها</b>\n🎯 " + tgEscape(d.title || "") + "\n";
  t += tgBar(pct, 100, 12) + " <b>" + pct + "%</b>\n";
  t += "<b>" + tgN(d.current) + "</b> / " + tgN(d.goal) + " تومان\n";
  if (d.goal > d.current) t += "باقی‌مانده: " + tgN(d.goal - d.current) + " تومان\n";
  t += "\n🧾 ریمت: " + tgN(reymitPart) + "\n⚡ کریپتو: " + tgN(cryptoPart) + "\n";
  const medals = ["🥇", "🥈", "🥉"];
  if ((d.top || []).length) {
    t += "\n🏆 <b>برترین‌ها</b>\n" + d.top.map((x, i) => medals[i] + " " + (x.crypto ? "⚡ " : "") + tgEscape(x.name) + " — " + tgN(x.amount)).join("\n") + "\n";
  }
  if (d.last && d.last.name) t += "\n🕒 آخرین حمایت: " + (d.last.crypto ? "⚡ " : "") + tgEscape(d.last.name) + " (" + tgN(d.last.amount) + ")";
  return { text: t, kb: { inline_keyboard: [tgNav("donate")] } };
}
async function tgSocial(env, force) {
  let cached = null;
  if (env.STATS_KV) {
    try {
      cached = await env.STATS_KV.get(KV_KEY, "json");
    } catch (e) {
    }
  }
  const now = Date.now();
  if (!force && cached && cached.data && cached.ts && now - cached.ts < CACHE_TTL_MS) return { data: cached.data, ts: cached.ts, errors: {} };
  const { data: fresh, errors } = await collectStats(env);
  const { data, allOk } = mergeStats(fresh, cached);
  const ts = allOk ? now : cached ? cached.ts : 0;
  if (env.STATS_KV) {
    try {
      await env.STATS_KV.put(KV_KEY, JSON.stringify({ data, ts, tried: now }));
    } catch (e) {
    }
  }
  return { data, ts: now, errors };
}
async function tgViewSocial(env, force) {
  const r = await tgSocial(env, force);
  const d = r.data || {};
  let t = "👥 <b>شبکه‌ها</b>" + (force ? " <i>(زنده)</i>" : "") + "\n\n";
  t += "✈️ تلگرام: <b>" + (typeof d.telegram === "number" ? tgN(d.telegram) : "—") + "</b> عضو\n";
  t += "▶️ یوتوب: <b>" + (typeof d.youtube === "number" ? tgN(d.youtube) : "—") + "</b> سابسکرایبر\n";
  t += "⭐ گیتهاب: <b>" + (typeof d.github === "number" ? tgN(d.github) : "—") + "</b> ستاره\n";
  if (d.repo && d.repo.name) {
    t += "\n📦 <b>" + tgEscape(d.repo.name) + "</b> — " + tgN(d.repo.stars) + " ستاره · " + tgN(d.repo.forks) + " فورک" + (d.repo.language ? " · " + tgEscape(d.repo.language) : "") + "\n";
  }
  const bad = Object.keys(r.errors || {});
  if (bad.length) t += "\n⚠️ خطا در: " + bad.join("، ");
  return { text: t, kb: { inline_keyboard: [[tgBtn("🔄 بروزرسانی زنده", "f:social"), tgBtn("🏠 منو", "m")]] } };
}
async function tgViewMedia(env) {
  const r = await tgSocial(env, false);
  const d = r.data || {};
  let t = "🎬 <b>آخرین ویدیوها</b>\n";
  if ((d.videos || []).length) {
    t += d.videos.map((v) => '\u2022 <a href="https://youtu.be/' + v.id + '">' + tgEscape(tgCut(v.title, 60)) + "</a>" + (typeof v.views === "number" ? " — " + tgN(v.views) + " بازدید" : "") + (typeof v.likes === "number" ? " · " + tgN(v.likes) + " لایک" : "")).join("\n");
  } else t += "ویدیویی پیدا نشد\n";
  t += "\n\n📝 <b>آخرین پست‌های کانال</b>\n";
  if ((d.posts || []).length) {
    t += d.posts.map((p) => '\u2022 <a href="https://t.me/' + TELEGRAM_CHANNEL + "/" + p.n + '">' + tgEscape(tgCut(p.text, 80)) + "</a>" + (p.views ? " — " + tgEscape(p.views) + " بازدید" : "")).join("\n");
  } else t += "پستی پیدا نشد";
  return { text: t, kb: { inline_keyboard: [tgNav("media")] } };
}
async function tgViewGb(env) {
  let msgs = [];
  if (env.STATS_KV) {
    try {
      msgs = await env.STATS_KV.get(GUESTBOOK_KEY, "json") || [];
    } catch (e) {
    }
  }
  if (!msgs.length) return { text: "💬 <b>دفتر یادگاری</b>\nهنوز پیامی نیست.", kb: { inline_keyboard: [tgNav("gb")] } };
  const last = msgs.slice(0, 5);
  let t = "💬 <b>دفتر یادگاری</b> <i>(" + tgN(msgs.length) + " پیام، ۵ تای آخر)</i>\n\n";
  last.forEach((m, i) => {
    t += i + 1 + ". 👤 <b>" + tgEscape(m.name) + "</b> <i>" + new Date(m.date).toISOString().slice(0, 16).replace("T", " ") + "</i>\n" + tgEscape(tgCut(m.text, 200)) + "\n\n";
  });
  const row = last.map((m, i) => tgBtn("🗑 " + (i + 1), "gd:" + m.id));
  return { text: t, kb: { inline_keyboard: [row, tgNav("gb")] } };
}
async function tgViewSnake(env) {
  const rec = await loadSnake(env);
  const b = rec.board.slice(0, 10);
  if (!b.length) return { text: "🐍 <b>رکوردداران Snake</b>\nهنوز کسی بازی نکرده.", kb: { inline_keyboard: [tgNav("snake")] } };
  const medals = ["🥇", "🥈", "🥉"];
  let t = "🐍 <b>رکوردداران Snake</b>\n\n";
  b.forEach((e, i) => {
    t += (medals[i] || i + 1 + ".") + " " + tgEscape(e.name) + " — <b>" + e.score + "</b>\n";
  });
  const row = b.slice(0, 5).map((e, i) => tgBtn("🗑 " + (i + 1), "sd:" + e.ts));
  return { text: t, kb: { inline_keyboard: [row, tgNav("snake")] } };
}
async function tgViewHealth(env, ctx) {
  const { data, errors } = await collectStats(env);
  const names = { youtube: "یوتوب", github: "گیتهاب", telegram: "تلگرام", videos: "ویدیوها", posts: "پست‌ها" };
  let t = "🩺 <b>سلامت سایت</b>\n\n<b>منابع آمار (زنده)</b>\n";
  for (const k of Object.keys(names)) t += (data[k] !== null && data[k] !== void 0 ? "✅ " : "❌ ") + names[k] + (errors[k] ? " — " + tgEscape(tgCut(errors[k], 90)) : "") + "\n";
  let reymitOk = false;
  try {
    const r = await getDonate(env, ctx, true);
    reymitOk = !!(r.raw && (r.raw.goal || r.raw.top || r.raw.last));
  } catch (e) {
  }
  t += (reymitOk ? "✅ " : "❌ ") + "ریمت (دونیت)\n";
  const flag = (b) => b ? "✅" : "➖";
  t += "\n<b>تنظیمات</b>\n";
  t += flag(!!env.STATS_KV) + " KV (STATS_KV)\n";
  t += flag(!!getEnv(env, "YOUTUBE_API_KEY")) + " YOUTUBE_API_KEY\n";
  t += flag(!!getEnv(env, "GITHUB_TOKEN")) + " GITHUB_TOKEN\n";
  t += flag(!!getEnv(env, "STATS_PASSWORD")) + " STATS_PASSWORD\n";
  t += flag(!!getEnv(env, "NOWPAYMENTS_IPN_SECRET")) + " NOWPAYMENTS_IPN_SECRET\n";
  await loadRate(env);
  t += flag(rateNow(env) > 0) + " نرخ تتر: " + tgN(rateNow(env)) + " (" + tgEscape(RATE_MEM.src || "—") + ")\n";
  return { text: t, kb: { inline_keyboard: [tgNav("health")] } };
}
// ===== admin module: config, USD rate, donation management, cron, reports, channel =====
var CFG_KEY = "cfg:v1";
var EXTRA_KEY = "donate:extra:v1";
var RATE_KEY = "rate:v1";
var HALL_KEY = "donate:hall:v1";
var NOTIF_KEY = "notif:v1";
var LEDGER_KEY = "don:day:v1";
var PEND_KEY = "tg:pend";
var TG_CMDS_VER = 2;
var RATE_MEM = { v: 0, src: "", ts: 0 };
var DEFAULT_ANN_TPL = "💚 <b>{name}</b> عزیز، ممنون از حمایتت!\n💰 {amount} تومان\n\n🎯 {goal}: {percent}٪\n🙏 حمایت: {link}";
async function loadCfg(env) {
  if (!env || !env.STATS_KV) return {};
  try {
    return await memo("cfg", 15e3, async () => await env.STATS_KV.get(CFG_KEY, "json") || {});
  } catch (e) {
    return {};
  }
}
async function saveCfg(env, patch) {
  const cur = await env.STATS_KV.get(CFG_KEY, "json").catch(() => null) || {};
  for (const k of Object.keys(patch)) {
    if (patch[k] === null || patch[k] === void 0) delete cur[k];
    else cur[k] = patch[k];
  }
  await env.STATS_KV.put(CFG_KEY, JSON.stringify(cur));
  memoStore.delete("cfg");
  memoStore.delete("rate");
  donateMem = null;
  return cur;
}
async function fetchUsdtRate() {
  const get = async (u) => {
    const r = await fetch(u, { headers: { "User-Agent": UA, "Accept": "application/json" }, signal: AbortSignal.timeout(6e3) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  };
  const ok = (v) => v > 1e4 && v < 1e7;
  try {
    const j = await get("https://apiv2.nobitex.ir/market/stats?srcCurrency=usdt&dstCurrency=rls");
    const v = parseFloat(j && j.stats && j.stats["usdt-rls"] && j.stats["usdt-rls"].latest) / 10;
    if (ok(v)) return { v: Math.round(v), src: "Nobitex" };
  } catch (e) {
  }
  try {
    const j = await get("https://api.tetherland.com/currencies");
    const v = parseFloat(j && j.data && j.data.currencies && j.data.currencies.USDT && j.data.currencies.USDT.price);
    if (ok(v)) return { v: Math.round(v), src: "Tetherland" };
  } catch (e) {
  }
  try {
    const j = await get("https://api.bitpin.ir/api/v1/mkt/tickers/");
    const t = Array.isArray(j) ? j.find((x) => x && x.symbol === "USDT_IRT") : null;
    const v = parseFloat(t && t.price);
    if (ok(v)) return { v: Math.round(v), src: "Bitpin" };
  } catch (e) {
  }
  return null;
}
async function refreshRate(env, force) {
  if (!env.STATS_KV) return null;
  let r = await env.STATS_KV.get(RATE_KEY, "json").catch(() => null);
  if (!force && r && Date.now() - r.ts < 30 * 6e4) return r;
  const f = await fetchUsdtRate();
  if (f) {
    r = { v: f.v, src: f.src, ts: Date.now() };
    await env.STATS_KV.put(RATE_KEY, JSON.stringify(r));
    memoStore.delete("rate");
  }
  return r;
}
async function loadRate(env) {
  const envRate = env ? parseFloat(getEnv(env, "USD_TO_TOMAN")) || 0 : 0;
  if (!env || !env.STATS_KV) {
    RATE_MEM = { v: envRate, src: "env", ts: 0 };
    return RATE_MEM.v;
  }
  const cfg = await loadCfg(env);
  if (cfg.rateMode === "manual" && cfg.rateManual > 0) {
    RATE_MEM = { v: cfg.rateManual, src: "manual", ts: cfg.rateManualTs || 0 };
    return RATE_MEM.v;
  }
  let r = null;
  try {
    r = await memo("rate", 6e4, async () => await env.STATS_KV.get(RATE_KEY, "json"));
  } catch (e) {
  }
  if (r && r.v > 0) RATE_MEM = { v: r.v, src: r.src, ts: r.ts };
  else RATE_MEM = { v: envRate, src: "env", ts: 0 };
  return RATE_MEM.v;
}
function rateNow(env) {
  return RATE_MEM.v || (env ? parseFloat(getEnv(env, "USD_TO_TOMAN")) || 0 : 0);
}
function mergeExtras(data, o) {
  const out = Object.assign({}, data);
  const hall = o.hall || {};
  const alias = hall.alias || {};
  const hidden = hall.hidden || {};
  const c = o.crypto || {};
  const x = o.extra || {};
  const add = Math.max(0, (c.total || 0) - (o.cryptoBase || 0)) + Math.max(0, (x.total || 0) - (o.extraBase || 0));
  if (add > 0) {
    out.current = (data.current || 0) + add;
    out.percent = out.goal > 0 ? parseFloat((out.current / out.goal * 100).toFixed(1)) : data.percent;
  }
  const map = {};
  const base = o.full && o.full.length ? o.full : data.top || [];
  for (const t of base) map[t.name] = { name: t.name, amount: t.amount };
  const put = (byName, isCrypto) => {
    for (const k of Object.keys(byName || {})) {
      const cn = alias[k] || k;
      if (hidden[cn]) continue;
      if (map[cn]) map[cn].amount += byName[k];
      else map[cn] = isCrypto ? { name: cn, amount: byName[k], crypto: true } : { name: cn, amount: byName[k] };
    }
  };
  put(c.byName, true);
  put(x.byName, false);
  out.top = Object.values(map).sort((a, b) => b.amount - a.amount).slice(0, 3);
  let lastTs = data.lastAt || 0;
  if (c.last && c.last.ts > lastTs) {
    out.last = { name: alias[c.last.name] || c.last.name, amount: c.last.amount, crypto: true };
    lastTs = c.last.ts;
  }
  if (x.last && x.last.ts > lastTs) {
    out.last = { name: alias[x.last.name] || x.last.name, amount: x.last.amount };
  }
  return out;
}
function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}
async function ledgerAdd(env, amount, day) {
  if (!env.STATS_KV || !amount) return;
  try {
    const l = await env.STATS_KV.get(LEDGER_KEY, "json") || {};
    const d = day || todayUtc();
    l[d] = l[d] || { s: 0, n: 0 };
    l[d].s = Math.max(0, l[d].s + amount);
    l[d].n = Math.max(0, l[d].n + (amount > 0 ? 1 : -1));
    const keys = Object.keys(l).sort();
    while (keys.length > 60) delete l[keys.shift()];
    await env.STATS_KV.put(LEDGER_KEY, JSON.stringify(l));
  } catch (e) {
  }
}
async function ledgerSum(env, days) {
  const l = await env.STATS_KV.get(LEDGER_KEY, "json").catch(() => null) || {};
  let s = 0, n = 0;
  for (const d of tgDays(days)) if (l[d]) {
    s += l[d].s;
    n += l[d].n;
  }
  return { s, n };
}
// ---------- channel announcements ----------
function annFill(tpl, v) {
  return String(tpl || DEFAULT_ANN_TPL).replace(/\{(name|amount|goal|percent|current|target|link)\}/g, (m, k) => v[k] !== void 0 ? v[k] : m);
}
async function annBuild(env, ctx, d) {
  const cfg = await loadCfg(env);
  let g = null;
  try {
    g = (await getDonate(env, ctx, false, 6e4)).data;
  } catch (e) {
  }
  return annFill(cfg.annTpl, {
    name: tgEscape(d.name || "دوست"),
    amount: tgN(d.amount),
    goal: tgEscape(g && g.title || ""),
    percent: g ? g.percent : 0,
    current: tgN(g && g.current),
    target: tgN(g && g.goal),
    link: shortUrl(DONATE_URL)
  });
}
async function tgSendTo(env, chatId, text) {
  const token = getEnv(env, "TELEGRAM_BOT_TOKEN");
  let r = await tgApi(token, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true });
  if (!r.ok && /parse|entit/i.test(r.description || "")) {
    r = await tgApi(token, "sendMessage", { chat_id: chatId, text: text.replace(/<[^>]+>/g, ""), disable_web_page_preview: true });
  }
  return r;
}
async function announceDonation(env, ctx, d) {
  const cfg = await loadCfg(env);
  const mode = cfg.annMode || "off";
  if (mode === "off" || !cfg.channel || !env.STATS_KV) return;
  const text = await annBuild(env, ctx, d);
  if (mode === "auto") {
    const r = await tgSendTo(env, cfg.channel, text);
    await sendTelegram(env, r.ok ? "📢 اعلام دونیت در کانال منتشر شد." : "⚠️ انتشار در کانال ناموفق بود: " + tgEscape(r.description || ""));
    return;
  }
  const id = Date.now().toString(36);
  await env.STATS_KV.put("ann:" + id, JSON.stringify({ text }), { expirationTtl: 7 * 86400 });
  await sendTelegram(env, "📢 <b>پیش‌نمایش اعلام در کانال</b>\n\n" + text, {
    inline_keyboard: [[tgBtn("✅ انتشار", "an:p:" + id), tgBtn("🗑 رد", "an:x:" + id)]]
  });
}
// ---------- cron ----------
async function runCron(env, ctx) {
  if (!env.STATS_KV) return;
  // Nothing to do until the Telegram bot or Reymit is set up: save the free KV quota
  if (!getEnv(env, "TELEGRAM_BOT_TOKEN") && !getEnv(env, "REYMIT_GOAL_URL") && !getEnv(env, "REYMIT_TOP_URL") && !getEnv(env, "REYMIT_LAST_URL")) return;
  let res = null;
  try {
    res = await getDonate(env, ctx, false, 1);
  } catch (e) {
  }
  await cronDonations(env, ctx, res).catch(() => {
  });
  await cronMonitor(env, res).catch(() => {
  });
  if (DONATE_ON) await refreshRate(env, false).catch(() => {
  });
  await cronReports(env, ctx).catch(() => {
  });
  await cronBackup(env).catch(() => {
  });
  await cronCommands(env).catch(() => {
  });
}
async function cronDonations(env, ctx, res) {
  if (!res || !res.fetchOk || !res.reymit || !env.STATS_KV) return;
  const rm = res.reymit;
  const st = await env.STATS_KV.get(NOTIF_KEY, "json").catch(() => null);
  const MS = [25, 50, 75, 100];
  const pct = res.data && res.data.percent || 0;
  const reached = MS.filter((m) => pct >= m);
  if (!st || !rm.sig || st.sig !== rm.sig) {
    if (!rm.sig && st) return;
    await env.STATS_KV.put(NOTIF_KEY, JSON.stringify({ sig: rm.sig, current: rm.current, ms: reached, tx: rm.txs || [], mc: res.data && res.data.current || 0 }));
    return;
  }
  const next = { sig: st.sig, current: st.current, ms: st.ms || [], tx: st.tx || [], mc: st.mc || 0 };
  let changed = false;
  if (res.data && res.data.current !== next.mc) {
    next.mc = res.data.current;
    changed = true;
  }
  if (rm.current > st.current) {
    const added = rm.current - st.current;
    const d = res.data;
    let msg = "💚 <b>حمایت جدید!</b>\n+" + tgN(added) + " تومان";
    if (rm.last && rm.last.name) msg += "\n👤 " + tgEscape(rm.last.name) + " (" + tgN(rm.last.amount) + ")";
    msg += "\n📊 " + tgN(d.current) + " / " + tgN(d.goal) + " تومان (" + d.percent + "%)";
    await sendTelegram(env, msg);
    await ledgerAdd(env, added);
    await announceDonation(env, ctx, { name: rm.last && rm.last.name || "", amount: rm.last && rm.last.amount || added });
    next.current = rm.current;
    changed = true;
  } else if (rm.current < st.current) {
    next.current = rm.current;
    changed = true;
  }
  const fresh = reached.filter((m) => next.ms.indexOf(m) === -1);
  if (fresh.length) {
    const top = Math.max(...fresh);
    await sendTelegram(env, (top >= 100 ? "🎉" : "🎯") + " <b>هدف به " + top + "٪ رسید!</b>\n" + tgEscape(res.data.title || "") + "\n" + tgN(res.data.current) + " / " + tgN(res.data.goal) + " تومان");
    next.ms = next.ms.concat(fresh);
    changed = true;
  }
  if (rm.txs && rm.txs.length && JSON.stringify(rm.txs) !== JSON.stringify(next.tx)) {
    next.tx = rm.txs;
    changed = true;
  }
  if (changed) await env.STATS_KV.put(NOTIF_KEY, JSON.stringify(next));
}
async function cronMonitor(env, res) {
  if (!env.STATS_KV || !res || !res.reymitOn) return;
  const cfg = await loadCfg(env);
  const ok = !!res.fetchOk;
  const m = await env.STATS_KV.get("mon:v1", "json").catch(() => null) || { fails: 0, alerted: false, since: 0 };
  if (ok) {
    if (m.alerted && cfg.alerts !== false) {
      await sendTelegram(env, "✅ <b>ارتباط با ریمیت برقرار شد</b>\nقطعی حدود " + Math.max(1, Math.round((Date.now() - m.since) / 6e4)) + " دقیقه طول کشید.");
    }
    if (m.fails || m.alerted) await env.STATS_KV.put("mon:v1", JSON.stringify({ fails: 0, alerted: false, since: 0 }));
    return;
  }
  m.fails = (m.fails || 0) + 1;
  if (!m.since) m.since = Date.now();
  if (m.fails >= 5 && !m.alerted) {
    m.alerted = true;
    if (cfg.alerts !== false) await sendTelegram(env, "⚠️ <b>ریمیت جواب نمی‌ده</b>\n" + m.fails + " دقیقه‌ست که اطلاعات دونیت گرفته نمی‌شه (پراکسی ایران و خود ریمیت). پیام حمایت‌های جدید تا وصل شدن دوباره نمیاد.");
  }
  await env.STATS_KV.put("mon:v1", JSON.stringify(m));
}
async function cronReports(env, ctx) {
  const now = new Date();
  if (now.getUTCHours() < 20) return;
  const cfg = await loadCfg(env);
  const day = todayUtc();
  const rep = await env.STATS_KV.get("rep:v1", "json").catch(() => null) || {};
  let changed = false;
  if (cfg.daily !== false && rep.daily !== day) {
    rep.daily = day;
    changed = true;
    await env.STATS_KV.put("rep:v1", JSON.stringify(rep));
    await sendTelegram(env, await buildDailyReport(env, ctx));
  }
  if (cfg.weekly !== false && now.getUTCDay() === 5 && rep.weekly !== day) {
    rep.weekly = day;
    changed = true;
    await env.STATS_KV.put("rep:v1", JSON.stringify(rep));
    await sendTelegram(env, await buildWeeklyReport(env, ctx));
  }
  return changed;
}
async function buildDailyReport(env, ctx) {
  const today = (await tgViewToday(env)).text.split("\n\n🗓")[0].replace("📊 <b>آمار امروز</b>", "🌙 <b>گزارش روزانه</b>");
  const led = await ledgerSum(env, 1);
  let d = null;
  try {
    d = (await getDonate(env, ctx, false, 6e4)).data;
  } catch (e) {
  }
  let t = today + "\n\n💰 حمایت امروز: <b>" + tgN(led.s) + "</b> تومان (" + led.n + " مورد)";
  if (d) t += "\n🎯 " + tgEscape(d.title || "") + ": " + tgBar(d.percent, 100, 10) + " " + d.percent + "%\n" + tgN(d.current) + " / " + tgN(d.goal) + " تومان";
  t += "\n💵 نرخ تتر: " + tgN(rateNow(env)) + " تومان";
  return t;
}
async function buildWeeklyReport(env, ctx) {
  const trend = (await tgViewTrend(env)).text;
  const led = await ledgerSum(env, 7);
  return "📅 <b>گزارش هفتگی</b>\n💰 حمایت ۷ روز اخیر: <b>" + tgN(led.s) + "</b> تومان (" + led.n + " مورد)\n\n" + trend;
}
async function cronCommands(env) {
  const cfg = await loadCfg(env);
  if (cfg.cmdsVer === TG_CMDS_VER) return;
  const token = getEnv(env, "TELEGRAM_BOT_TOKEN");
  if (!token) return;
  const r = await tgApi(token, "setMyCommands", { commands: TG_COMMANDS });
  if (r.ok) await saveCfg(env, { cmdsVer: TG_CMDS_VER });
}
// ---------- admin views ----------
var tgBack = (to) => [tgBtn("↩️ بازگشت", to), tgBtn("🏠 منو", "m")];
async function setPend(env, a, d) {
  await env.STATS_KV.put(PEND_KEY, JSON.stringify({ a, d: d === void 0 ? null : d, exp: Date.now() + 15 * 6e4 }));
}
async function getPend(env) {
  const p = await env.STATS_KV.get(PEND_KEY, "json").catch(() => null);
  return p && p.exp > Date.now() ? p : null;
}
async function clearPend(env) {
  await env.STATS_KV.delete(PEND_KEY).catch(() => {
  });
}
async function loadHall(env) {
  const h = await env.STATS_KV.get(HALL_KEY, "json").catch(() => null) || {};
  h.byName = h.byName || {};
  h.alias = h.alias || {};
  h.hidden = h.hidden || {};
  return h;
}
async function saveHall(env, h) {
  await env.STATS_KV.put(HALL_KEY, JSON.stringify(h));
  donateMem = null;
  memoStore.delete("donate");
}
function shortKey(k) {
  if (!k) return "—";
  const s = decodeURIComponent(String(k));
  return s.length > 14 ? s.slice(0, 6) + "…" + s.slice(-6) : s;
}
async function viewAdminDonate(env, ctx) {
  const r = await getDonate(env, ctx, false, 6e3);
  const d = r.data, p = r.parts || {};
  let t = "💼 <b>مدیریت دونیت</b>\n🎯 " + tgEscape(d.title || "") + "\n" + tgBar(d.percent, 100, 12) + " <b>" + d.percent + "%</b>\n" + tgN(d.current) + " / " + tgN(d.goal) + " تومان\n";
  if (p.reymit !== void 0) t += "\n🧾 ریمیت: " + tgN(p.reymit) + "\n⚡ کریپتو: " + tgN(p.crypto) + "\n✍️ دستی: " + tgN(p.extra) + "\n";
  t += "\n💵 نرخ تتر: " + tgN(rateNow(env)) + " (" + tgEscape(RATE_MEM.src || "—") + ")";
  return { text: t, kb: { inline_keyboard: [
    [tgBtn("🏆 برترین‌ها", "a:hl:0"), tgBtn("➕ ثبت دونیت دستی", "a:md")],
    [tgBtn("🧾 دستی و کریپتو", "a:it"), tgBtn("⚡ لاگ NOWPayments", "a:ipn")],
    [tgBtn("🔗 لینک‌های ریمیت", "a:ov"), tgBtn("⚙️ تنظیمات", "a:set")],
    [tgBtn("🔄 بروزرسانی", "a:don"), tgBtn("🏠 منو", "m")]
  ] } };
}
async function viewHall(env, page) {
  const h = await loadHall(env);
  const names = Object.keys(h.byName).filter((k) => !h.hidden[k]).sort((a, b) => h.byName[b] - h.byName[a]);
  await env.STATS_KV.put("tg:hsnap", JSON.stringify(names));
  const per = 8, pages = Math.max(1, Math.ceil(names.length / per));
  page = Math.min(Math.max(0, page), pages - 1);
  const rows = [];
  let t = "🏆 <b>برترین حامی‌ها (همه‌ی هدف‌ها)</b>\nروی هر اسم بزن تا ویرایش، ادغام یا حذفش کنی.\n";
  names.slice(page * per, page * per + per).forEach((n, i) => {
    const idx = page * per + i;
    rows.push([tgBtn(idx + 1 + ". " + tgCut(n, 22) + " — " + tgN(h.byName[n]), "h:e:" + idx)]);
  });
  if (!names.length) t += "\nهنوز کسی ثبت نشده.";
  const nav = [];
  if (page > 0) nav.push(tgBtn("◀️ قبلی", "a:hl:" + (page - 1)));
  if (pages > 1) nav.push(tgBtn(page + 1 + "/" + pages, "a:hl:" + page));
  if (page < pages - 1) nav.push(tgBtn("بعدی ▶️", "a:hl:" + (page + 1)));
  if (nav.length) rows.push(nav);
  const hid = Object.keys(h.hidden).length;
  if (hid) rows.push([tgBtn("♻️ حذف‌شده‌ها (" + hid + ")", "a:hd")]);
  rows.push(tgBack("a:don"));
  return { text: t, kb: { inline_keyboard: rows } };
}
async function hallNameAt(env, idx) {
  const snap = await env.STATS_KV.get("tg:hsnap", "json").catch(() => null) || [];
  return snap[idx];
}
async function viewHallEntry(env, idx) {
  const name = await hallNameAt(env, idx);
  const h = await loadHall(env);
  if (!name || h.byName[name] === void 0) return { text: "این اسم دیگه توی لیست نیست.", kb: { inline_keyboard: [tgBack("a:hl:0")] } };
  const al = Object.keys(h.alias).filter((k) => h.alias[k] === name);
  let t = "👤 <b>" + tgEscape(name) + "</b>\n💰 " + tgN(h.byName[name]) + " تومان";
  if (al.length) t += "\n🔗 اسم‌های ادغام‌شده: " + al.map(tgEscape).join("، ");
  return { text: t, kb: { inline_keyboard: [
    [tgBtn("✏️ تغییر نام / ادغام", "h:r:" + idx), tgBtn("🔢 ویرایش مبلغ", "h:a:" + idx)],
    [tgBtn("🗑 حذف از لیست", "h:d:" + idx)],
    tgBack("a:hl:0")
  ] } };
}
async function hallRename(env, from, to) {
  const h = await loadHall(env);
  to = String(to).trim().slice(0, 40);
  if (!to || from === to || h.byName[from] === void 0) return false;
  h.byName[to] = (h.byName[to] || 0) + h.byName[from];
  delete h.byName[from];
  for (const k of Object.keys(h.alias)) if (h.alias[k] === from) h.alias[k] = to;
  h.alias[from] = to;
  delete h.alias[to];
  delete h.hidden[to];
  await saveHall(env, h);
  return true;
}
async function viewHidden(env) {
  const h = await loadHall(env);
  const names = Object.keys(h.hidden);
  await env.STATS_KV.put("tg:hidsnap", JSON.stringify(names));
  const rows = names.slice(0, 20).map((n, i) => [tgBtn("♻️ " + tgCut(n, 28), "h:u:" + i)]);
  rows.push(tgBack("a:hl:0"));
  return { text: "♻️ <b>اسم‌های حذف‌شده</b>\nبرای برگردوندن، روی اسم بزن." + (names.length ? "" : "\n\nخالیه."), kb: { inline_keyboard: rows } };
}
function parseAmount(s) {
  const t = faDigits(String(s)).replace(/[,٬،\s]/g, "").toLowerCase();
  const m = t.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!(n > 0)) return null;
  const usd = /\$|usd|dollar|دلار|تتر|usdt/.test(t);
  let mult = 1;
  if (/میلیون|m(?![a-z])/.test(t)) mult = 1e6;
  else if (/هزار|k(?![a-z])/.test(t)) mult = 1e3;
  return usd ? { usd: n } : { toman: Math.round(n * mult) };
}
async function hallBaseAdd(env, store, amount) {
  const h = await loadHall(env);
  const k = store === "c" ? "cryptoBase" : "extraBase";
  h[k] = Math.max(0, (h[k] || 0) + amount);
  await saveHall(env, h);
}
async function addManual(env, ctx, store, name, amount, usd, goalId) {
  const key = store === "c" ? CRYPTO_KEY : EXTRA_KEY;
  const past = goalId === "past";
  const c = await env.STATS_KV.get(key, "json").catch(() => null) || { total: 0, byName: {}, last: null, ids: [] };
  c.byName = c.byName || {};
  c.total = (c.total || 0) + amount;
  c.byName[name] = (c.byName[name] || 0) + amount;
  if (!past) c.last = { name, amount, ts: Date.now() };
  c.items = [{ id: "m" + Date.now().toString(36), name, amount, usd: usd || 0, ts: Date.now(), src: "manual", past }].concat(c.items || []).slice(0, 40);
  await env.STATS_KV.put(key, JSON.stringify(c));
  if (past) {
    await hallBaseAdd(env, store, amount);
  } else {
    await ledgerAdd(env, amount);
  }
  donateMem = null;
  memoStore.delete("donate");
  if (!past) await announceDonation(env, ctx, { name, amount, crypto: store === "c" });
}
async function viewItems(env) {
  const c = await env.STATS_KV.get(CRYPTO_KEY, "json").catch(() => null) || {};
  const x = await env.STATS_KV.get(EXTRA_KEY, "json").catch(() => null) || {};
  const all = (c.items || []).map((i) => Object.assign({ st: "c" }, i)).concat((x.items || []).map((i) => Object.assign({ st: "x" }, i))).sort((a, b) => b.ts - a.ts).slice(0, 12);
  let t = "🧾 <b>دونیت‌های کریپتو و دستی</b>\n";
  if (!all.length) t += "\nچیزی ثبت نشده. (دونیت‌های کریپتوی قبل از این نسخه اینجا نمیان.)";
  const rows = all.map((i) => [tgBtn((i.st === "c" ? "⚡ " : "✍️ ") + tgCut(i.name, 16) + " — " + tgN(i.amount) + " · " + new Date(i.ts).toISOString().slice(5, 10), "i:d:" + i.st + ":" + i.id)]);
  rows.push(tgBack("a:don"));
  return { text: t + "\nبرای حذف، روی مورد بزن.", kb: { inline_keyboard: rows } };
}
async function removeItem(env, st, id) {
  const key = st === "c" ? CRYPTO_KEY : EXTRA_KEY;
  const c = await env.STATS_KV.get(key, "json").catch(() => null);
  if (!c || !c.items) return null;
  const it = c.items.find((i) => i.id === id);
  if (!it) return null;
  c.items = c.items.filter((i) => i.id !== id);
  c.total = Math.max(0, (c.total || 0) - it.amount);
  if (c.byName && c.byName[it.name] !== void 0) {
    c.byName[it.name] -= it.amount;
    if (c.byName[it.name] <= 0) delete c.byName[it.name];
  }
  if (c.last && c.last.name === it.name && c.last.amount === it.amount) c.last = c.items[0] ? { name: c.items[0].name, amount: c.items[0].amount, ts: c.items[0].ts } : null;
  await env.STATS_KV.put(key, JSON.stringify(c));
  if (it.past) await hallBaseAdd(env, st === "c" ? "c" : "x", -it.amount);
  else await ledgerAdd(env, -it.amount, new Date(it.ts).toISOString().slice(0, 10));
  donateMem = null;
  memoStore.delete("donate");
  return it;
}
async function viewIpnLog(env) {
  const list = await env.STATS_KV.get("crypto:ipnlog", "json").catch(() => null) || [];
  const lbl = { counted: "✅ ثبت شد", ignored: "⏳ نادیده (وضعیت)", bad_sig: "⛔ امضای نامعتبر", no_usd: "⚠️ بدون مبلغ دلاری" };
  let t = "⚡ <b>لاگ NOWPayments</b>\n";
  if (!list.length) t += "\nهنوز هیچ پیامی از NOWPayments نرسیده. یعنی آدرس IPN توی داشبورد NOWPayments تنظیم نشده یا هنوز پرداختی نبوده.\n\nآدرس: <code>https://YOUR-DOMAIN/api/nowpayments-ipn</code>";
  for (const e of list.slice(0, 12)) t += "\n" + e.t.slice(5, 16).replace("T", " ") + " · " + (lbl[e.r] || e.r) + (e.st ? " · " + tgEscape(e.st) : "") + (e.toman ? " · " + tgN(e.toman) : "");
  return { text: t, kb: { inline_keyboard: [[tgBtn("🔄 بروزرسانی", "a:ipn")], tgBack("a:don")] } };
}
async function viewOverlays(env) {
  const cfg = await loadCfg(env);
  const row = (lbl, k) => lbl + ": " + (cfg[k] ? "<code>" + tgEscape(shortKey(cfg[k])) + "</code> (از ربات)" : "تنظیم نشده");
  const t = "🔗 <b>لینک‌های اورلی ریمیت</b>\n\n" + row("🎯 هدف", "goalKey") + "\n" + row("🏆 برترین‌ها", "topKey") + "\n" + row("🕒 آخرین حامی", "lastKey") + "\n\nبرای عوض کردن، «تغییر لینک» رو بزن و لینک(ها) رو بفرست. نوعشون خودکار تشخیص داده می‌شه.";
  return { text: t, kb: { inline_keyboard: [[tgBtn("✏️ تغییر لینک", "a:ovs"), tgBtn("↩️ پیش‌فرض", "a:ovr")], tgBack("a:don")] } };
}
async function classifyOverlay(key, env) {
  const r = await fetchReymitOverlay(key, env);
  const j = r && r.json;
  if (!j) return null;
  if (j.goal && (j.goal.goalamount !== void 0 || j.goal.have)) return { type: "goalKey", info: j.goal.name ? "«" + j.goal.name + "»" : "" };
  if (j.tops && j.tops.LLast) return { type: "lastKey", info: j.tops.LLast.name || "" };
  if (j.tops || Array.isArray(j.transactions)) return { type: "topKey", info: "" };
  return null;
}
async function viewSettings(env) {
  const cfg = await loadCfg(env);
  await loadRate(env);
  const on = (b) => b ? "✅" : "❌";
  const rr = await env.STATS_KV.get(RATE_KEY, "json").catch(() => null);
  let t = "⚙️ <b>تنظیمات</b>\n\n💵 <b>نرخ تتر:</b> " + tgN(rateNow(env)) + " تومان\n";
  t += cfg.rateMode === "manual" ? "حالت: دستی ✍️" : "حالت: خودکار 🔄" + (rr ? " · " + tgEscape(rr.src) + " · " + Math.round((Date.now() - rr.ts) / 6e4) + " دقیقه پیش" : " · هنوز گرفته نشده");
  t += "\n\n" + on(cfg.backup !== false) + " بکاپ روزانه (۴ صبح تهران)\n" + on(cfg.daily !== false) + " گزارش روزانه (۲۳:۳۰ تهران)\n" + on(cfg.weekly !== false) + " گزارش هفتگی (جمعه)\n" + on(cfg.alerts !== false) + " هشدار قطعی ریمیت\n";
  t += "\n📢 کانال: " + (cfg.channel ? tgEscape(String(cfg.channel)) : "تنظیم نشده") + " · " + ({ off: "خاموش", confirm: "با تأیید", auto: "خودکار" }[cfg.annMode || "off"]);
  return { text: t, kb: { inline_keyboard: [
    [tgBtn("🔄 نرخ خودکار", "s:ra"), tgBtn("✍️ نرخ دستی", "s:rm"), tgBtn("⟳ همین الان", "s:rr")],
    [tgBtn(on(cfg.daily !== false) + " روزانه", "s:t:daily"), tgBtn(on(cfg.weekly !== false) + " هفتگی", "s:t:weekly"), tgBtn(on(cfg.alerts !== false) + " هشدار", "s:t:alerts")],
    [tgBtn(on(cfg.backup !== false) + " بکاپ روزانه", "s:t:backup"), tgBtn("💾 بکاپ الان", "s:bk"), tgBtn("♻️ بازگردانی", "s:rs")],
    [tgBtn("🌙 گزارش الان", "s:dr"), tgBtn("📢 کانال", "a:ch")],
    tgBack("a:don")
  ] } };
}
async function viewChannel(env) {
  const cfg = await loadCfg(env);
  const mode = cfg.annMode || "off";
  const mk = (m, l) => tgBtn((mode === m ? "● " : "") + l, "s:am:" + m);
  const t = "📢 <b>اعلام دونیت در کانال</b>\n\nکانال: " + (cfg.channel ? tgEscape(String(cfg.channel)) : "تنظیم نشده") + "\n\n<b>قالب پیام:</b>\n<pre>" + tgEscape(cfg.annTpl || DEFAULT_ANN_TPL) + "</pre>\nمتغیرها: {name} {amount} {goal} {percent} {current} {target} {link}\n\n«با تأیید» یعنی اول پیش‌نمایش برای تو میاد و با یه دکمه منتشر می‌شه.";
  return { text: t, kb: { inline_keyboard: [
    [mk("off", "خاموش"), mk("confirm", "با تأیید"), mk("auto", "خودکار")],
    [tgBtn("🔗 تنظیم کانال", "s:ch"), tgBtn("✏️ ویرایش قالب", "s:tp")],
    [tgBtn("👁 پیش‌نمایش", "s:pv"), tgBtn("↩️ قالب پیش‌فرض", "s:tr")],
    tgBack("a:set")
  ] } };
}
var CANCEL_KB = { inline_keyboard: [[tgBtn("✖️ لغو", "x:c")]] };
async function adminRoute(env, ctx, data, cq) {
  const P = data.split(":");
  if (data === "a:don") return viewAdminDonate(env, ctx);
  if (P[0] === "a" && P[1] === "hl") return viewHall(env, parseInt(P[2], 10) || 0);
  if (data === "a:hd") return viewHidden(env);
  if (data === "a:it") return viewItems(env);
  if (data === "a:ipn") return viewIpnLog(env);
  if (data === "a:ov") return viewOverlays(env);
  if (data === "a:set") return viewSettings(env);
  if (data === "a:ch") return viewChannel(env);
  if (data === "x:c") {
    await clearPend(env);
    return viewAdminDonate(env, ctx);
  }
  if (data === "a:md") {
    await setPend(env, "md");
    return { text: "➕ <b>ثبت دونیت دستی</b>\n\nاسم و مبلغ رو بفرست، مثلاً:\n<code>Ali - 50$</code>\n<code>علی - 500000</code>\n<code>رضا ۲ میلیون</code>\n\nمبلغ دلاری با نرخ فعلی (" + tgN(rateNow(env)) + ") به تومان تبدیل می‌شه.", kb: CANCEL_KB };
  }
  if (data === "a:ovs") {
    await setPend(env, "ov");
    return { text: "🔗 لینک یا لینک‌های اورلی ریمیت رو بفرست (هر کدوم توی یک خط).", kb: CANCEL_KB };
  }
  if (data === "a:ovr") {
    await saveCfg(env, { goalKey: null, topKey: null, lastKey: null });
    return viewOverlays(env);
  }
  if (P[0] === "h") {
    const idx = parseInt(P[2], 10);
    if (P[1] === "e") return viewHallEntry(env, idx);
    if (P[1] === "u") {
      const snap = await env.STATS_KV.get("tg:hidsnap", "json").catch(() => null) || [];
      const h = await loadHall(env);
      if (snap[idx]) delete h.hidden[snap[idx]];
      await saveHall(env, h);
      return viewHidden(env);
    }
    const name = await hallNameAt(env, idx);
    if (!name) return viewHall(env, 0);
    if (P[1] === "r") {
      await setPend(env, "ren", name);
      return { text: "✏️ اسم جدید برای <b>" + tgEscape(name) + "</b> رو بفرست.\nاگه این اسم از قبل توی لیست باشه، دو تا با هم ادغام و مبلغ‌ها جمع می‌شن.", kb: CANCEL_KB };
    }
    if (P[1] === "a") {
      await setPend(env, "amt", name);
      return { text: "🔢 مبلغ جدید (تومان) برای <b>" + tgEscape(name) + "</b> رو بفرست.\nفعلی: " + tgN((await loadHall(env)).byName[name]), kb: CANCEL_KB };
    }
    if (P[1] === "d") return { text: "🗑 <b>" + tgEscape(name) + "</b> از لیست برترین‌ها حذف بشه؟\nدیگه با دیتای ریمیت هم برنمی‌گرده (از «حذف‌شده‌ها» قابل بازگردانیه).", kb: { inline_keyboard: [[tgBtn("✅ بله، حذف کن", "h:y:" + idx), tgBtn("↩️ نه", "h:e:" + idx)]] } };
    if (P[1] === "y") {
      const h = await loadHall(env);
      delete h.byName[name];
      h.hidden[name] = true;
      await saveHall(env, h);
      return viewHall(env, 0);
    }
  }
  if (P[0] === "md" && (P[1] === "c" || P[1] === "o")) {
    const p = await getPend(env);
    if (!p || p.a !== "mdc") return viewAdminDonate(env, ctx);
    const rows = [[tgBtn("🎯 هدف فعلی", "mg:" + P[1] + ":cur")], [tgBtn("✅ هدف‌های قبلی", "mg:" + P[1] + ":past")], [tgBtn("✖️ لغو", "x:c")]];
    return { text: "این دونیت مربوط به کدوم هدفه؟\n\n👤 <b>" + tgEscape(p.d.name) + "</b> — " + tgN(p.d.amount) + " تومان\n\nاگه «هدف‌های قبلی» رو انتخاب کنی، توی نوار هدف فعلی حساب نمی‌شه و فقط توی برترین‌ها میاد.", kb: { inline_keyboard: rows } };
  }
  if (P[0] === "mg") {
    const p = await getPend(env);
    if (!p || p.a !== "mdc") return viewAdminDonate(env, ctx);
    await clearPend(env);
    await addManual(env, ctx, P[1] === "c" ? "c" : "x", p.d.name, p.d.amount, p.d.usd, P[2]);
    const v = await viewAdminDonate(env, ctx);
    v.text = "✅ ثبت شد: " + tgEscape(p.d.name) + " — " + tgN(p.d.amount) + " تومان\n\n" + v.text;
    return v;
  }
  if (P[0] === "i" && (P[1] === "d" || P[1] === "y")) {
    const st = P[2], id = P.slice(3).join(":");
    if (P[1] === "d") return { text: "🗑 این دونیت حذف بشه؟ مبلغش از نوار و لیست کم می‌شه.", kb: { inline_keyboard: [[tgBtn("✅ بله", "i:y:" + st + ":" + id), tgBtn("↩️ نه", "a:it")]] } };
    const it = await removeItem(env, st, id);
    const v = await viewItems(env);
    if (it) v.text = "✅ حذف شد: " + tgEscape(it.name) + " — " + tgN(it.amount) + "\n\n" + v.text;
    return v;
  }
  if (P[0] === "s") {
    if (P[1] === "ra") {
      await saveCfg(env, { rateMode: "auto" });
      await refreshRate(env, true).catch(() => {
      });
      memoStore.delete("rate");
      return viewSettings(env);
    }
    if (P[1] === "rr") {
      const r = await refreshRate(env, true).catch(() => null);
      memoStore.delete("rate");
      const v = await viewSettings(env);
      if (!r) v.text = "⚠️ گرفتن نرخ از صرافی‌ها ناموفق بود.\n\n" + v.text;
      return v;
    }
    if (P[1] === "rm") {
      await setPend(env, "rate");
      return { text: "✍️ نرخ دلار/تتر رو به تومان بفرست، مثلاً <code>270000</code>", kb: CANCEL_KB };
    }
    if (P[1] === "t") {
      const cfg = await loadCfg(env);
      const k = P[2];
      if (["daily", "weekly", "alerts", "backup"].indexOf(k) !== -1) await saveCfg(env, { [k]: cfg[k] === false });
      return viewSettings(env);
    }
    if (P[1] === "bk") {
      const r = await sendBackup(env);
      const v = await viewSettings(env);
      v.text = (r.ok ? "💾 فایل بکاپ فرستاده شد.\n\n" : "⚠️ بکاپ ناموفق: " + tgEscape(r.description || "") + "\n\n") + v.text;
      return v;
    }
    if (P[1] === "rs") {
      await setPend(env, "restore");
      return { text: "♻️ <b>بازگردانی بکاپ</b>\nفایل JSON بکاپ (همونی که ربات هر روز می‌فرسته) رو برام بفرست. قبل از اعمال، خلاصه‌اش رو نشونت می‌دم.", kb: CANCEL_KB };
    }
    if (P[1] === "dr") {
      await sendTelegram(env, await buildDailyReport(env, ctx));
      return viewSettings(env);
    }
    if (P[1] === "am") {
      const cfg = await loadCfg(env);
      if (P[2] !== "off" && !cfg.channel) {
        const v = await viewChannel(env);
        v.text = "⚠️ اول کانال رو تنظیم کن.\n\n" + v.text;
        return v;
      }
      await saveCfg(env, { annMode: P[2] });
      return viewChannel(env);
    }
    if (P[1] === "ch") {
      await setPend(env, "ch");
      return { text: "🔗 یوزرنیم کانال رو بفرست (مثلاً <code>@your_channel</code>) یا یه پیام از کانال رو برام فوروارد کن.\n\nقبلش ربات رو توی کانال <b>ادمین</b> کن و دسترسی ارسال پیام بده.", kb: CANCEL_KB };
    }
    if (P[1] === "tp") {
      await setPend(env, "tpl");
      return { text: "✏️ قالب جدید رو بفرست. متغیرها:\n{name} {amount} {goal} {percent} {current} {target} {link}\n\nمی‌تونی از <code>&lt;b&gt;</code> برای بولد استفاده کنی.", kb: CANCEL_KB };
    }
    if (P[1] === "tr") {
      await saveCfg(env, { annTpl: null });
      return viewChannel(env);
    }
    if (P[1] === "pv") {
      const text = await annBuild(env, ctx, { name: "نمونه", amount: 500000 });
      await sendTelegram(env, "👁 <b>پیش‌نمایش:</b>\n\n" + text);
      return viewChannel(env);
    }
  }
  if (data === "rs:y") {
    const b = await env.STATS_KV.get("tg:restore", "json").catch(() => null);
    if (!b) return { text: "⚠️ فایل بکاپ منقضی شده؛ دوباره بفرست.", kb: { inline_keyboard: [tgBack("a:set")] } };
    let n = 0;
    for (const k of Object.keys(b.keys)) {
      if (/^tg:/.test(k)) continue;
      await env.STATS_KV.put(k, b.keys[k]);
      n++;
    }
    await env.STATS_KV.delete("tg:restore").catch(() => {
    });
    memoStore.clear();
    donateMem = null;
    return { text: "✅ بازگردانی انجام شد: " + n + " کلید از بکاپ " + tgEscape(b.at.slice(0, 16).replace("T", " ")) + " نوشته شد.", kb: { inline_keyboard: [tgBack("a:set")] } };
  }
  if (P[0] === "an") {
    const id = P[2];
    const rec = await env.STATS_KV.get("ann:" + id, "json").catch(() => null);
    if (!rec) return { text: "این پیش‌نمایش منقضی شده.", kb: { inline_keyboard: [[tgBtn("🏠 منو", "m")]] } };
    if (P[1] === "x") {
      await env.STATS_KV.delete("ann:" + id).catch(() => {
      });
      return { text: "🗑 رد شد.\n\n" + rec.text, kb: { inline_keyboard: [[tgBtn("🏠 منو", "m")]] } };
    }
    const cfg = await loadCfg(env);
    const r = await tgSendTo(env, cfg.channel, rec.text);
    if (r.ok) await env.STATS_KV.delete("ann:" + id).catch(() => {
    });
    return { text: (r.ok ? "✅ در کانال منتشر شد.\n\n" : "⚠️ انتشار ناموفق: " + tgEscape(r.description || "") + "\n\n") + rec.text, kb: { inline_keyboard: r.ok ? [[tgBtn("🏠 منو", "m")]] : [[tgBtn("🔁 دوباره", "an:p:" + id), tgBtn("🏠 منو", "m")]] } };
  }
  return null;
}
async function handlePendingText(env, ctx, msg) {
  const p = await getPend(env);
  if (!p) return null;
  const text = String(msg.text || "").trim();
  const token = getEnv(env, "TELEGRAM_BOT_TOKEN");
  if (p.a === "md") {
    const m = text.match(/^(.+?)[\s\-–—:|،,]+(\$?\s*[\d۰-۹٠-٩][\d۰-۹٠-٩,.٬]*\s*(?:\$|usdt|usd|دلار|تتر|تومان|ت|هزار|میلیون|k|m)?)\s*$/i);
    const amt = m ? parseAmount(m[2]) : null;
    if (!m || !amt) return { text: "⚠️ متوجه نشدم. مثلاً بفرست: <code>Ali - 50$</code> یا <code>علی - 500000</code>", kb: CANCEL_KB };
    const name = m[1].trim().slice(0, 40);
    const rate = rateNow(env);
    if (amt.usd && !(rate > 0)) return { text: "⚠️ نرخ دلار تنظیم نیست. از تنظیمات نرخ رو مشخص کن.", kb: CANCEL_KB };
    const amount = amt.usd ? Math.round(amt.usd * rate) : amt.toman;
    await setPend(env, "mdc", { name, amount, usd: amt.usd || 0 });
    return { text: "تأیید می‌کنی؟\n👤 <b>" + tgEscape(name) + "</b>\n💰 " + tgN(amount) + " تومان" + (amt.usd ? " ($" + amt.usd + ")" : "") + "\n\nنوع دونیت:", kb: { inline_keyboard: [[tgBtn("⚡ کریپتو", "md:c"), tgBtn("✍️ سایر", "md:o")], [tgBtn("✖️ لغو", "x:c")]] } };
  }
  if (p.a === "ren") {
    const ok = await hallRename(env, p.d, text);
    await clearPend(env);
    const v = await viewHall(env, 0);
    v.text = (ok ? "✅ «" + tgEscape(p.d) + "» → «" + tgEscape(text.slice(0, 40)) + "»\n\n" : "⚠️ تغییری انجام نشد.\n\n") + v.text;
    return v;
  }
  if (p.a === "amt") {
    const a = parseAmount(text);
    if (!a || !a.toman) return { text: "⚠️ یه عدد به تومان بفرست، مثلاً <code>3000000</code>", kb: CANCEL_KB };
    const h = await loadHall(env);
    if (h.byName[p.d] !== void 0) h.byName[p.d] = a.toman;
    await saveHall(env, h);
    await clearPend(env);
    const v = await viewHall(env, 0);
    v.text = "✅ مبلغ «" + tgEscape(p.d) + "» شد " + tgN(a.toman) + "\n\n" + v.text;
    return v;
  }
  if (p.a === "rate") {
    const a = parseAmount(text);
    if (!a || !a.toman || a.toman < 1e4 || a.toman > 1e7) return { text: "⚠️ عدد معتبر به تومان بفرست، مثلاً <code>270000</code>", kb: CANCEL_KB };
    await saveCfg(env, { rateMode: "manual", rateManual: a.toman, rateManualTs: Date.now() });
    await clearPend(env);
    return viewSettings(env);
  }
  if (p.a === "ov") {
    const keys = [];
    for (const line of text.split(/\s+/)) {
      const m = line.match(/key=([^&\s]+)/);
      if (m) keys.push(m[1]);
    }
    if (!keys.length) return { text: "⚠️ لینکی با <code>key=</code> پیدا نکردم. لینک کامل اورلی رو بفرست.", kb: CANCEL_KB };
    const patch = {};
    const lines = [];
    const names = { goalKey: "🎯 هدف", topKey: "🏆 برترین‌ها", lastKey: "🕒 آخرین حامی" };
    for (const k of keys) {
      const c = await classifyOverlay(k, env);
      if (c) {
        patch[c.type] = k;
        lines.push("✅ " + names[c.type] + (c.info ? " " + tgEscape(c.info) : ""));
      } else lines.push("⚠️ تشخیص داده نشد: " + tgEscape(shortKey(k)));
    }
    if (Object.keys(patch).length) await saveCfg(env, patch);
    await clearPend(env);
    const v = await viewOverlays(env);
    v.text = lines.join("\n") + "\n\n" + v.text;
    return v;
  }
  if (p.a === "ch") {
    let chatId = null;
    if (msg.forward_from_chat && msg.forward_from_chat.id) chatId = msg.forward_from_chat.id;
    else if (msg.forward_origin && msg.forward_origin.chat && msg.forward_origin.chat.id) chatId = msg.forward_origin.chat.id;
    else {
      const m = text.match(/(?:t\.me\/|@)?([A-Za-z][A-Za-z0-9_]{3,})/);
      if (/^-100\d+$/.test(text)) chatId = text;
      else if (m) chatId = "@" + m[1];
    }
    if (!chatId) return { text: "⚠️ یوزرنیم کانال (مثلاً @your_channel) رو بفرست یا یه پیام از کانال فوروارد کن.", kb: CANCEL_KB };
    const chat = await tgApi(token, "getChat", { chat_id: chatId });
    if (!chat.ok) return { text: "⚠️ کانال پیدا نشد یا ربات عضوش نیست: " + tgEscape(chat.description || ""), kb: CANCEL_KB };
    const me = await tgApi(token, "getMe", {});
    const mem = me.ok ? await tgApi(token, "getChatMember", { chat_id: chat.result.id, user_id: me.result.id }) : { ok: false };
    const st = mem.ok && mem.result.status;
    const canPost = st === "creator" || st === "administrator" && mem.result.can_post_messages !== false;
    if (!canPost) return { text: "⚠️ ربات توی «" + tgEscape(chat.result.title || "") + "» ادمین نیست یا اجازه‌ی ارسال پیام نداره. ادمینش کن و دوباره بفرست.", kb: CANCEL_KB };
    await saveCfg(env, { channel: String(chat.result.id), channelTitle: chat.result.title || "" });
    await clearPend(env);
    const v = await viewChannel(env);
    v.text = "✅ کانال «" + tgEscape(chat.result.title || "") + "» تنظیم شد.\n\n" + v.text;
    return v;
  }
  if (p.a === "restore") {
    if (!msg.document) return { text: "⚠️ فایل بکاپ رو به‌صورت Document بفرست.", kb: CANCEL_KB };
    const r = await restoreFromDocument(env, msg.document);
    if (r.err) return { text: "⚠️ " + tgEscape(r.err), kb: CANCEL_KB };
    await clearPend(env);
    const ks = Object.keys(r.b.keys);
    return { text: "♻️ <b>خلاصه‌ی بکاپ</b>\n🕒 " + tgEscape(r.b.at.slice(0, 16).replace("T", " ")) + " UTC\n🔑 " + ks.length + " کلید: " + tgEscape(ks.slice(0, 12).join("، ")) + (ks.length > 12 ? "…" : "") + "\n\n⚠️ مقدار فعلی این کلیدها با نسخه‌ی بکاپ جایگزین می‌شه. ادامه می‌دی؟", kb: { inline_keyboard: [[tgBtn("✅ بله، بازگردانی کن", "rs:y"), tgBtn("✖️ لغو", "x:c")]] } };
  }
  if (p.a === "tpl") {
    if (text.length < 5) return { text: "⚠️ قالب خیلی کوتاهه.", kb: CANCEL_KB };
    await saveCfg(env, { annTpl: text.slice(0, 1500) });
    await clearPend(env);
    return viewChannel(env);
  }
  return null;
}
// ===== end admin module =====
// ===== daily backup / restore =====
// ---------- daily backup & restore ----------
async function buildBackup(env) {
  const out = { app: "pelak", version: 1, at: new Date().toISOString(), keys: {} };
  let cursor;
  do {
    const l = await env.STATS_KV.list(cursor ? { cursor } : {});
    for (const k of l.keys) {
      if (/^(ann:|tg:)/.test(k.name)) continue;
      const v = await env.STATS_KV.get(k.name);
      if (v !== null) out.keys[k.name] = v;
    }
    cursor = l.list_complete ? null : l.cursor;
  } while (cursor);
  return out;
}
async function sendBackup(env) {
  const token = getEnv(env, "TELEGRAM_BOT_TOKEN"), chat = getEnv(env, "TELEGRAM_CHAT_ID");
  if (!token || !chat || !env.STATS_KV) return { ok: false, description: "not configured" };
  const b = await buildBackup(env);
  const body = JSON.stringify(b);
  const fd = new FormData();
  fd.append("chat_id", chat);
  fd.append("caption", "💾 بکاپ روزانه " + SITE.name + "\n" + Object.keys(b.keys).length + " کلید · " + Math.round(body.length / 1024) + " KB\nبرای بازگردانی: تنظیمات ← بازگردانی بکاپ");
  fd.append("document", new Blob([body], { type: "application/json" }), "pelak-backup-" + b.at.slice(0, 10) + ".json");
  try {
    const r = await fetch("https://api.telegram.org/bot" + token + "/sendDocument", { method: "POST", body: fd, signal: AbortSignal.timeout(2e4) });
    return await r.json();
  } catch (e) {
    return { ok: false, description: String(e && e.message || e) };
  }
}
async function cronBackup(env) {
  const cfg = await loadCfg(env);
  if (cfg.backup === false) return;
  const now = new Date();
  if (now.getUTCHours() * 60 + now.getUTCMinutes() < 30) return;
  const day = todayUtc();
  const rep = await env.STATS_KV.get("rep:v1", "json").catch(() => null) || {};
  if (rep.backup === day) return;
  rep.backup = day;
  await env.STATS_KV.put("rep:v1", JSON.stringify(rep));
  const r = await sendBackup(env);
  if (!r.ok) await sendTelegram(env, "⚠️ ارسال بکاپ روزانه ناموفق بود: " + tgEscape(r.description || ""));
}
async function restoreFromDocument(env, doc) {
  const token = getEnv(env, "TELEGRAM_BOT_TOKEN");
  if (!doc || doc.file_size > 15e6) return { err: "فایل نامعتبر یا خیلی بزرگه." };
  const f = await tgApi(token, "getFile", { file_id: doc.file_id });
  if (!f.ok) return { err: "دانلود فایل ناموفق بود: " + (f.description || "") };
  const r = await fetch("https://api.telegram.org/file/bot" + token + "/" + f.result.file_path, { signal: AbortSignal.timeout(2e4) });
  let b;
  try {
    b = JSON.parse(await r.text());
  } catch (e) {
    return { err: "این فایل JSON معتبر نیست." };
  }
  if (!b || b.app !== "pelak" || !b.keys) return { err: "این فایل بکاپ این سایت نیست." };
  await env.STATS_KV.put("tg:restore", JSON.stringify(b), { expirationTtl: 3600 });
  return { b };
}
async function tgRoute(env, ctx, data) {
  if (data === "m") return { text: TG_MENU_TEXT, kb: TG_MENU };
  if (/^(a|h|md|mg|i|s|an|x|rs):/.test(data)) {
    const ar = await adminRoute(env, ctx, data);
    if (ar) return ar;
  }
  if (data === "f:social") return tgViewSocial(env, true);
  if (data.indexOf("v:") === 0) {
    const v = data.slice(2);
    if (v === "today") return tgViewToday(env);
    if (v === "total") return tgViewTotal(env);
    if (v === "trend") return tgViewTrend(env);
    if (v === "geo") return tgViewGeo(env);
    if (v === "donate") return tgViewDonate(env, ctx);
    if (v === "social") return tgViewSocial(env, false);
    if (v === "media") return tgViewMedia(env);
    if (v === "gb") return tgViewGb(env);
    if (v === "health") return tgViewHealth(env, ctx);
    if (v === "snake") return tgViewSnake(env);
  }
  if (data.indexOf("sd:") === 0 || data.indexOf("sy:") === 0) {
    const ts = data.slice(3);
    const rec = await loadSnake(env);
    const e = rec.board.find((x) => String(x.ts) === ts);
    const back = { inline_keyboard: [[tgBtn("🐍 رکوردداران", "v:snake"), tgBtn("🏠 منو", "m")]] };
    if (!e) return { text: "این رکورد دیگه وجود نداره.", kb: back };
    if (data.indexOf("sd:") === 0) {
      return { text: "🗑 این رکورد حذف بشه؟\n\n👤 <b>" + tgEscape(e.name) + "</b> — " + e.score, kb: { inline_keyboard: [[tgBtn("✅ بله، حذف کن", "sy:" + ts), tgBtn("↩️ نه", "v:snake")]] } };
    }
    rec.board = rec.board.filter((x) => String(x.ts) !== ts);
    await env.STATS_KV.put(SNAKE_KEY, JSON.stringify(rec));
    memoStore.delete("snake");
    return { text: "✅ رکورد حذف شد.", kb: back };
  }
  if (data.indexOf("gd:") === 0 || data.indexOf("gy:") === 0) {
    const id = data.slice(3);
    let msgs = [];
    if (env.STATS_KV) {
      try {
        msgs = await env.STATS_KV.get(GUESTBOOK_KEY, "json") || [];
      } catch (e) {
      }
    }
    const m = msgs.find((x) => x.id === id);
    if (!m) return { text: "این پیام دیگه وجود نداره.", kb: { inline_keyboard: [[tgBtn("💬 یادگاری", "v:gb"), tgBtn("🏠 منو", "m")]] } };
    if (data.indexOf("gd:") === 0) {
      return {
        text: "🗑 این پیام حذف بشه؟\n\n👤 <b>" + tgEscape(m.name) + "</b>\n" + tgEscape(tgCut(m.text, 300)),
        kb: { inline_keyboard: [[tgBtn("✅ بله، حذف کن", "gy:" + id), tgBtn("↩️ نه", "v:gb")]] }
      };
    }
    await env.STATS_KV.put(GUESTBOOK_KEY, JSON.stringify(msgs.filter((x) => x.id !== id)));
    memoStore.delete("gb");
    return { text: "✅ پیام حذف شد.", kb: { inline_keyboard: [[tgBtn("💬 یادگاری", "v:gb"), tgBtn("🏠 منو", "m")]] } };
  }
  return { text: TG_MENU_TEXT, kb: TG_MENU };
}
var TG_CMD_ROUTE = { "/admin": "a:don", "/settings": "a:set", "/start": "m", "/menu": "m", "/today": "v:today", "/stats": "v:today", "/donate": "v:donate", "/social": "v:social", "/guestbook": "v:gb", "/health": "v:health" };
async function processTelegramUpdate(env, ctx, u) {
  const token = getEnv(env, "TELEGRAM_BOT_TOKEN");
  const chat = getEnv(env, "TELEGRAM_CHAT_ID");
  const cq = u.callback_query;
  const msg = u.message;
  const chatId = cq ? cq.message && cq.message.chat && cq.message.chat.id : msg && msg.chat && msg.chat.id;
  if (chatId === void 0 || chatId === null) return;
  if (String(chatId) !== chat) {
    if (cq) await tgApi(token, "answerCallbackQuery", { callback_query_id: cq.id, text: "⛔ دسترسی نداری", show_alert: true });
    else await tgApi(token, "sendMessage", { chat_id: chatId, text: "⛔ دسترسی نداری.\nشناسه‌ی این چت: " + chatId });
    return;
  }
  if (cq) {
    await tgApi(token, "answerCallbackQuery", { callback_query_id: cq.id });
    let view;
    try {
      view = await tgRoute(env, ctx, cq.data || "");
    } catch (e) {
      view = { text: "⚠️ خطا: " + tgEscape(String(e && e.message || e)), kb: TG_MENU };
    }
    await tgApi(token, "editMessageText", {
      chat_id: chatId,
      message_id: cq.message.message_id,
      text: view.text.slice(0, 4e3),
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: view.kb
    });
    return;
  }
  if (msg && (typeof msg.text === "string" || msg.forward_from_chat || msg.forward_origin || msg.document)) {
    if (typeof msg.text !== "string") msg.text = msg.caption || "";
    const cmd = msg.text.trim().split(/\s+/)[0].split("@")[0].toLowerCase();
    const route = TG_CMD_ROUTE[cmd] || "m";
    let view;
    try {
      if (cmd === "/cancel") {
        await clearPend(env);
        view = { text: "✖️ لغو شد.", kb: TG_MENU };
      } else if (cmd.charAt(0) !== "/") {
        view = await handlePendingText(env, ctx, msg);
      }
      if (!view) view = await tgRoute(env, ctx, route);
    } catch (e) {
      view = { text: "⚠️ خطا: " + tgEscape(String(e && e.message || e)), kb: TG_MENU };
    }
    await tgApi(token, "sendMessage", {
      chat_id: chatId,
      text: view.text.slice(0, 4e3),
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: view.kb
    });
  }
}
async function handleTelegramWebhook(request, env, ctx) {
  const token = getEnv(env, "TELEGRAM_BOT_TOKEN");
  if (!token || !getEnv(env, "TELEGRAM_CHAT_ID")) return new Response("not configured", { status: 503 });
  const given = request.headers.get("x-telegram-bot-api-secret-token") || "";
  if (!safeEqual(given, await tgWebhookSecret(token))) return new Response("forbidden", { status: 403 });
  let update;
  try {
    update = await request.json();
  } catch (e) {
    return new Response("bad json", { status: 400 });
  }
  ctx.waitUntil(processTelegramUpdate(env, ctx, update).catch(() => {
  }));
  return new Response("ok");
}
async function handleTelegramSetup(request, env) {
  const pass = getEnv(env, "STATS_PASSWORD");
  if (!pass || !basicAuthOk(request, pass)) {
    return new Response("Unauthorized", { status: 401, headers: { "www-authenticate": 'Basic realm="telegram setup"' } });
  }
  const token = getEnv(env, "TELEGRAM_BOT_TOKEN");
  const chat = getEnv(env, "TELEGRAM_CHAT_ID");
  if (!token || !chat) return json({ ok: false, error: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set" }, "no-store", 2);
  const url = new URL(request.url);
  if (url.searchParams.has("remove")) {
    return json({ removed: await tgApi(token, "deleteWebhook", { drop_pending_updates: true }) }, "no-store", 2);
  }
  const hook = await tgApi(token, "setWebhook", {
    url: url.origin + "/api/telegram-webhook",
    secret_token: await tgWebhookSecret(token),
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true
  });
  const cmds = await tgApi(token, "setMyCommands", { commands: TG_COMMANDS });
  const info = await tgApi(token, "getWebhookInfo", {});
  const menu = hook.ok ? await sendTelegram(env, TG_MENU_TEXT, TG_MENU) : null;
  return json({ webhook: hook, commands: cmds, menuSent: menu, info: info.result || info }, "no-store", 2);
}
var GUESTBOOK_KEY = "guestbook:v1";
async function handleGetGuestbook(env) {
  let msgs = [];
  if (env.STATS_KV) {
    try {
      msgs = await memo("gb", 15e3, async () => await env.STATS_KV.get(GUESTBOOK_KEY, "json") || []);
    } catch (e) {
    }
  }
  return new Response(JSON.stringify(msgs), { headers: { "content-type": "application/json" } });
}
async function handlePostGuestbook(request, env, ctx) {
  if (hitLimit(request, "gb", 3, 6e5)) return tooMany();
  if (!env.STATS_KV) return new Response(JSON.stringify({ error: "KV not configured" }), { status: 500 });
  try {
    const data = await request.json();
    let name = (data.name || "Anonymous").toString().slice(0, 30).trim();
    let text = (data.text || "").toString().slice(0, 300).trim();
    if (!text) return new Response(JSON.stringify({ error: "Message cannot be empty" }), { status: 400 });
    let msgs = await env.STATS_KV.get(GUESTBOOK_KEY, "json") || [];
    const msgId = Date.now().toString() + Math.floor(Math.random() * 1e3);
    msgs.unshift({ id: msgId, name, text, date: new Date().toISOString() });
    if (msgs.length > 100) msgs = msgs.slice(0, 100);
    await env.STATS_KV.put(GUESTBOOK_KEY, JSON.stringify(msgs));
    memoStore.delete("gb");
    notifyTelegram(
      env,
      ctx,
      "💬 <b>New guestbook message</b>\n👤 " + tgEscape(name || "Anonymous") + "\n\n" + tgEscape(text),
      { inline_keyboard: [[{ text: "🗑 حذف این پیام", callback_data: "gd:" + msgId }, { text: "🏠 منو", callback_data: "m" }]] }
    );
    return new Response(JSON.stringify({ success: true }), { headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
  }
}
async function handleDeleteGuestbook(request, env) {
  if (crossSite(request)) return new Response("Forbidden", { status: 403 });
  const pass = getEnv(env, "STATS_PASSWORD");
  if (!pass || !basicAuthOk(request, pass)) return new Response("Unauthorized", { status: 401 });
  try {
    const data = await request.json();
    const id = data.id;
    if (!id) return new Response("Missing id", { status: 400 });
    let msgs = await env.STATS_KV.get(GUESTBOOK_KEY, "json") || [];
    msgs = msgs.filter((m) => m.id !== id);
    await env.STATS_KV.put(GUESTBOOK_KEY, JSON.stringify(msgs));
    memoStore.delete("gb");
    return new Response(JSON.stringify({ success: true }), { headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response("Error", { status: 400 });
  }
}
var CRYPTO_KEY = "crypto:v1";
function sortKeysDeep(o) {
  if (Array.isArray(o)) return o.map(sortKeysDeep);
  if (o && typeof o === "object") {
    const r = {};
    for (const k of Object.keys(o).sort()) r[k] = sortKeysDeep(o[k]);
    return r;
  }
  return o;
}
async function hmacSha512Hex(secret, msg) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function ipnLog(env, entry) {
  try {
    const k = "crypto:ipnlog";
    const list = await env.STATS_KV.get(k, "json").catch(() => null) || [];
    list.unshift(Object.assign({ t: new Date().toISOString() }, entry));
    await env.STATS_KV.put(k, JSON.stringify(list.slice(0, 30)));
  } catch (e) {
  }
}
async function handleNowPaymentsIpn(request, env, ctx) {
  const secret = getEnv(env, "NOWPAYMENTS_IPN_SECRET");
  if (!secret || !env.STATS_KV) return new Response("not configured", { status: 503 });
  let body;
  try {
    body = JSON.parse(await request.text());
  } catch (e) {
    return new Response("bad json", { status: 400 });
  }
  const given = (request.headers.get("x-nowpayments-sig") || "").trim().toLowerCase();
  const sorted = JSON.stringify(sortKeysDeep(body));
  const variants = [sorted, sorted.replace(/[\u007f-\uffff]/g, (ch) => "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0"))];
  variants.push(variants[1].replace(/\//g, "\\/"));
  let sigOk = false;
  if (given) {
    for (const v of variants) {
      if (safeEqual(given, await hmacSha512Hex(secret, v))) { sigOk = true; break; }
    }
  }
  const looksReal = !!(body && body.payment_id);
  if (!sigOk) {
    if (looksReal) {
      await ipnLog(env, { r: "bad_sig", id: String(body.payment_id), st: String(body.payment_status || ""), hasSig: !!given });
      notifyTelegram(env, ctx, "⚠️ <b>NOWPayments IPN rejected: bad signature</b>\nCheck that NOWPAYMENTS_IPN_SECRET matches the IPN secret in the NOWPayments dashboard.\nPayment: " + tgEscape(String(body.payment_id)));
    }
    return new Response("bad signature", { status: 401 });
  }
  if (body.payment_status !== "finished") {
    await ipnLog(env, { r: "ignored", id: String(body.payment_id || ""), st: String(body.payment_status || "") });
    return json({ ok: true, ignored: body.payment_status || "unknown" }, "no-store");
  }
  const id = String(body.payment_id || "");
  const usd = Number(body.actually_paid_at_fiat) > 0 ? Number(body.actually_paid_at_fiat) : String(body.price_currency || "").toLowerCase() === "usd" ? Number(body.price_amount) || 0 : 0;
  await loadRate(env);
  const rate = rateNow(env);
  const name = String(body.order_description || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 40) || "Anonymous";
  if (!(usd > 0) || !(rate > 0)) {
    notifyTelegram(
      env,
      ctx,
      "⚠️ <b>Crypto payment received but NOT added to the bar</b>\n" + (usd > 0 ? "" : "Could not work out the USD value. ") + (rate > 0 ? "" : "USD_TO_TOMAN is not set. ") + "\nPayment: " + tgEscape(id)
    );
    await ipnLog(env, { r: "no_usd", id, st: "finished" });
    return json({ ok: true, counted: false }, "no-store");
  }
  const toman = Math.round(usd * rate);
  const c = await env.STATS_KV.get(CRYPTO_KEY, "json").catch(() => null) || { total: 0, byName: {}, last: null, ids: [] };
  if (id && c.ids.indexOf(id) !== -1) return json({ ok: true, duplicate: true }, "no-store");
  if (id) c.ids = c.ids.concat(id).slice(-300);
  c.total = (c.total || 0) + toman;
  c.byName[name] = (c.byName[name] || 0) + toman;
  const names = Object.keys(c.byName);
  if (names.length > 60) {
    const keep = names.sort((a, b) => c.byName[b] - c.byName[a]).slice(0, 50);
    const slim = {};
    for (const k of keep) slim[k] = c.byName[k];
    c.byName = slim;
  }
  c.last = { name, amount: toman, ts: Date.now() };
  c.items = [{ id: "p" + id, name, amount: toman, usd, ts: Date.now(), src: "ipn" }].concat(c.items || []).slice(0, 40);
  await env.STATS_KV.put(CRYPTO_KEY, JSON.stringify(c));
  await ledgerAdd(env, toman);
  ctx.waitUntil(announceDonation(env, ctx, { name, amount: toman, crypto: true }).catch(() => {
  }));
  await ipnLog(env, { r: "counted", id, st: "finished", usd, toman });
  donateMem = null;
  const fmtN = (n) => Number(n || 0).toLocaleString("en-US");
  notifyTelegram(
    env,
    ctx,
    "⚡ <b>New crypto support!</b>\n$" + usd.toFixed(2) + " ≈ " + fmtN(toman) + " Toman\n👤 " + tgEscape(name) + (body.pay_currency ? "\n🪙 " + tgEscape(String(body.pay_currency).toUpperCase()) : "")
  );
  return json({ ok: true, counted: true }, "no-store");
}
function mergeCrypto(data, c, base) {
  if (!c || !c.total) return data;
  const out = Object.assign({}, data);
  out.current = (data.current || 0) + Math.max(0, c.total - (base || 0));
  out.percent = out.goal > 0 ? parseFloat((out.current / out.goal * 100).toFixed(1)) : data.percent;
  const list = (data.top || []).map((t) => ({ name: t.name, amount: t.amount }));
  for (const k of Object.keys(c.byName || {})) list.push({ name: k, amount: c.byName[k], crypto: true });
  out.top = list.sort((a, b) => b.amount - a.amount).slice(0, 3);
  if (c.last && c.last.ts > (data.lastAt || 0)) out.last = { name: c.last.name, amount: c.last.amount, crypto: true };
  return out;
}
var donateMem = null;
var faDigits = (s) => String(s).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[٬،]/g, ",");
function flattenJson(j) {
  const out = [];
  (function walk(o) {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== "object") return;
    const ks = Object.keys(o);
    const pick = (re) => ks.find((k) => re.test(k) && o[k] !== null && typeof o[k] !== "object");
    const n = pick(/name|donor|user|nick|supporter/i), a = pick(/amount|price|sum|value|total/i);
    const cur = pick(/current|raised|collected|received|paid|donated/i), g = pick(/goal|target|goalamount/i);
    const title = pick(/title|goalname/i);
    if (g && cur) out.push((o[title] || o.name ? (o[title] || o.name) + ": " : "") + o[cur] + " / " + o[g]);
    else if (n && a) out.push(o[n] + " " + o[a]);
    ks.forEach((k) => walk(o[k]));
  })(j);
  return out.join("\n");
}
async function fetchReymitOverlay(url, env) {
  if (!url) return null;
  let key = "";
  const m = String(url).match(/key=([^&]+)/);
  if (m) key = m[1];
  else if (!url.includes("/") && !url.includes("?")) key = url.trim();
  if (!key) return null;
  // REYMIT_PROXY (optional): a mirror of https://reymit.ir on a server inside Iran, tried first
  const proxy = env ? getEnv(env, "REYMIT_PROXY").replace(/\/+$/, "") : "";
  const endpoints = [proxy, "https://reymit.ir"].filter(Boolean).map((b) => b + "/overlay/data.php?NWSL=1&key=" + key + "&md5sum=0&md5overlaydata=0&startedat=0&lastupdate=0");
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "application/json, text/javascript, */*; q=0.01",
          "Accept-Language": "fa,en;q=0.8",
          "Referer": "https://reymit.ir/overlay/?key=" + key,
          "X-Requested-With": "XMLHttpRequest"
        },
        signal: AbortSignal.timeout(5e3)
      });
      if (!res.ok) continue;
      const text = await res.text();
      if (!text || !text.trim()) continue;
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object") {
          return { json: parsed, raw: text };
        }
      } catch (err) {
      }
      return { html: text, raw: text };
    } catch (e) {
    }
  }
  return null;
}
function parseGoal(t) {
  const n = (s) => parseInt(String(s).replace(/,/g, ""), 10);
  const m = t.match(/(?:(.+?):\s*)?([\d,]{1,15})\s*(?:\/|از|of)\s*([\d,]{1,15})/);
  if (m && n(m[3]) > 0) {
    return { title: m[1] ? m[1].trim() : "", current: n(m[2]), goal: n(m[3]) };
  }
  const m2 = t.match(/([\d,]{1,15})\s*(?:\/|از|of)\s*([\d,]{1,15})/);
  return m2 && n(m2[2]) > 0 ? { title: "", current: n(m2[1]), goal: n(m2[2]) } : null;
}
function parsePairs(t) {
  const out = [];
  let prev = "";
  const clean = (s) => s.replace(/[\s:\-–—|]+$/, "").trim().slice(0, 40);
  for (const line of t.split("\n")) {
    let m = line.match(/^([\d,]{3,15})\s*(?:تومان|ریال|toman|IRT)?$/i);
    if (m && prev) {
      out.push({ name: clean(prev), amount: +m[1].replace(/,/g, "") });
      prev = "";
      continue;
    }
    m = line.match(/^(\D.{0,58}?)[\s:\-–—|]+([\d,]{3,15})\s*(?:تومان|ریال|toman|IRT)?(?:\s.*)?$/i);
    if (m) {
      out.push({ name: clean(m[1]), amount: +m[2].replace(/,/g, "") });
      prev = "";
      continue;
    }
    prev = line;
  }
  return out.filter((p) => p.name && p.amount > 0);
}
function reymitAmt(t, env) {
  if (!t || typeof t !== "object") return 0;
  const ra = t.real_amount;
  const rawV = ra != null && ra !== "" && String(ra) !== "0" ? ra : t.amount;
  const s = faDigits(String(rawV == null ? "" : rawV)).replace(/,/g, "");
  const m = s.match(/\d+(?:\.\d+)?/);
  const num = m ? parseFloat(m[0]) : 0;
  if (!(num > 0)) return 0;
  const hint = [t.currency, t.currency_type, t.cur, t.unit, t.symbol, t.pay_currency, t.gateway, t.method, t.type, rawV, t.amount].filter((x) => x != null && typeof x !== "object").join(" ").toLowerCase();
  const rate = rateNow(env);
  const isToman = /toman|irt|irr|rial|تومان|ریال/.test(hint);
  const isUsd = /usd|\$|dollar|paypal|usdt|tether|crypto|دلار/.test(hint);
  const maxEnv = env ? getEnv(env, "REYMIT_USD_MAX") : void 0;
  const usdMax = maxEnv !== void 0 && maxEnv !== "" ? parseFloat(maxEnv) || 0 : 1e3;
  if (rate > 0 && !isToman && (isUsd || num < usdMax)) return Math.round(num * rate);
  return Math.round(num);
}
async function getDonate(env, ctx, debug, ttl) {
  const now = Date.now();
  if (!DONATE_ON) return { data: { title: "", goal: 0, current: 0, percent: 0, top: [], last: null, lastAt: 0, link: "" }, raw: { goal: "", top: "", last: "" }, errors: {}, parts: {} };
  if (!debug && donateMem && now - donateMem.ts < (ttl || 3e4)) {
    return Object.assign({ data: donateMem.data, raw: { goal: "", top: "", last: "" }, errors: {} }, donateMem.meta || {});
  }
  let manual = { goal: 0, current: 0, top: [] };
  let lastGood = null;
  let cryptoDon = null;
  let extraDon = null;
  const cfg = await loadCfg(env);
  await loadRate(env);
  if (env && env.STATS_KV) {
    try {
      cryptoDon = await env.STATS_KV.get(CRYPTO_KEY, "json");
    } catch (e) {
    }
    try {
      extraDon = await env.STATS_KV.get(EXTRA_KEY, "json");
    } catch (e) {
    }
    try {
      manual = await env.STATS_KV.get("donate:v1", "json") || manual;
    } catch (e) {
    }
    try {
      lastGood = await env.STATS_KV.get("donate:last:v1", "json");
    } catch (e) {
    }
  }
  const goalLink = cfg.goalKey || env && getEnv(env, "REYMIT_GOAL_URL") || "";
  const topLink = cfg.topKey || env && getEnv(env, "REYMIT_TOP_URL") || "";
  const lastLink = cfg.lastKey || env && getEnv(env, "REYMIT_LAST_URL") || "";
  const reymitOn = !!(goalLink || topLink || lastLink);
  if (!reymitOn) lastGood = null;
  const [goalRes, topRes, lastRes] = await Promise.all([
    fetchReymitOverlay(goalLink, env),
    fetchReymitOverlay(topLink, env),
    fetchReymitOverlay(lastLink, env)
  ]);
  let goalInfo = null;
  let topList = [];
  let lastSupporter = null;
  if (goalRes && goalRes.json && goalRes.json.goal) {
    const g = goalRes.json.goal;
    const cur = parseInt(String(g.donated || 0).replace(/,/g, ""), 10) || 0;
    const goal = parseInt(String(g.goalamount || 0).replace(/,/g, ""), 10) || 0;
    let pct = parseFloat(g.percent || 0) || 0;
    if (pct === 0 && goal > 0 && cur > 0) {
      pct = parseFloat((cur / goal * 100).toFixed(1));
    }
    goalInfo = {
      title: g.name ? String(g.name).trim() : DONATE_TITLE,
      current: cur,
      goal,
      percent: pct
    };
  } else if (goalRes) {
    const txt = goalRes.json ? flattenJson(goalRes.json) : goalRes.html;
    if (txt) {
      const parsed = parseGoal(faDigits(decodeEntities(txt)));
      if (parsed) {
        const cur = parsed.current || 0;
        const goal = parsed.goal || 0;
        const pct = goal > 0 && cur > 0 ? parseFloat((cur / goal * 100).toFixed(1)) : 0;
        goalInfo = { title: parsed.title || DONATE_TITLE, current: cur, goal, percent: pct };
      }
    }
  }
  const txs = [];
  const txAmt = {};
  if (topRes && topRes.json && Array.isArray(topRes.json.transactions)) {
    for (const t of topRes.json.transactions) {
      if (!t || !t.name) continue;
      const k = String(t.name).trim().slice(0, 40) + "|" + String(t.real_amount || t.amount || 0) + "|" + String(t.currency || "");
      txs.push(k);
      txAmt[k] = reymitAmt(t, env);
    }
  }
  if (topRes && topRes.json) {
    const j = topRes.json;
    if (j.tops && typeof j.tops === "object" && !Array.isArray(j.tops)) {
      topList = Object.values(j.tops).filter((t) => t && t.name && String(t.name).trim()).map((t) => ({
        name: String(t.name).trim().slice(0, 40),
        amount: reymitAmt(t, env)
      })).filter((t) => t.name && t.amount > 0).sort((a, b) => b.amount - a.amount);
    }
    if (!topList.length && Array.isArray(j.transactions)) {
      topList = j.transactions.map((t) => ({
        name: String(t.name || "").trim().slice(0, 40),
        amount: reymitAmt(t, env)
      })).filter((t) => t.name && t.amount > 0).sort((a, b) => b.amount - a.amount);
    }
    if (!topList.length) {
      const txt = flattenJson(j);
      if (txt) topList = parsePairs(faDigits(decodeEntities(txt))).sort((a, b) => b.amount - a.amount).slice(0, 3);
    }
  } else if (topRes && topRes.html) {
    topList = parsePairs(faDigits(decodeEntities(topRes.html))).sort((a, b) => b.amount - a.amount).slice(0, 3);
  }
  if (lastRes && lastRes.json) {
    const llast = lastRes.json.tops && lastRes.json.tops.LLast;
    if (llast && llast.name) {
      lastSupporter = {
        name: String(llast.name).trim().slice(0, 40),
        amount: reymitAmt(llast, env)
      };
    } else if (Array.isArray(lastRes.json.transactions) && lastRes.json.transactions[0]) {
      const t = lastRes.json.transactions[0];
      lastSupporter = {
        name: String(t.name).trim().slice(0, 40),
        amount: reymitAmt(t, env)
      };
    }
  } else if (lastRes) {
    const txt = lastRes.json ? flattenJson(lastRes.json) : lastRes.html;
    if (txt) lastSupporter = parsePairs(faDigits(decodeEntities(txt)))[0] || null;
  }
  let hall = null;
  let cryptoBase = 0;
  if (env && env.STATS_KV) {
    try {
      hall = await env.STATS_KV.get("donate:hall:v1", "json");
    } catch (e) {
    }
    const before = JSON.stringify(hall);
    hall = hall && typeof hall === "object" ? hall : { byName: {}, sig: "", cryptoBase: 0 };
    hall.byName = hall.byName || {};
    hall.alias = hall.alias || {};
    hall.hidden = hall.hidden || {};
    const liveSum = {};
    for (const t of topList) {
      const cn = hall.alias[t.name] || t.name;
      if (hall.hidden[cn]) continue;
      liveSum[cn] = (liveSum[cn] || 0) + t.amount;
    }
    for (const cn of Object.keys(liveSum)) {
      if (!(hall.byName[cn] >= liveSum[cn])) hall.byName[cn] = liveSum[cn];
    }
    const names = Object.keys(hall.byName);
    if (names.length > 60) {
      const slim = {};
      for (const k of names.sort((x, y) => hall.byName[y] - hall.byName[x]).slice(0, 50)) slim[k] = hall.byName[k];
      hall.byName = slim;
    }
    if (goalInfo && goalInfo.goal > 0) {
      const sig = String(goalInfo.title || "") + "|" + goalInfo.goal;
      if (hall.sig !== sig) {
        hall.cryptoBase = hall.sig ? cryptoDon && cryptoDon.total || 0 : 0;
        hall.extraBase = hall.sig ? extraDon && extraDon.total || 0 : 0;
        hall.sig = sig;
      }
    }
    cryptoBase = hall.cryptoBase || 0;
    const after = JSON.stringify(hall);
    if (after !== before) {
      const pr = env.STATS_KV.put("donate:hall:v1", after).catch(() => {
      });
      if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(pr);
      else await pr;
    }
  }
  const hallFull = hall ? Object.keys(hall.byName).filter((k) => !(hall.hidden && hall.hidden[k])).map((k) => ({ name: k, amount: hall.byName[k] })).sort((x, y) => y.amount - x.amount) : [];
  const hallTop = hallFull.slice(0, 3);
  topList = topList.slice(0, 3);
  const base = lastGood || (manual.goal ? manual : Object.assign({}, manual, { goal: DONATE.goal || 0 }));
  const currentVal = goalInfo ? goalInfo.current : base.current || 0;
  const goalVal = goalInfo && goalInfo.goal > 0 ? goalInfo.goal : base.goal || 0;
  const pctVal = goalInfo && typeof goalInfo.percent === "number" ? goalInfo.percent : goalVal > 0 ? parseFloat((currentVal / goalVal * 100).toFixed(1)) : base.percent || 0;
  let lastAt = 0;
  if (lastSupporter) {
    const lg = lastGood && lastGood.last;
    lastAt = lg && lg.name === lastSupporter.name && lg.amount === lastSupporter.amount ? lastGood.lastAt || 0 : lastGood ? now : 0;
  } else if (lastGood) {
    lastAt = lastGood.lastAt || 0;
  }
  const data = {
    title: goalInfo && goalInfo.title ? goalInfo.title : base.title || DONATE_TITLE,
    goal: goalVal,
    current: currentVal,
    percent: pctVal,
    top: hallTop.length ? hallTop : topList.length ? topList : base.top || [],
    last: lastSupporter || lastGood && lastGood.last || null,
    lastAt,
    link: DONATE_URL
  };
  if (env && env.STATS_KV && (goalInfo || topList.length || lastSupporter)) {
    const str = JSON.stringify(data);
    if (!lastGood || JSON.stringify(lastGood) !== str) {
      if (ctx && typeof ctx.waitUntil === "function") {
        ctx.waitUntil(env.STATS_KV.put("donate:last:v1", str).catch(() => {
        }));
      } else {
        await env.STATS_KV.put("donate:last:v1", str).catch(() => {
        });
      }
    }
  }
  const merged = mergeExtras(data, { crypto: cryptoDon, cryptoBase, extra: extraDon, extraBase: hall && hall.extraBase || 0, full: hallFull, hall });
  donateMem = { data: merged, ts: now, meta: { reymit: { txs, txAmt, current: data.current, goal: data.goal, title: data.title, last: data.last, sig: goalInfo && goalInfo.goal > 0 ? String(goalInfo.title || "") + "|" + goalInfo.goal : "" }, reymitOn, fetchOk: !!(goalInfo || topList.length || lastSupporter), parts: { reymit: data.current, crypto: Math.max(0, (cryptoDon && cryptoDon.total || 0) - cryptoBase), extra: Math.max(0, (extraDon && extraDon.total || 0) - (hall && hall.extraBase || 0)) } } };
  return {
    reymitOn,
    data: merged,
    reymit: { txs, txAmt, current: data.current, goal: data.goal, title: data.title, last: data.last, sig: goalInfo && goalInfo.goal > 0 ? String(goalInfo.title || "") + "|" + goalInfo.goal : "" },
    fetchOk: !!(goalInfo || topList.length || lastSupporter),
    parts: { reymit: data.current, crypto: Math.max(0, (cryptoDon && cryptoDon.total || 0) - cryptoBase), extra: Math.max(0, (extraDon && extraDon.total || 0) - (hall && hall.extraBase || 0)) },
    raw: {
      goal: goalRes && goalRes.raw || "",
      top: topRes && topRes.raw || "",
      last: lastRes && lastRes.raw || ""
    },
    errors: {}
  };
}
async function handleGetDonateStats(request, env, ctx) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.has("debug")) {
      const pass = getEnv(env, "STATS_PASSWORD");
      if (!pass || !basicAuthOk(request, pass)) {
        return new Response("Unauthorized", { status: 401, headers: { "www-authenticate": 'Basic realm="debug"' } });
      }
      const res2 = await getDonate(env, ctx, true);
      const cut = (x) => typeof x === "string" ? x.slice(0, 1500) : JSON.stringify(x || "").slice(0, 1500);
      return json({
        data: res2.data,
        errors: res2.errors,
        rawText: {
          goal: cut(res2.raw && res2.raw.goal),
          top: cut(res2.raw && res2.raw.top),
          last: cut(res2.raw && res2.raw.last)
        }
      }, "no-store", 2);
    }
    const live = url.searchParams.has("live");
    const res = await getDonate(env, ctx, false, live ? 6e3 : 3e4);
    return json(res.data, live ? "no-store" : "public, max-age=20");
  } catch (err) {
    return json({
      title: DONATE_TITLE,
      goal: 0,
      current: 0,
      percent: 0,
      top: [],
      last: null,
      link: DONATE_URL,
      error: String(err && err.message || err)
    }, "no-store");
  }
}
// Browsers send the saved Basic password on cross-site requests too, so check where the call came from.
function crossSite(request) {
  const o = request.headers.get("origin");
  return !!o && o !== new URL(request.url).origin;
}
async function handlePostDonateStats(request, env) {
  if (crossSite(request)) return new Response("Forbidden", { status: 403 });
  const pass = getEnv(env, "STATS_PASSWORD");
  if (!pass || !basicAuthOk(request, pass)) return new Response("Unauthorized", { status: 401 });
  try {
    const data = await request.json();
    await env.STATS_KV.put("donate:v1", JSON.stringify(data));
    return new Response(JSON.stringify({ success: true }), { headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response("Error", { status: 400 });
  }
}
async function handleAdminGuestbookPage(request, env) {
  const headers = { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" };
  const pass = getEnv(env, "STATS_PASSWORD");
  if (!pass) return new Response("Add a STATS_PASSWORD secret (10 characters or more) first.", { status: 503, headers });
  if (!basicAuthOk(request, pass)) {
    return new Response("Authentication required", {
      status: 401,
      headers: { ...headers, "www-authenticate": 'Basic realm="Guestbook Admin", charset="UTF-8"' }
    });
  }
  let msgs = [];
  if (env.STATS_KV) {
    try {
      msgs = await env.STATS_KV.get(GUESTBOOK_KEY, "json") || [];
    } catch (e) {
    }
  }
  let rows = msgs.map((m) => `<tr>
    <td>${escHtml(m.name)}</td>
    <td>${escHtml(m.text)}</td>
    <td>${new Date(m.date).toLocaleString()}</td>
    <td><button onclick="del('${m.id}')">Delete</button></td>
  </tr>`).join("");
  if (!rows) rows = "<tr><td colspan='4'>No messages</td></tr>";
  let dStats = { goal: DONATE.goal || 0, current: 0, link: "", cryptoLink: "", top: [{ name: "", amount: 0 }, { name: "", amount: 0 }, { name: "", amount: 0 }] };
  if (env.STATS_KV) {
    try {
      const stored = await env.STATS_KV.get("donate:v1", "json");
      if (stored && Array.isArray(stored.top)) dStats = stored;
    } catch (e) {
    }
  }
  const top0 = dStats.top[0] || { name: "", amount: 0 };
  const top1 = dStats.top[1] || { name: "", amount: 0 };
  const top2 = dStats.top[2] || { name: "", amount: 0 };
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Admin Dashboard</title><style>
    body{background:#07090d;color:#f2f4f7;font:15px system-ui;padding:24px;max-width:900px;margin:0 auto}
    table{width:100%;border-collapse:collapse;background:rgba(255,255,255,.04)}
    th,td{padding:10px;border:1px solid rgba(255,255,255,.1);text-align:left}
    button{background:#ff5f57;color:#fff;border:0;padding:6px 12px;cursor:pointer;border-radius:4px}
    .btn-green{background:#10b981;}
    .card{background:rgba(255,255,255,.03); padding:20px; border:1px solid rgba(255,255,255,.08); border-radius:12px; margin-bottom:30px;}
    .form-group{margin-bottom:15px; display:flex; gap:10px; align-items:center;}
    .form-group label{min-width:120px; color:#c9d1db;}
    .form-group input{flex:1; padding:8px; background:rgba(0,0,0,.3); border:1px solid rgba(255,255,255,.2); color:#fff; border-radius:6px;}
  </style></head><body>
    <h1>Admin Dashboard</h1>
    <p><a href="/stats" style="color:#7fd1ff">Back to Stats</a></p>

    <div class="card">
      <h2>Donate Goal & Links</h2>
      <div class="form-group"><label>Goal Amount:</label><input type="number" id="dGoal" value="${escHtml(dStats.goal)}"></div>
      <div class="form-group"><label>Current Amount:</label><input type="number" id="dCurr" value="${escHtml(dStats.current)}"></div>
      <div class="form-group"><label>Donate link:</label><input type="text" id="dLink" value="${escHtml(dStats.link)}"></div>
      <div class="form-group"><label>Crypto Link:</label><input type="text" id="dCrypto" value="${escHtml(dStats.cryptoLink || "")}" placeholder="e.g. USDT address or payment link"></div>
      
      <h3>Top Donors</h3>
      <div class="form-group"><label>#1 Name:</label><input type="text" id="t1n" value="${escHtml(top0.name)}"><label>Amount:</label><input type="number" id="t1a" value="${escHtml(top0.amount)}"></div>
      <div class="form-group"><label>#2 Name:</label><input type="text" id="t2n" value="${escHtml(top1.name)}"><label>Amount:</label><input type="number" id="t2a" value="${escHtml(top1.amount)}"></div>
      <div class="form-group"><label>#3 Name:</label><input type="text" id="t3n" value="${escHtml(top2.name)}"><label>Amount:</label><input type="number" id="t3a" value="${escHtml(top2.amount)}"></div>
      
      <button class="btn-green" onclick="saveDonate()">Save Donate Stats</button>
    </div>

    <div class="card">
      <h2>Guestbook Messages</h2>
      <table><thead><tr><th>Name</th><th>Message</th><th>Date</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table>
    </div>

    <script>
      function del(id) {
        if(!confirm('Delete this message?')) return;
        fetch('/api/guestbook', { method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id}) })
        .then(r => r.json()).then(() => location.reload());
      }
      function saveDonate() {
        const data = {
          goal: Number(document.getElementById('dGoal').value),
          current: Number(document.getElementById('dCurr').value),
          link: document.getElementById('dLink').value,
          cryptoLink: document.getElementById('dCrypto').value,
          top: [
            {name: document.getElementById('t1n').value, amount: Number(document.getElementById('t1a').value)},
            {name: document.getElementById('t2n').value, amount: Number(document.getElementById('t2a').value)},
            {name: document.getElementById('t3n').value, amount: Number(document.getElementById('t3a').value)}
          ].filter(x => x.amount > 0 || x.name)
        };
        fetch('/api/donate-stats', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) })
        .then(r => r.json()).then(() => alert('Saved successfully!'));
      }
    <\/script>
  </body></html>`;
  return new Response(html, { headers });
}
function handleRobots(url) {
  const body = "User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /stats\nDisallow: /overlay\nDisallow: /go/\nDisallow: /thumb/\nDisallow: /f/\n\nSitemap: " + url.origin + "/sitemap.xml\n";
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
function handleSecurityTxt(url) {
  if (!SITE.securityContact) return notFoundResponse(url.pathname);
  const exp = new Date(Date.now() + 365 * 864e5).toISOString().replace(/\.\d+Z$/, "Z");
  const body = "Contact: " + SITE.securityContact + "\nExpires: " + exp + "\nPreferred-Languages: " + LANGS.join(", ") + "\nCanonical: " + url.origin + "/.well-known/security.txt\n";
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
function handleSitemap(url) {
  const day = new Date().toISOString().slice(0, 10);
  const body = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>' + url.origin + "/</loc><lastmod>" + day + "</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>\n</urlset>\n";
  return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
function handleManifest() {
  const manifest = {
    name: SITE.name,
    short_name: SITE.shortName || SITE.name,
    description: tr(SITE.description, DEFAULT_LANG),
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#07090d",
    theme_color: "#07090d",
    lang: DEFAULT_LANG,
    dir: DEFAULT_LANG === "fa" ? "rtl" : "ltr",
    icons: [{ src: "/logo.png", type: "image/png", sizes: "512x512", purpose: "any" }, { src: "/logo.png", type: "image/png", sizes: "512x512", purpose: "maskable" }]
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "content-type": "application/manifest+json; charset=utf-8", "cache-control": "public, max-age=3600" }
  });
}
var CACHE_TTL_MS = 30 * 60 * 1e3;
var RETRY_MS = 5 * 60 * 1e3;
// The accounts are part of the key, so changing one in site.config.js never shows old numbers
var KV_KEY = "stats:v5:" + [YOUTUBE_HANDLE, GITHUB_USER, GITHUB_FEATURED, TELEGRAM_CHANNEL].join("|").slice(0, 400);
var SOURCES = ["youtube", "github", "telegram", "videos", "repo", "posts"];
var OPTIONAL = new Set(["repo", "posts"]);
var SEC = SITE.sections || {};
// Sources that are not configured are never fetched and never count as errors
var SOURCE_ON = {
  youtube: !!YOUTUBE_HANDLE,
  videos: !!YOUTUBE_HANDLE && SEC.videos !== false,
  github: !!GITHUB_USER,
  telegram: !!TELEGRAM_CHANNEL,
  posts: !!TELEGRAM_CHANNEL && SEC.posts !== false,
  repo: !!GITHUB_FEATURED && SEC.project !== false
};
function mergeStats(fresh, cached) {
  const data = {};
  let allOk = true;
  for (const k of SOURCES) {
    if (!SOURCE_ON[k]) data[k] = null;
    else if (fresh[k] !== null) data[k] = fresh[k];
    else {
      if (!OPTIONAL.has(k)) allOk = false;
      data[k] = cached && cached.data ? cached.data[k] ?? null : null;
    }
  }
  return { data, allOk };
}
async function collectStats(env) {
  const errors = {};
  const run = (key, fn) => !SOURCE_ON[key] ? Promise.resolve(null) : fn().catch((e) => {
    errors[key] = String(e && e.message || e);
    return null;
  });
  const [youtube, gh, telegram, videos, posts] = await Promise.all([
    run("youtube", () => fetchYouTube(env)),
    run("github", () => fetchGitHub(env)),
    run("telegram", fetchTelegram),
    run("videos", () => fetchLatestVideos(env)),
    run("posts", fetchTelegramPosts)
  ]);
  return {
    data: { youtube, github: gh ? gh.stars : null, telegram, videos, repo: gh ? gh.repo : null, posts },
    errors
  };
}
async function statsData(env, ctx) {
  const kv = env.STATS_KV;
  let cached = null;
  if (kv) {
    try {
      cached = await kv.get(KV_KEY, "json");
    } catch (e) {
    }
  }
  const now = Date.now();
  if (cached) {
    if (now - cached.ts < CACHE_TTL_MS) return cached.data;
    if (cached.tried && now - cached.tried < RETRY_MS) return cached.data;
  }
  const { data: fresh } = await collectStats(env);
  const { data, allOk } = mergeStats(fresh, cached);
  if (kv) {
    const ts = allOk ? now : cached ? cached.ts : 0;
    const w = kv.put(KV_KEY, JSON.stringify({ data, ts, tried: now })).catch(() => {
    });
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(w);
  }
  return data;
}
async function handleStats(request, env, ctx) {
  const url = new URL(request.url);
  const debug = url.searchParams.has("debug");
  if (debug) {
    const pass = getEnv(env, "STATS_PASSWORD");
    if (!pass || !basicAuthOk(request, pass)) return new Response("Unauthorized", { status: 401, headers: { "www-authenticate": 'Basic realm="debug"' } });
  }
  const refresh = url.searchParams.has("refresh");
  const kv = env.STATS_KV;
  if (!debug && !refresh) return json(await memo("stats", 3e4, () => statsData(env, ctx)), "public, max-age=60");
  let cached = null;
  if (kv) {
    try {
      cached = await kv.get(KV_KEY, "json");
    } catch (e) {
    }
  }
  const now = Date.now();
  const cooledDown = !cached || !cached.tried || now - cached.tried > 3e4;
  const force = (debug || refresh) && cooledDown;
  if (debug && !cooledDown) {
    return json(
      { throttled: true, note: "Debug refreshes at most every 30 seconds, try again shortly", cachedData: cached.data },
      "no-store",
      2
    );
  }
  if (!force && cached) {
    if (now - cached.ts < CACHE_TTL_MS) return json(cached.data, "public, max-age=60");
    if (cached.tried && now - cached.tried < RETRY_MS) return json(cached.data, "public, max-age=60");
  }
  const { data: fresh, errors } = await collectStats(env);
  const { data, allOk } = mergeStats(fresh, cached);
  if (kv) {
    const ts = allOk ? now : cached ? cached.ts : 0;
    ctx.waitUntil(kv.put(KV_KEY, JSON.stringify({ data, ts, tried: now })).catch(() => {
    }));
  }
  if (debug) {
    return json(
      {
        data: fresh,
        // what the APIs returned just now (null = failed, see errors)
        errors,
        savedToKV: !!kv,
        hasKV: !!kv,
        hasYoutubeKey: !!getEnv(env, "YOUTUBE_API_KEY"),
        youtubeKeyLooksValid: /^AIza[\w-]{35}$/.test(getEnv(env, "YOUTUBE_API_KEY")),
        hasGithubToken: !!getEnv(env, "GITHUB_TOKEN"),
        hasStatsPassword: !!getEnv(env, "STATS_PASSWORD"),
        envNames: Object.keys(env)
        // names only, never values
      },
      "no-store",
      2
    );
  }
  return json(data, refresh ? "no-store" : "public, max-age=" + (allOk ? 60 : 15));
}
function json(obj, cacheControl, indent) {
  return new Response(JSON.stringify(obj, null, indent), {
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": cacheControl
    }
  });
}
function parseCompact(s) {
  const m = String(s).replace(/,/g, "").trim().match(/^([\d.]+)\s*([kKmMbB])?/);
  if (!m) return NaN;
  const mult = { k: 1e3, m: 1e6, b: 1e9 }[(m[2] || "").toLowerCase()] || 1;
  return Math.round(parseFloat(m[1]) * mult);
}
async function fetchYouTube(env) {
  let apiError;
  const ytKey = getEnv(env, "YOUTUBE_API_KEY");
  if (ytKey) {
    try {
      return await fetchYouTubeApi(ytKey);
    } catch (e) {
      apiError = e.message;
    }
  } else {
    apiError = "YOUTUBE_API_KEY is not set";
  }
  try {
    return await fetchYouTubeScrape();
  } catch (e) {
    throw new Error("api: " + apiError + " | scrape: " + e.message);
  }
}
async function fetchYouTubeApi(key) {
  const res = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=statistics&forHandle=" + encodeURIComponent(YOUTUBE_HANDLE) + "&key=" + encodeURIComponent(key)
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error && data.error.message || "HTTP " + res.status);
  }
  const item = data.items && data.items[0];
  if (!item) throw new Error("channel not found for handle " + YOUTUBE_HANDLE);
  if (item.statistics.hiddenSubscriberCount) throw new Error("subscriber count is hidden");
  return parseInt(item.statistics.subscriberCount || "0", 10);
}
async function fetchYouTubeScrape() {
  const res = await fetch("https://www.youtube.com/@" + YOUTUBE_HANDLE, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "en-US,en;q=0.9",
      "Cookie": "CONSENT=YES+1; SOCS=CAI"
    }
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const html = await res.text();
  const m = html.match(/(\d[\d.,]*\s*[KMB]?)\s*subscribers/i);
  if (!m) throw new Error("subscriber text not found");
  const n = parseCompact(m[1]);
  if (isNaN(n)) throw new Error("could not parse " + m[1]);
  return n;
}
async function fetchGitHub(env) {
  let apiError;
  try {
    return await fetchGitHubApi(env);
  } catch (e) {
    apiError = e.message;
  }
  try {
    return await fetchGitHubScrape();
  } catch (e) {
    throw new Error("api: " + apiError + " | scrape: " + e.message);
  }
}
async function fetchGitHubApi(env) {
  const headers = { "User-Agent": "pelak/1.0", "Accept": "application/vnd.github+json" };
  const ghToken = getEnv(env, "GITHUB_TOKEN");
  if (ghToken) headers["Authorization"] = "Bearer " + ghToken;
  let total = 0;
  let repo = null;
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(
      "https://api.github.com/users/" + GITHUB_USER + "/repos?per_page=100&type=owner&page=" + page,
      { headers }
    );
    if (!res.ok) throw new Error("HTTP " + res.status);
    const repos = await res.json();
    if (!Array.isArray(repos)) throw new Error("unexpected response");
    for (const r of repos) {
      if (r.fork) continue;
      total += r.stargazers_count || 0;
      if (String(r.name).toLowerCase() === GITHUB_FEATURED.toLowerCase()) {
        repo = {
          name: r.name,
          description: r.description ? String(r.description).slice(0, 240) : null,
          language: r.language || null,
          color: null,
          stars: r.stargazers_count || 0,
          forks: r.forks_count || 0,
          pushed: r.pushed_at || null
        };
      }
    }
    if (repos.length < 100) break;
  }
  return { stars: total, repo };
}
function parseRepoBlock(html) {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\\-]/g, "\\$&");
  const start = new RegExp('href="/' + esc(GITHUB_USER) + "/" + esc(GITHUB_FEATURED) + '"\\s+itemprop="name codeRepository"', "i").exec(html);
  if (!start) return null;
  const from = start.index + start[0].length;
  const next = html.indexOf('itemprop="name codeRepository"', from);
  const seg = html.slice(from, next === -1 ? html.length : next);
  const strip = (s) => decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  const d = seg.match(/itemprop="description"[^>]*>([\s\S]*?)<\/p>/);
  const lang = seg.match(/itemprop="programmingLanguage">([^<]+)</);
  const col = seg.match(/repo-language-color"\s+style="background-color:\s*(#[0-9a-fA-F]{3,8})/);
  const st = seg.match(/\/stargazers">([\s\S]*?)<\/a>/);
  const fk = seg.match(/\/forks">([\s\S]*?)<\/a>/);
  const tm = seg.match(/<relative-time[^>]*datetime="([^"]+)"/);
  const n = (m) => {
    const v = m ? parseCompact(strip(m[1])) : 0;
    return isNaN(v) ? 0 : v;
  };
  return {
    name: GITHUB_FEATURED,
    description: d ? strip(d[1]).slice(0, 240) || null : null,
    language: lang ? strip(lang[1]) : null,
    color: col ? col[1] : null,
    stars: n(st),
    forks: n(fk),
    pushed: tm ? tm[1] : null
  };
}
async function fetchGitHubScrape() {
  const re = new RegExp('href="/' + GITHUB_USER + '/[^"/]+/stargazers"[^>]*>([\\s\\S]*?)</a>', "gi");
  let total = 0;
  let repo = null;
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(
      "https://github.com/" + GITHUB_USER + "?tab=repositories&type=source&page=" + page,
      { headers: { "User-Agent": UA } }
    );
    if (!res.ok) throw new Error("HTTP " + res.status);
    const html = await res.text();
    let m;
    while (m = re.exec(html)) {
      const n = parseCompact(m[1].replace(/<[^>]+>/g, ""));
      if (!isNaN(n)) total += n;
    }
    if (!repo) repo = parseRepoBlock(html);
    if (!/rel="next"/.test(html)) break;
  }
  return { stars: total, repo };
}
function decodeXml(s) {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}
function num(v) {
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}
function isoDuration(d) {
  const m = String(d || "").match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
}
function cleanVideo(id, title, published, extra) {
  if (!/^[\w-]{11}$/.test(id || "")) throw new Error("bad video id");
  extra = extra || {};
  return {
    id,
    title: String(title || "").slice(0, 200),
    published: published || null,
    views: extra.views ?? null,
    likes: extra.likes ?? null,
    comments: extra.comments ?? null,
    duration: extra.duration ?? null
  };
}
var VIDEO_COUNT = 3;
function isPlaceholderTitle(title) {
  return /^(private|deleted) video$/i.test(String(title || "").trim());
}
async function fetchLatestVideos(env) {
  let apiError;
  const ytKey = getEnv(env, "YOUTUBE_API_KEY");
  if (ytKey) {
    try {
      return await fetchLatestVideosApi(ytKey);
    } catch (e) {
      apiError = e.message;
    }
  } else {
    apiError = "YOUTUBE_API_KEY is not set";
  }
  try {
    return await fetchLatestVideosRss();
  } catch (e) {
    throw new Error("api: " + apiError + " | rss: " + e.message);
  }
}
async function fetchLatestVideosApi(key) {
  const base = "https://www.googleapis.com/youtube/v3/";
  const chRes = await fetch(
    base + "channels?part=contentDetails&forHandle=" + encodeURIComponent(YOUTUBE_HANDLE) + "&key=" + encodeURIComponent(key)
  );
  const ch = await chRes.json().catch(() => ({}));
  if (!chRes.ok) throw new Error(ch.error && ch.error.message || "HTTP " + chRes.status);
  const uploads = ch.items && ch.items[0] && ch.items[0].contentDetails.relatedPlaylists.uploads;
  if (!uploads) throw new Error("uploads playlist not found");
  const plRes = await fetch(
    base + "playlistItems?part=snippet,contentDetails&maxResults=6&playlistId=" + encodeURIComponent(uploads) + "&key=" + encodeURIComponent(key)
  );
  const pl = await plRes.json().catch(() => ({}));
  if (!plRes.ok) throw new Error(pl.error && pl.error.message || "HTTP " + plRes.status);
  const items = (pl.items || []).filter(
    (i) => i.snippet && i.snippet.resourceId && /^[\w-]{11}$/.test(i.snippet.resourceId.videoId || "") && !isPlaceholderTitle(i.snippet.title)
  ).slice(0, VIDEO_COUNT);
  if (!items.length) throw new Error("no videos");
  const stats = {};
  try {
    const ids = items.map((i) => i.snippet.resourceId.videoId).join(",");
    const vRes = await fetch(
      base + "videos?part=statistics,contentDetails&id=" + ids + "&key=" + encodeURIComponent(key)
    );
    const v = await vRes.json().catch(() => ({}));
    for (const vi of vRes.ok && v.items || []) {
      stats[vi.id] = {
        views: num(vi.statistics.viewCount),
        likes: num(vi.statistics.likeCount),
        // absent when likes are hidden
        comments: num(vi.statistics.commentCount),
        // absent when comments are disabled
        duration: isoDuration(vi.contentDetails && vi.contentDetails.duration)
      };
    }
  } catch (e) {
  }
  return items.map(
    (i) => cleanVideo(
      i.snippet.resourceId.videoId,
      i.snippet.title,
      i.contentDetails && i.contentDetails.videoPublishedAt || i.snippet.publishedAt,
      stats[i.snippet.resourceId.videoId]
    )
  );
}
async function fetchLatestVideosRss() {
  const page = await fetch("https://www.youtube.com/@" + YOUTUBE_HANDLE, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9", "Cookie": "CONSENT=YES+1; SOCS=CAI" }
  });
  if (!page.ok) throw new Error("channel page HTTP " + page.status);
  const html = await page.text();
  const idMatch = html.match(/"(?:channelId|externalId)":"(UC[\w-]{22})"/) || html.match(/channel\/(UC[\w-]{22})/);
  if (!idMatch) throw new Error("channel id not found");
  const feed = await fetch("https://www.youtube.com/feeds/videos.xml?channel_id=" + idMatch[1], {
    headers: { "User-Agent": UA }
  });
  if (!feed.ok) throw new Error("feed HTTP " + feed.status);
  const xml = await feed.text();
  const entries = (xml.match(/<entry>[\s\S]*?<\/entry>/g) || []).slice(0, VIDEO_COUNT);
  if (!entries.length) throw new Error("feed has no entries");
  return entries.map((entry) => {
    const id = (entry.match(/<yt:videoId>([^<]+)</) || [])[1];
    const title = (entry.match(/<title>([^<]*)</) || [])[1];
    const published = (entry.match(/<published>([^<]+)</) || [])[1];
    const views = num((entry.match(/<media:statistics views="(\d+)"/) || [])[1]);
    return cleanVideo(id, decodeXml(title || ""), published, { views });
  });
}
async function fetchTelegram() {
  const res = await fetch("https://t.me/" + TELEGRAM_CHANNEL, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  if (!res.ok) throw new Error("Telegram fetch error");
  const html = await res.text();
  const match = html.match(/(\d[\d\s]*)\s*(members|subscribers)/i);
  if (match) return parseInt(match[1].replace(/\s/g, ""), 10);
  throw new Error("Could not parse Telegram members");
}
function cleanTgText(h) {
  const s = decodeEntities(h.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
  const chars = Array.from(s);
  return chars.length > 180 ? chars.slice(0, 177).join("").trimEnd() + "…" : s;
}
async function fetchTelegramPosts() {
  const res = await fetch("https://t.me/s/" + TELEGRAM_CHANNEL, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" }
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const html = await res.text();
  const posts = [];
  for (const chunk of html.split('data-post="').slice(1)) {
    const idm = chunk.match(/^[^"/]+\/(\d+)"/);
    if (!idm) continue;
    const tm = chunk.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const text = tm ? cleanTgText(tm[1]) : "";
    if (!text) continue;
    const date = (chunk.match(/<time[^>]*datetime="([^"]+)"/) || [])[1] || null;
    const viewsRaw = (chunk.match(/tgme_widget_message_views">([^<]+)</) || [])[1] || "";
    const views = /^[\d.,KMkm\s]{1,8}$/.test(viewsRaw.trim()) ? viewsRaw.trim() : null;
    posts.push({ n: parseInt(idm[1], 10), text, date, views });
  }
  if (!posts.length) throw new Error("no posts found");
  return posts.slice(-3).reverse();
}
function handleOverlay(request, url) {
  if (!DONATE_ON && !Object.keys(LINKS).length) return notFoundResponse("/overlay");
  const NAMES = { telegram: ["تلگرام", "Telegram", "41,182,246"], youtube: ["یوتیوب", "YouTube", "255,68,68"], instagram: ["اینستاگرام", "Instagram", "236,72,153"], github: ["گیت‌هاب", "GitHub", "90,209,201"] };
  const items = Object.keys(NAMES).filter((k) => LINKS[k]).map((k) => ({ k, fa: NAMES[k][0], en: NAMES[k][1], c: NAMES[k][2], h: handleOf(k) }));
  for (const l of EXTRA_LINKS) items.push({ k: l.id, fa: tr(l.label, "fa"), en: tr(l.label, "en"), c: /^[\d, ]+$/.test(l.color || "") ? l.color : "139,92,246", h: handleOf(l.id) });
  if (DONATE_URL) items.push({ k: "donate", fa: tr(DONATE.button.label, "fa"), en: tr(DONATE.button.label, "en"), c: "250,190,88", h: shortUrl(DONATE_URL) });
  if (CRYPTO_URL) items.push({ k: "crypto", fa: tr(DONATE.crypto.label, "fa"), en: tr(DONATE.crypto.label, "en"), c: "59,130,246", h: shortUrl(CRYPTO_URL) });
  const qrs = {};
  for (const it of items) {
    try {
      qrs[it.k] = qrSvg(url.origin + "/" + it.k);
    } catch (e) {
    }
  }
  const text = {};
  for (const l of ["fa", "en"]) text[l] = { title: tr(DONATE.title, l), toman: tr(DONATE.currency, l) };
  const page = fill(OVERLAY_HTML, {
    name: escHtml(SITE.name),
    host: escHtml(url.host),
    title: escHtml(tr(DONATE.title, "fa")),
    currency: escHtml(tr(DONATE.currency, "fa")),
    hostJson: scriptJson(url.host),
    off: offParts().map((k) => "off-" + k).join(" "),
    data: scriptJson({ qrs, items, text, donate: DONATE_ON })
  });
  return new Response(page, {
    headers: { "content-type": "text/html; charset=UTF-8", "cache-control": "no-cache", "x-robots-tag": "noindex" }
  });
}
export {
  worker_default as default
};
