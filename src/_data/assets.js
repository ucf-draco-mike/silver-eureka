/**
 * Content-hashed query strings for the CSS and JS, so a deploy cannot serve a stale
 * stylesheet out of a visitor's cache.
 *
 * Hashing the file contents (rather than stamping a build time) keeps the build
 * deterministic, which is what lets `npm run check:build` tell whether the committed
 * `docs/` matches the source.
 */
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

const shortHash = (relativePath) =>
  crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(process.cwd(), relativePath)))
    .digest("hex")
    .slice(0, 8);

export default {
  css: shortHash("src/assets/css/site.css"),
  js: shortHash("src/assets/js/site.js"),
};
