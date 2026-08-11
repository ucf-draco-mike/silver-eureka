/**
 * Loads `content/benefits.json` — the return side of the loan.
 *
 * Benefits flagged `request: true` are the ones a lender has to ask for, so they are
 * rendered twice: as a card in "What you get back", and as a checkbox in the offer
 * form. Keeping both from one list means the page can never offer something the form
 * has no way to accept.
 */
import fs from "node:fs";
import path from "node:path";

const DATA_PATH = path.join(process.cwd(), "content", "benefits.json");

const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const benefits = raw.benefits;

benefits.forEach((benefit, index) => {
  const where = `content/benefits.json: benefits[${index}]${benefit.id ? ` ("${benefit.id}")` : ""}`;
  for (const field of ["id", "title", "body"]) {
    if (!benefit[field]) throw new Error(`${where} is missing required field "${field}".`);
  }
  if (benefit.request && !benefit.request_label) {
    throw new Error(`${where} sets request: true but has no request_label for the form checkbox.`);
  }
});

export default {
  all: benefits,
  /** Checkbox options in the offer form, in the order they appear on the page. */
  requestable: benefits
    .filter((benefit) => benefit.request)
    .map(({ id, request_label }) => ({ value: id, label: request_label })),
};
