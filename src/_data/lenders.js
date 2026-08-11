/**
 * Loads `content/lenders.json` — the public acknowledgement wall.
 *
 * Everyone in this file put themselves here by ticking the public option on the offer
 * form. Nothing is inferred, and `credit_as` is rendered exactly as the lender wrote
 * it, so the build refuses an entry without one.
 */
import fs from "node:fs";
import path from "node:path";

const DATA_PATH = path.join(process.cwd(), "content", "lenders.json");

const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const lenders = raw.lenders ?? [];

lenders.forEach((lender, index) => {
  if (!lender.credit_as) {
    throw new Error(
      `content/lenders.json: lenders[${index}] has no "credit_as". Only list a lender ` +
        `who opted in to public acknowledgement, using the wording they gave you.`,
    );
  }
});

export default { meta: raw.meta, list: lenders, hasAny: lenders.length > 0 };
