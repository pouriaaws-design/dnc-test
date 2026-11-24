// npm run check — finds the usual mistakes in site.config.js before you deploy.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";

const problems = [];
let cfg;
try {
  cfg = (await import("../site.config.js")).default;
} catch (e) {
  console.error("site.config.js cannot be read (missing comma or quote?): " + e.message);
  process.exit(1);
}
if (!cfg.name) problems.push("name is empty");
if (!cfg.languages?.includes(cfg.defaultLang)) problems.push("defaultLang must be one of languages");
for (const [k, v] of Object.entries(cfg.social || {})) {
  if (v && !/^[\w.-]+$/.test(v)) problems.push(`social.${k}: write only the username, without @ or https:// (now: ${v})`);
}
const ids = new Set(["telegram", "youtube", "instagram", "github", "donate", "crypto", "project", "video", "post", "stats", "overlay"]);
for (const l of cfg.links || []) {
  if (!/^[a-z0-9-]{1,30}$/.test(l.id || "")) problems.push(`links: id "${l.id}" may only have a-z, 0-9 and -`);
  else if (ids.has(l.id)) problems.push(`links: id "${l.id}" is used twice or reserved`);
  if (!/^(https?:|mailto:|tel:|tg:)/i.test(l.url || "")) problems.push(`links: url of "${l.id}" must start with https://, mailto: or tel:`);
  ids.add(l.id);
}
const raw = readFileSync(new URL("../site.config.js", import.meta.url), "utf8");
if (/\b\d{8,10}:[\w-]{35}\b/.test(raw) || /\bAIza[\w-]{35}\b/.test(raw) || /\bgh[pousr]_\w{30,}/.test(raw)) problems.push("a token or API key is in site.config.js: remove it and revoke it");

const root = new URL("..", import.meta.url).pathname;
for (const f of ["src/worker.js", ...readdirSync(root + "public").filter((f) => f.endsWith(".js")).map((f) => "public/" + f)]) {
  try {
    execFileSync(process.execPath, ["--check", root + f], { stdio: "pipe" });
  } catch (e) {
    problems.push(f + " has a syntax error:\n" + e.stderr);
  }
}
if (problems.length) {
  console.error("Problems:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log("OK");
