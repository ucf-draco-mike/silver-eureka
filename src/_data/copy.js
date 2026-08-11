/**
 * Parses `content/copy.md` into the strings the templates render.
 *
 * copy.md is the source of truth for every word on the page — the wording is
 * deliberate, so templates never hard-code prose. Headings in copy.md may carry
 * editorial notes in parentheses ("How it works (three short items — ...)"), so each
 * key matches on the leading words of its heading rather than the whole line.
 *
 * A missing or empty section fails the build. Silently rendering a blank headline is
 * worse than not shipping.
 */
import fs from "node:fs";
import path from "node:path";
import MarkdownIt from "markdown-it";
import site from "./site.js";

const COPY_PATH = path.join(process.cwd(), "content", "copy.md");

/** key -> the leading words of its `## ` heading in copy.md */
const SECTIONS = {
  pageTitle: "Page title",
  headline: "Headline",
  subhead: "Subhead",
  intro: "Intro block",
  howItWorks: "How it works",
  equipmentHeading: "Equipment section heading",
  equipmentNote: "Equipment section note",
  equipmentPickHint: "Equipment pick hint",
  equipmentToFormLink: "Equipment to-form link",
  priorityLabels: "Priority labels",
  benefitsHeading: "Benefits section heading",
  benefitsIntro: "Benefits intro",
  acknowledgementHeading: "Acknowledgement heading",
  acknowledgementNote: "Acknowledgement note",
  lendersHeading: "Lenders section heading",
  lendersEmpty: "Lenders empty state",
  formHeading: "Form heading",
  formIntro: "Form intro",
  formIntentNote: "Form intent note",
  successMessage: "Success message",
  errorMessage: "Error message",
  footer: "Footer",
};

const md = new MarkdownIt({ html: true, linkify: true, typographer: false });

/** Owner placeholders, substituted everywhere the copy mentions them (SPEC §8). */
function fillPlaceholders(text) {
  return text
    .replaceAll("[Oct 2026 – Jan 2027]", site.loanWindow)
    .replaceAll("[building/room]", site.location)
    .replaceAll("[contact email]", site.contactEmail);
}

/** Split copy.md on `## ` headings; ignore the title and the editorial preamble. */
function readSections() {
  const raw = fs.readFileSync(COPY_PATH, "utf8");
  const found = new Map();
  let heading = null;
  let buffer = [];

  const flush = () => {
    if (heading !== null) found.set(heading, buffer.join("\n").trim());
    buffer = [];
  };

  for (const line of raw.split(/\r?\n/)) {
    const match = /^##\s+(.*\S)\s*$/.exec(line);
    if (match) {
      flush();
      heading = match[1];
    } else if (heading !== null) {
      buffer.push(line);
    }
  }
  flush();
  return found;
}

/** Resolve a key to its section body by leading-word match on the heading. */
function bodyFor(key, sections) {
  const prefix = SECTIONS[key].toLowerCase();
  for (const [heading, body] of sections) {
    if (heading.toLowerCase().startsWith(prefix)) {
      if (!body) break;
      return fillPlaceholders(body);
    }
  }
  throw new Error(
    `content/copy.md: no non-empty "## ${SECTIONS[key]}..." section found (key: ${key}). ` +
      `Add it, or remove the key from src/_data/copy.js.`,
  );
}

/** Single-paragraph text: newlines collapsed, markdown emphasis stripped. */
function asText(body) {
  return body
    .replace(/\s*\n\s*/g, " ")
    .replace(/\*\*(.+?)\*\*/g, (_, inner) => inner)
    .trim();
}

/** Rendered markdown, for prose that carries emphasis or links. */
function asHtml(body) {
  return md.render(body).trim();
}

/**
 * "1. **Offer** — two minutes on the form..." -> { n, title, body }
 * The em dash separates the step name from its sentence; a step without one keeps
 * its whole text as the body.
 *
 * Splitting on the dash leaves the body starting mid-sentence ("two minutes on the
 * form"), which reads as a typo once the title sits on its own line in a card. The
 * capital is a rendering fix, not a rewrite — copy.md keeps the run-on phrasing.
 */
function asSteps(body) {
  const steps = [];
  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  for (const chunk of body.split(/\n(?=\d+\.\s)/)) {
    const item = /^(\d+)\.\s+([\s\S]*)$/.exec(chunk.trim());
    if (!item) continue;
    const rest = item[2].replace(/\s*\n\s*/g, " ").trim();
    const titled = /^\*\*(.+?)\*\*\s*—\s*([\s\S]*)$/.exec(rest);
    steps.push({
      n: Number(item[1]),
      title: titled ? titled[1].trim() : `Step ${item[1]}`,
      body: titled ? capitalize(titled[2].trim()) : rest,
    });
  }
  if (!steps.length) {
    throw new Error(
      'content/copy.md: the "How it works" section has no numbered steps.',
    );
  }
  return steps;
}

/** '- critical → "Critical — the bench cannot run without this"' -> { critical: "..." } */
function asLabelMap(body) {
  const labels = {};
  for (const line of body.split(/\r?\n/)) {
    const match = /^\s*[-*]\s*(\S+)\s*(?:→|->)\s*["“](.+)["”]\s*$/.exec(line);
    if (match) labels[match[1]] = match[2];
  }
  for (const key of site.priorityOrder) {
    if (!labels[key]) {
      throw new Error(
        `content/copy.md: the "Priority labels" section is missing a label for "${key}".`,
      );
    }
  }
  return labels;
}

const sections = readSections();
const text = (key) => asText(bodyFor(key, sections));
const html = (key) => asHtml(bodyFor(key, sections));

export default {
  pageTitle: text("pageTitle"),
  headline: text("headline"),
  subhead: text("subhead"),
  introHtml: html("intro"),
  steps: asSteps(bodyFor("howItWorks", sections)),
  equipmentHeading: text("equipmentHeading"),
  equipmentNoteHtml: html("equipmentNote"),
  equipmentPickHint: text("equipmentPickHint"),
  equipmentToFormLink: text("equipmentToFormLink"),
  priorityLabels: asLabelMap(bodyFor("priorityLabels", sections)),
  benefitsHeading: text("benefitsHeading"),
  benefitsIntroHtml: html("benefitsIntro"),
  acknowledgementHeading: text("acknowledgementHeading"),
  acknowledgementNoteHtml: html("acknowledgementNote"),
  lendersHeading: text("lendersHeading"),
  lendersEmpty: text("lendersEmpty"),
  formHeading: text("formHeading"),
  formIntroHtml: html("formIntro"),
  formIntentNoteHtml: html("formIntentNote"),
  successMessage: text("successMessage"),
  errorMessage: text("errorMessage"),
  footerHtml: html("footer"),
};
