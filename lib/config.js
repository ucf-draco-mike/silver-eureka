/**
 * Reads and validates `content/config.json`.
 *
 * This lives outside `src/_data/` deliberately. Every `.js` in the data directory is a
 * data file, and Eleventy only unwraps the default export when that is the module's
 * *only* export — add a named one and templates receive the whole module namespace
 * (`{default: {...}}`) instead, so `site.formAction` silently becomes empty. Shared
 * helpers therefore live here, and the data files stay thin adapters with one export
 * each.
 *
 * Validation fails the build rather than warning. The setting that matters most is
 * `hidden`: a typo there would publish a record the owner believed they had withheld,
 * and nothing downstream would look wrong.
 */
import fs from "node:fs";
import path from "node:path";

const CONFIG_PATH = path.join(process.cwd(), "content", "config.json");
const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));

export const KNOWN_SECTIONS = [
  "howItWorks",
  "scopeNote",
  "progressCount",
  "benefits",
  "lendersWall",
  "acknowledgement",
  "interest",
];
const KNOWN_HIDE_LISTS = ["equipment", "benefits"];
const REQUIRED_OWNER_KEYS = [
  "formId",
  "loanWindow",
  "location",
  "contactEmail",
  "githubUser",
  "repoName",
];

/** Keys beginning with an underscore are notes to the reader, not settings. */
const settingKeys = (object) => Object.keys(object ?? {}).filter((key) => !key.startsWith("_"));

const fail = (message) => {
  throw new Error(`content/config.json: ${message}`);
};

/* --- owner ------------------------------------------------------------------- */

const ownerBlock = raw.owner ?? fail('missing the "owner" block.');
for (const key of REQUIRED_OWNER_KEYS) {
  if (typeof ownerBlock[key] !== "string" || !ownerBlock[key].trim()) {
    fail(`owner.${key} must be a non-empty string.`);
  }
}
for (const key of settingKeys(ownerBlock)) {
  if (!REQUIRED_OWNER_KEYS.includes(key)) {
    fail(`unknown setting "owner.${key}". Expected one of: ${REQUIRED_OWNER_KEYS.join(", ")}.`);
  }
}

/** Without the underscore keys, so reader notes never reach a template. */
export const owner = Object.fromEntries(
  REQUIRED_OWNER_KEYS.map((key) => [key, ownerBlock[key]]),
);

/* --- sections ---------------------------------------------------------------- */

export const sections = {};
for (const key of settingKeys(raw.sections)) {
  if (!KNOWN_SECTIONS.includes(key)) {
    fail(`unknown section "${key}". Expected one of: ${KNOWN_SECTIONS.join(", ")}.`);
  }
  if (typeof raw.sections[key] !== "boolean") {
    fail(`sections.${key} must be true or false, not ${JSON.stringify(raw.sections[key])}.`);
  }
  sections[key] = raw.sections[key];
}
/** Anything unmentioned stays on, so a new section does not vanish from an old config. */
for (const key of KNOWN_SECTIONS) {
  if (!(key in sections)) sections[key] = true;
}

/**
 * The request checkboxes are explained by the benefit cards. Without the section, the
 * form would be offering things the page never described.
 */
sections.requestableBenefits = sections.benefits;

/* --- hidden ------------------------------------------------------------------ */

const hidden = {};
for (const key of settingKeys(raw.hidden)) {
  if (!KNOWN_HIDE_LISTS.includes(key)) {
    fail(`unknown hide list "hidden.${key}". Expected one of: ${KNOWN_HIDE_LISTS.join(", ")}.`);
  }
  if (!Array.isArray(raw.hidden[key])) {
    fail(`hidden.${key} must be a list of ids, e.g. ["interposer"].`);
  }
  hidden[key] = raw.hidden[key];
}
for (const key of KNOWN_HIDE_LISTS) {
  if (!(key in hidden)) hidden[key] = [];
}

export { hidden };

export const page = { allowSearchEngines: raw.page?.allowSearchEngines ?? false };

/**
 * Called by the equipment and benefits loaders once they know their real ids, so a
 * typo in `hidden` is reported instead of quietly publishing the record.
 */
export function assertHiddenIdsExist(listName, knownIds) {
  for (const id of hidden[listName]) {
    if (!knownIds.includes(id)) {
      fail(
        `hidden.${listName} lists "${id}", which is not an id in content/${listName}.json. ` +
          `Known ids: ${knownIds.join(", ")}.`,
      );
    }
  }
}

export const isHidden = (listName, id) => hidden[listName].includes(id);
