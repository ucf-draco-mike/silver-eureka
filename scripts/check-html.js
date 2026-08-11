#!/usr/bin/env node
/**
 * Structural checks on the built page, with no dependencies.
 *
 * The owner's routine is editing `content/` and committing, so the failure modes worth
 * catching are the ones a data edit can cause: a label pointing at an input that no
 * longer exists, an "Offer this" link naming an option the select dropped, a form that
 * quietly lost its honeypot, a page that outgrew its weight budget.
 *
 * Usage:  npm run check:html
 */
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "docs");
const PAGE = path.join(OUT_DIR, "index.html");
const WEIGHT_BUDGET_KB = 200;
const ALLOWED_ORIGINS = ["formspree.io"];

const problems = [];
const notes = [];
const fail = (message) => problems.push(message);

if (!fs.existsSync(PAGE)) {
  console.error("✗ docs/index.html not found. Run `npm run build` first.");
  process.exit(1);
}
const html = fs.readFileSync(PAGE, "utf8");

const allMatches = (re) => [...html.matchAll(re)];
const attr = (name) => allMatches(new RegExp(`${name}="([^"]*)"`, "g")).map((m) => m[1]);

/* --- ids ------------------------------------------------------------------- */

const ids = attr("id");
const idSet = new Set(ids);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length) fail(`duplicate id(s): ${[...new Set(duplicates)].join(", ")}`);

/* --- references resolve ---------------------------------------------------- */

for (const target of attr("for")) {
  if (!idSet.has(target)) fail(`<label for="${target}"> points at no element`);
}
for (const name of ["aria-describedby", "aria-labelledby"]) {
  for (const value of attr(name)) {
    for (const token of value.split(/\s+/).filter(Boolean)) {
      if (!idSet.has(token)) fail(`${name}="${token}" points at no element`);
    }
  }
}
for (const href of attr("href")) {
  if (href.startsWith("#") && href.length > 1 && !idSet.has(href.slice(1))) {
    fail(`href="${href}" points at no element`);
  }
}

/* --- every input is labelled ----------------------------------------------- */

const labelledIds = new Set(attr("for"));
for (const control of allMatches(/<(input|select|textarea)\b[^>]*>/g)) {
  const tag = control[0];
  if (/type="(hidden|radio|checkbox)"/.test(tag) && /type="hidden"/.test(tag)) continue;
  const id = /id="([^"]*)"/.exec(tag)?.[1];
  const hasAriaLabel = /aria-label(ledby)?="/.test(tag);
  if (!id && !hasAriaLabel) fail(`a <${control[1]}> has neither id nor aria-label: ${tag.slice(0, 80)}`);
  if (id && !labelledIds.has(id) && !hasAriaLabel) fail(`#${id} has no <label for>`);
}

/* --- form contract (SPEC §4) ----------------------------------------------- */

const formTag = /<form\b[^>]*>/.exec(html)?.[0] ?? "";
if (!/method="POST"/i.test(formTag)) fail("the form has no method=POST, so it cannot degrade to a native submit");
const action = /action="([^"]*)"/.exec(formTag)?.[1] ?? "";
if (!action.startsWith("https://formspree.io/f/")) fail(`form action is "${action}", not a Formspree endpoint`);
if (action.includes("{FORM_ID}")) {
  notes.push("the Formspree {FORM_ID} placeholder is unfilled — the form will not deliver until you set owner.formId in content/config.json");
}
for (const required of ["_gotcha", "_subject"]) {
  if (!html.includes(`name="${required}"`)) fail(`the form is missing its ${required} field`);
}
if (/name="_gotcha"[^>]*>/.test(html) && /display:\s*none[^}]*honeypot/i.test(html)) {
  fail("the honeypot is display:none, which some bots skip — keep it off-screen instead");
}
for (const name of ["name", "email", "department", "equipment", "conditions"]) {
  const control = new RegExp(`<(input|select)\\b[^>]*name="${name}"[^>]*>`).exec(html)?.[0];
  if (!control) fail(`the form has no "${name}" control`);
  else if (!/\brequired\b/.test(control)) fail(`the "${name}" control is not required`);
}

/* --- offer links match select options -------------------------------------- */

const options = new Set(allMatches(/<option value="([^"]*)"/g).map((m) => m[1]));
for (const offered of attr("data-offer")) {
  if (!options.has(offered)) fail(`"Offer this" link for "${offered}" has no matching select option`);
}

/* --- headings -------------------------------------------------------------- */

const headings = allMatches(/<h([1-6])\b/g).map((m) => Number(m[1]));
if (headings.filter((level) => level === 1).length !== 1) {
  fail(`expected exactly one <h1>, found ${headings.filter((l) => l === 1).length}`);
}
headings.reduce((previous, level, index) => {
  if (index > 0 && level > previous + 1) fail(`heading level jumps from h${previous} to h${level}`);
  return level;
}, headings[0]);

/* --- no third-party requests (SPEC §7) -------------------------------------- */

for (const value of [...attr("src"), ...attr("href")]) {
  if (!/^https?:\/\//i.test(value)) continue;
  const host = new URL(value).hostname;
  if (!ALLOWED_ORIGINS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
    fail(`subresource points at a third party: ${value}`);
  }
}

/* --- owner settings that do nothing ------------------------------------------ */

/**
 * A config setting only reaches the page through its placeholder. Write the real value
 * into copy.md directly and the placeholder disappears, which leaves the setting sitting
 * in config.json looking effective while controlling nothing — editing it afterwards
 * changes no pixel, silently.
 *
 * The test is whether the placeholder still exists in the rendered content, not whether
 * the value appears on the page: inlining the same text by hand makes the value appear
 * while the setting is just as dead.
 *
 * `formId` is not listed — it reaches the form action through a template, not a
 * placeholder — and `githubUser`/`repoName` feed the canonical URL, which no template
 * renders.
 */
const config = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "content", "config.json"), "utf8"),
);
const equipment = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "content", "equipment.json"), "utf8"),
);
/** Only rendered content counts — equipment.json's `meta` block never reaches a page. */
const renderedContent =
  fs.readFileSync(path.join(process.cwd(), "content", "copy.md"), "utf8") +
  JSON.stringify(equipment.items);

const PLACEHOLDERS = {
  loanWindow: "[Oct 2026 – Jan 2027]",
  location: "[building/room]",
  contactEmail: "[contact email]",
};
for (const [key, placeholder] of Object.entries(PLACEHOLDERS)) {
  const value = config.owner?.[key];
  if (!value || value === placeholder) continue;
  if (!renderedContent.includes(placeholder)) {
    notes.push(
      `owner.${key} is set to "${value}" but its placeholder ${placeholder} no longer ` +
        `appears in content/, so the setting controls nothing — editing it will change ` +
        `nothing on the page. Restore the placeholder where the value belongs, or drop the ` +
        `setting so config.json stops implying it is live.`,
    );
  }
}

/**
 * The mirror case: a setting left at its default renders the bracketed placeholder
 * literally, so visitors read "[building/room]" and conclude the page is unfinished.
 * Worth catching before the link circulates rather than after.
 */
for (const [key, placeholder] of Object.entries({ ...PLACEHOLDERS, githubUser: "{username}" })) {
  if (html.includes(placeholder)) {
    notes.push(
      `owner.${key} is still the placeholder, and "${placeholder}" renders literally on ` +
        `the page. Set it in content/config.json before circulating the link.`,
    );
  }
}

/* --- weight budget ---------------------------------------------------------- */

const bytes = (function total(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((sum, entry) => {
    const full = path.join(dir, entry.name);
    return sum + (entry.isDirectory() ? total(full) : fs.statSync(full).size);
  }, 0);
})(OUT_DIR);
const kb = bytes / 1024;
if (kb > WEIGHT_BUDGET_KB) fail(`page weight is ${kb.toFixed(1)} KB, over the ${WEIGHT_BUDGET_KB} KB budget`);

/* --- report ----------------------------------------------------------------- */

for (const note of notes) console.warn(`! ${note}`);

if (problems.length) {
  console.error(`\n✗ ${problems.length} problem(s) in docs/index.html:\n`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(`✓ HTML checks pass (${kb.toFixed(1)} KB of ${WEIGHT_BUDGET_KB} KB budget).`);
