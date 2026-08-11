#!/usr/bin/env node
/**
 * Purpose guard for the equipment data.
 *
 * A lender needs to know whether their unit is suitable and how to hand it over. They
 * do not need to know what it will be doing on the bench, and neither does anyone else
 * reading a public page. Per-item purposes are individually harmless and collectively
 * revealing: state the role of each instrument and a reader can reconstruct the
 * measurement design, and from there narrow down what is being benchmarked. That is
 * inside the NDA.
 *
 * So: `notes` and `alternatives` describe the INSTRUMENT (specs, accessories,
 * compliance limits, control interfaces, handover practicalities), never the JOB.
 *
 *   Good: "The matching amplifier needs to travel with the probe head."
 *   Bad:  "The independent second power-measurement path our protocol requires."
 *
 * Blocking terms fail the build. Advisory terms only print — some are legitimate
 * instrument vocabulary ("rail sourcing" is what an SMU does) and a guard that cries
 * wolf gets ignored.
 *
 * Usage:  npm run check:purpose
 */
import fs from "node:fs";
import path from "node:path";

/** Scanned per item. `name` is excluded: instrument classes are named what they are. */
const FIELDS = ["notes", "alternatives", "examples"];

const BLOCKING = [
  { re: /\bdevices?\s+under\s+test\b/i, why: "names what is being measured" },
  { re: /\bDUTs?\b/, why: "names what is being measured" },
  { re: /\bbaselines?\b/i, why: "describes the experimental design" },
  { re: /\bcomparators?\b/i, why: "describes the experimental design" },
  { re: /\bbenchmark(ing|s|ed)?\b/i, why: "ties the instrument to the engagement" },
  { re: /\b(measurement|sense|signal)\s+(chain|path)\b/i, why: "describes the measurement topology" },
  { re: /\benergy\s+integration\b/i, why: "describes the method" },
  { re: /\bour\s+(protocol|method|procedure|design)\b/i, why: "describes the method" },
  { re: /\bwe\s+(measure|capture|log|record|instrument)\b/i, why: "states what the instrument will do for us" },
  { re: /\b(used|needed|required)\s+(to|for)\s+\w+/i, why: "states the instrument's job" },
  { re: /\bin\s+order\s+to\b/i, why: "states the instrument's job" },
  { re: /\bso\s+(we|that\s+we)\s+can\b/i, why: "states the instrument's job" },
  { re: /\bfor\s+\w+ing\b/i, why: "states the instrument's job (\"for trigger capture\")" },
];

const ADVISORY = [
  { re: /\btriggers?\b/i, why: "may hint at the capture scheme" },
  { re: /\bshunts?\b/i, why: "may hint at the sensing method" },
  { re: /\brails?\b/i, why: "fine as an instrument spec, revealing as a description of our setup" },
  { re: /\breferences?\b/i, why: "fine as an instrument class, revealing as a role" },
  { re: /\bvalidat(e|ing|ion)\b/i, why: "may hint at the method" },
  { re: /\bfrozen|locked\s+configuration\b/i, why: "may hint at the protocol" },
];

const DATA_PATH = path.join(process.cwd(), "content", "equipment.json");
const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));

const blocked = [];
const advisories = [];

for (const item of data.items) {
  for (const field of FIELDS) {
    const value = item[field];
    if (typeof value !== "string" || !value) continue;

    for (const { re, why } of BLOCKING) {
      const hit = re.exec(value);
      if (hit) blocked.push({ id: item.id, field, term: hit[0], why, value });
    }
    for (const { re, why } of ADVISORY) {
      const hit = re.exec(value);
      if (hit) advisories.push({ id: item.id, field, term: hit[0], why });
    }
  }
}

for (const { id, field, term, why } of advisories) {
  console.warn(`! ${id}.${field}: "${term}" — ${why}`);
}

if (blocked.length) {
  console.error(`\n✗ ${blocked.length} purpose leak(s) in content/equipment.json:\n`);
  for (const { id, field, term, why, value } of blocked) {
    console.error(`  ${id}.${field}`);
    console.error(`    "${term}" ${why}`);
    console.error(`    ${value}\n`);
  }
  console.error(
    "Rewrite the field to describe the instrument rather than the job: what makes a\n" +
      "unit suitable, what has to come with it, what would disqualify it.",
  );
  process.exit(1);
}

console.log(
  `✓ Purpose guard clean across ${data.items.length} items` +
    (advisories.length ? ` (${advisories.length} advisory hit(s) above — read them once).` : "."),
);
