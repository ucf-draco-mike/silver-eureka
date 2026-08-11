/**
 * Loads and validates `content/equipment.json`, then groups it for rendering.
 *
 * The owner's live workflow is editing `status` in that file and committing, so a typo
 * there must fail the build loudly rather than render a card with a badge that says
 * "secrued". Every field the templates read is checked here.
 */
import fs from "node:fs";
import path from "node:path";
import site from "./site.js";

const DATA_PATH = path.join(process.cwd(), "content", "equipment.json");

const STATUSES = ["needed", "offered", "secured"];
const REQUIRED = ["id", "name", "examples", "qty", "priority", "weeks_needed", "status"];

/** Placeholder substitution, matching the copy (SPEC §8). */
function fill(value) {
  return typeof value === "string"
    ? value
        .replaceAll("[Oct 2026 – Jan 2027]", site.loanWindow)
        .replaceAll("[building/room]", site.location)
        .replaceAll("[contact email]", site.contactEmail)
    : value;
}

function validate(item, index) {
  const where = `content/equipment.json: items[${index}]${item.id ? ` ("${item.id}")` : ""}`;

  for (const field of REQUIRED) {
    if (item[field] === undefined || item[field] === null || item[field] === "") {
      throw new Error(`${where} is missing required field "${field}".`);
    }
  }
  if (!STATUSES.includes(item.status)) {
    throw new Error(
      `${where} has status "${item.status}". Use one of: ${STATUSES.join(", ")}.`,
    );
  }
  if (!site.priorityOrder.includes(item.priority)) {
    throw new Error(
      `${where} has priority "${item.priority}". Use one of: ${site.priorityOrder.join(", ")}.`,
    );
  }
  if (!Number.isFinite(Number(item.qty)) || Number(item.qty) < 1) {
    throw new Error(`${where} has qty "${item.qty}". Use a positive number.`);
  }
  if (!Number.isFinite(Number(item.weeks_needed)) || Number(item.weeks_needed) < 1) {
    throw new Error(`${where} has weeks_needed "${item.weeks_needed}". Use a positive number.`);
  }
}

const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const items = raw.items.map((item, index) => {
  validate(item, index);
  return {
    ...item,
    name: fill(item.name),
    examples: fill(item.examples),
    alternatives: fill(item.alternatives),
    notes: fill(item.notes),
    qty: Number(item.qty),
    weeks_needed: Number(item.weeks_needed),
    /** Secured items stay on the page, dimmed — visible progress encourages offers. */
    isSecured: item.status === "secured",
  };
});

const seen = new Set();
for (const item of items) {
  if (seen.has(item.id)) {
    throw new Error(`content/equipment.json: duplicate id "${item.id}".`);
  }
  seen.add(item.id);
}

const groups = site.priorityOrder
  .map((priority) => ({ priority, items: items.filter((i) => i.priority === priority) }))
  .filter((group) => group.items.length > 0);

const countBy = (status) => items.filter((i) => i.status === status).length;

export default {
  meta: raw.meta,
  items,
  groups,
  /** Select options: every item, plus the catch-all the spec requires. */
  options: [...items.map((i) => i.name), "Other / near-equivalent"],
  stats: {
    total: items.length,
    needed: countBy("needed"),
    offered: countBy("offered"),
    secured: countBy("secured"),
    /** Anything that is spoken for, whether promised or in hand. */
    covered: countBy("offered") + countBy("secured"),
  },
};
