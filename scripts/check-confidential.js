#!/usr/bin/env node
/**
 * Confidentiality guard (SPEC §2, §7).
 *
 * The engagement is under NDA: the sponsoring company, its partners, and every dollar
 * figure must be absent from the site, the repo, and the commit history. This script is
 * the mechanical half of that promise — run it before every push.
 *
 * Add sponsor and partner names to `secrets.local.txt` (git-ignored, one term per
 * line). The names must not live in this file, because this file is committed.
 *
 * False positives happen — "$1" in a regex replacement is not a price. Append
 * `confidentiality-ok` in a comment on that line to skip it. Use it sparingly and never
 * on a line you have not read: the escape hatch exists so that nobody deletes the
 * check, not so that hits can be waved through.
 *
 * Usage:  npm run check:confidential
 * Exit:   0 clean, 1 something needs a human look.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const SECRETS_FILE = path.join(ROOT, "secrets.local.txt");

const SKIP_DIRS = new Set(["node_modules", ".git", ".cache"]);
const SKIP_FILES = new Set(["secrets.local.txt", "package-lock.json"]);
const TEXT_EXTENSIONS = new Set([
  ".md", ".html", ".css", ".js", ".mjs", ".cjs", ".json", ".njk",
  ".txt", ".yml", ".yaml", ".svg",
]);

/**
 * Money in prose: "$1,200", "USD 40k", "1200 dollars", "40k budget".
 *
 * These hunt for figures, not for the word "dollar" — otherwise every file that warns
 * against dollar figures would flag itself, and a guard that cries wolf gets ignored.
 */
const MONEY = [
  { label: "a dollar sign followed by digits", re: /\$\s?\d/ },
  { label: "a figure with a currency word", re: /\b\d[\d,]*(\.\d+)?\s?(k|m|million|thousand)?\s?(dollars?|USD)\b/i },
  { label: "a currency word followed by a figure", re: /\b(USD|US\$)\s?\d/i },
  {
    label: "a figure attached to a cost word",
    re: /\b\d[\d,.]*\s?(k|m)?\b[^.\n]{0,20}\b(cost|costs|budget|price|priced|quote|quoted|award|funding|invoice)\b/i,
  },
];

function loadSponsorTerms() {
  if (!fs.existsSync(SECRETS_FILE)) return [];
  return fs
    .readFileSync(SECRETS_FILE, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(path.join(dir, entry.name));
    } else if (entry.isFile()) {
      if (SKIP_FILES.has(entry.name)) continue;
      if (!TEXT_EXTENSIONS.has(path.extname(entry.name))) continue;
      yield path.join(dir, entry.name);
    }
  }
}

const findings = [];
const sponsorTerms = loadSponsorTerms();

for (const file of walk(ROOT)) {
  const relative = path.relative(ROOT, file);
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);

  lines.forEach((line, index) => {
    const where = `${relative}:${index + 1}`;
    if (line.includes("confidentiality-ok")) return;

    for (const term of sponsorTerms) {
      if (line.toLowerCase().includes(term.toLowerCase())) {
        findings.push({ where, what: `sponsor term "${term}"`, line });
      }
    }
    // This script names the patterns it hunts for, so it would flag itself.
    if (relative === path.join("scripts", "check-confidential.js")) return;

    for (const { label, re } of MONEY) {
      if (re.test(line)) findings.push({ where, what: label, line });
    }
  });
}

/* Commit subjects and bodies are published too. */
let commitFindings = [];
try {
  const log = execSync("git log --format=%s%n%b -n 200", {
    encoding: "utf8",
    cwd: ROOT,
    stdio: ["ignore", "pipe", "ignore"],
  });
  for (const line of log.split(/\r?\n/)) {
    for (const term of sponsorTerms) {
      if (line.toLowerCase().includes(term.toLowerCase())) {
        commitFindings.push({ what: `sponsor term "${term}"`, line });
      }
    }
    for (const { label, re } of MONEY) {
      if (re.test(line)) commitFindings.push({ what: label, line });
    }
  }
} catch {
  /* No commits yet, or no git. Nothing to scan. */
}

if (!sponsorTerms.length) {
  console.warn(
    "! No secrets.local.txt found, so sponsor names were not checked.\n" +
      "  Create it (one term per line: the company, its partners, product code names)\n" +
      "  and re-run. It is git-ignored. Dollar figures were still checked.\n",
  );
}

if (findings.length === 0 && commitFindings.length === 0) {
  console.log(
    `✓ Confidentiality check clean (${sponsorTerms.length} sponsor ${
      sponsorTerms.length === 1 ? "term" : "terms"
    } checked, plus dollar figures).`,
  );
  process.exit(0);
}

console.error("✗ Confidentiality check found something to look at:\n");
for (const { where, what, line } of findings) {
  console.error(`  ${where}\n    ${what}\n    ${line.trim().slice(0, 160)}\n`);
}
for (const { what, line } of commitFindings) {
  console.error(`  git history\n    ${what}\n    ${line.trim().slice(0, 160)}\n`);
}
console.error(
  "Nothing is pushed automatically. Review each hit; rewrite the line or the commit\n" +
    "message before pushing. A hit in git history needs a rebase, not just an edit.",
);
process.exit(1);
