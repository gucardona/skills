// Checks the marketplace, every plugin and every skill against the Agent Skills spec (agentskills.io/specification)
// and the Claude Code plugin layout. No dependencies. Usage: node scripts/validate.mjs [repo root]
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? join(import.meta.dirname, ".."));
const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);
const readJSON = (path) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    fail(path, `invalid JSON (${e.message})`);
    return null;
  }
};

/** The frontmatter as a flat key → value map (the spec's fields are single-line strings). */
function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if (!m) return null;
  return Object.fromEntries(m[1].split(/\r?\n/).filter((l) => /^[a-z-]+:/.test(l)).map((l) => [l.slice(0, l.indexOf(":")), l.slice(l.indexOf(":") + 1).trim()]));
}

function checkSkill(dir) {
  const file = join(dir, "SKILL.md");
  const where = file.slice(root.length + 1);
  if (!existsSync(file)) return fail(where, "missing");
  const text = readFileSync(file, "utf8");
  const fm = frontmatter(text);
  if (!fm) return fail(where, "no YAML frontmatter");
  const folder = dir.split(/[\\/]/).pop();
  const name = fm.name ?? "";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name.length > 64) fail(where, `name "${name}" must be 1-64 lowercase letters, digits and single hyphens`);
  if (name !== folder) fail(where, `name "${name}" must match its directory "${folder}"`);
  const desc = fm.description ?? "";
  if (!desc.startsWith("Use when")) fail(where, 'description must start with "Use when" (it says when to load the skill, not what it does)');
  if (desc.length > 1024) fail(where, `description has ${desc.length} characters, max 1024`);
  const lines = text.split(/\r?\n/).length;
  if (lines >= 500) fail(where, `${lines} lines; keep SKILL.md under 500 and move detail to references/`);
  // every relative Markdown link, in SKILL.md and its references, must point to a file that exists
  const docs = [file, ...(existsSync(join(dir, "references")) ? readdirSync(join(dir, "references")).filter((f) => f.endsWith(".md")).map((f) => join(dir, "references", f)) : [])];
  for (const doc of docs) {
    for (const [, target] of readFileSync(doc, "utf8").matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
      if (/^[a-z]+:/i.test(target)) continue; // http:, https:, mailto:
      if (!existsSync(join(dirname(doc), target))) fail(doc.slice(root.length + 1), `link to missing file ${target}`);
    }
  }
}

const market = readJSON(join(root, ".claude-plugin/marketplace.json"));
if (market) {
  for (const key of ["name", "owner", "plugins"]) if (!market[key]) fail("marketplace.json", `missing "${key}"`);
  for (const p of market.plugins ?? []) {
    const where = `marketplace.json plugin "${p.name}"`;
    if (typeof p.source !== "string" || !p.source.startsWith("./") || p.source.includes("..")) {
      fail(where, 'source must be a "./plugins/<name>" path inside this repo');
      continue;
    }
    const dir = join(root, p.source);
    const manifest = join(dir, ".claude-plugin/plugin.json");
    if (existsSync(manifest)) {
      const pj = readJSON(manifest);
      if (pj && pj.name !== p.name) fail(`${p.source}/.claude-plugin/plugin.json`, `name "${pj.name}" must equal the marketplace entry "${p.name}"`);
    }
    const skills = join(dir, "skills");
    if (!existsSync(skills)) {
      fail(where, "has no skills/ folder");
      continue;
    }
    for (const s of readdirSync(skills, { withFileTypes: true })) if (s.isDirectory()) checkSkill(join(skills, s.name));
  }
}

if (errors.length) {
  console.error(errors.map((e) => `✖ ${e}`).join("\n"));
  process.exit(1);
}
console.log("✔ skills ok");
