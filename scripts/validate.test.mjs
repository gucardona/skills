// Runs validate.mjs against a good and a broken marketplace built in a temp folder. Usage: node --test scripts/
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const validator = join(import.meta.dirname, "validate.mjs");

function repo({ name = "good-skill", dir = "good-skill", description = "Use when testing the validator.", body = "# Good\n", link = "" } = {}) {
  const root = mkdtempSync(join(tmpdir(), "skills-"));
  mkdirSync(join(root, ".claude-plugin"));
  writeFileSync(join(root, ".claude-plugin/marketplace.json"), JSON.stringify({ name: "m", owner: { name: "o" }, plugins: [{ name: "p", source: "./plugins/p" }] }));
  const skill = join(root, "plugins/p/skills", dir);
  mkdirSync(join(root, "plugins/p/.claude-plugin"), { recursive: true });
  writeFileSync(join(root, "plugins/p/.claude-plugin/plugin.json"), JSON.stringify({ name: "p" }));
  mkdirSync(join(skill, "references"), { recursive: true });
  writeFileSync(join(skill, "references/a.md"), "# A\n");
  writeFileSync(join(skill, "SKILL.md"), `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}${link}`);
  return root;
}

const run = (root) => {
  try {
    return { ok: true, out: execFileSync("node", [validator, root], { encoding: "utf8" }) };
  } catch (e) {
    return { ok: false, out: e.stdout + e.stderr };
  }
};

test("a well-formed marketplace passes", () => {
  const r = run(repo({ link: "[a](references/a.md)\n" }));
  assert.equal(r.ok, true, r.out);
});

test("each broken rule fails with a message that names it", () => {
  const cases = [
    [{ name: "Bad_Name" }, "name"],
    [{ name: "other-name" }, "directory"],
    [{ description: "Does things." }, "Use when"],
    [{ description: `Use when ${"x".repeat(1100)}` }, "1024"],
    [{ body: "line\n".repeat(500) }, "500"],
    [{ link: "[gone](references/missing.md)\n" }, "missing.md"],
  ];
  for (const [over, word] of cases) {
    const r = run(repo(over));
    assert.equal(r.ok, false, `should fail: ${JSON.stringify(over).slice(0, 60)}`);
    assert.match(r.out, new RegExp(word));
  }
});

test("a plugin whose plugin.json name differs from its marketplace entry fails", () => {
  const root = repo();
  writeFileSync(join(root, "plugins/p/.claude-plugin/plugin.json"), JSON.stringify({ name: "q" }));
  const r = run(root);
  assert.equal(r.ok, false);
  assert.match(r.out, /plugin\.json/);
});

const withAgent = (frontmatter) => {
  const root = repo();
  mkdirSync(join(root, "plugins/p/agents"));
  writeFileSync(join(root, "plugins/p/agents/rev.md"), `---\n${frontmatter}\n---\n\nBody\n`);
  return root;
};

test("plugin agents are checked: name, description, model and ignored fields", () => {
  const good = run(withAgent("name: rev\ndescription: Use to review.\nmodel: haiku"));
  assert.equal(good.ok, true, good.out);
  const cases = [
    ["name: other\ndescription: Use to review.", "file name"],
    ["name: rev\ndescription: Reviews things.", "Use when"],
    ["name: rev\ndescription: Use to review.\nmodel: gpt-5", "model"],
    ["name: rev\ndescription: Use to review.\npermissionMode: bypassPermissions", "permissionMode"],
  ];
  for (const [fm, word] of cases) {
    const r = run(withAgent(fm));
    assert.equal(r.ok, false, `should fail: ${fm}`);
    assert.match(r.out, new RegExp(word));
  }
});

test("a dependency on another marketplace must be allowed by the marketplace", () => {
  const root = repo();
  writeFileSync(join(root, "plugins/p/.claude-plugin/plugin.json"), JSON.stringify({ name: "p", dependencies: ["x@other"] }));
  const r = run(root);
  assert.equal(r.ok, false);
  assert.match(r.out, /allowCrossMarketplaceDependenciesOn/);
  const market = { name: "m", owner: { name: "o" }, allowCrossMarketplaceDependenciesOn: ["other"], plugins: [{ name: "p", source: "./plugins/p" }] };
  writeFileSync(join(root, ".claude-plugin/marketplace.json"), JSON.stringify(market));
  const ok = run(root);
  assert.equal(ok.ok, true, ok.out);
});
