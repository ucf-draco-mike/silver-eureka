/**
 * Eleventy configuration.
 *
 * Output goes to `docs/` so GitHub Pages can serve it straight from the branch with no
 * CI required (Settings → Pages → Deploy from a branch → main → /docs). The built
 * `docs/` directory is committed, and `npm run check:build` verifies it matches the
 * source — which only works because the build is deterministic. Nothing here may
 * depend on the clock or on randomness.
 */
export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  eleventyConfig.addWatchTarget("content/");

  /** "3 of 13 instruments" reads better than a bare count. */
  eleventyConfig.addFilter("pluralize", (count, singular, plural) =>
    Number(count) === 1 ? singular : (plural ?? `${singular}s`),
  );

  return {
    dir: {
      input: "src",
      output: "docs",
      includes: "_includes",
      data: "_data",
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    templateFormats: ["njk", "html"],
  };
}
