#!/usr/bin/env node
/**
 * Verifies that the committed `docs/` output matches the current source.
 *
 * GitHub Pages serves `docs/` straight from the branch, so a stale build is a site
 * that quietly disagrees with `content/`. Run `npm run build` first, then this: if git
 * reports changes under `docs/`, the committed output was out of date.
 *
 * Usage:  npm run check:build   (or `npm run check` for build + both guards)
 */
import { execSync } from "node:child_process";

let status;
try {
  status = execSync("git status --porcelain -- docs", { encoding: "utf8" });
} catch {
  console.warn("! Not a git repository, so the committed build could not be compared.");
  process.exit(0);
}

if (!status.trim()) {
  console.log("✓ docs/ matches the current source.");
  process.exit(0);
}

console.error("✗ docs/ is out of date. A fresh build changed these files:\n");
console.error(status.trimEnd());
console.error(
  "\nCommit the rebuilt output (`git add docs && git commit`) so GitHub Pages serves\n" +
    "what content/ actually says.",
);
process.exit(1);
