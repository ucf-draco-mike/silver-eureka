/**
 * Site-wide settings and the placeholders the owner fills in before launch.
 *
 * This is the ONLY file that needs editing to go live. Every placeholder below is
 * substituted into the copy, the equipment data, and the form at build time, so the
 * bracketed defaults are what you replace — not the text in `content/`.
 *
 * CONFIDENTIALITY: never put the sponsoring company, its partners, or dollar figures
 * in this file (or any other). The approved description of the work is
 * "an industry-sponsored benchmarking engagement".
 */
export default {
  /* ---- Owner placeholders (SPEC §8) ------------------------------------------ */

  /** Formspree form ID: the 8-character hash from formspree.io. */
  formId: "{FORM_ID}",

  /** Loan window, as it should read in prose. */
  loanWindow: "[Oct 2026 – Jan 2027]",

  /** Where the instruments live. */
  location: "[building/room]",

  /** Contact address. Rendered as a mailto link once it is a real address. */
  contactEmail: "[contact email]",

  /** GitHub account hosting the Pages site. Used for the canonical URL only. */
  githubUser: "{username}",

  /** Repository name, used for the canonical URL only. */
  repoName: "equipment-loans",

  /* ---- Fixed values ----------------------------------------------------------- */

  /**
   * Keep the page out of search results while it is circulating by email.
   * Set to false if you want it indexed.
   */
  noindex: true,

  /** Priority groups, in render order. Labels come from copy.md. */
  priorityOrder: ["critical", "high", "nice"],

  /** Loan-condition choices for the form (SPEC §4). */
  loanConditions: [
    "Can live in DRACO Lab",
    "Supervised use in my lab",
    "Either",
    "Let us discuss",
  ],

  /**
   * Acknowledgement choices. Opt-in means the first option grants nothing and is the
   * default; every other option is an affirmative choice by the lender. Do not
   * reorder so that a consenting option lands first.
   */
  acknowledgementOptions: [
    {
      value: "discuss",
      label: "Let us discuss it when you collect the instrument",
      hint: "Nothing is published in the meantime. This is the default.",
      grantsPublic: false,
    },
    {
      value: "none",
      label: "No acknowledgement, please",
      hint: "We thank you privately and your name appears nowhere.",
      grantsPublic: false,
    },
    {
      value: "publications",
      label: "Acknowledge me in resulting publications",
      hint: "Named in the acknowledgements section, not on this page.",
      grantsPublic: false,
    },
    {
      value: "both",
      label: "Acknowledge me in publications and on this page",
      hint: "Also listed under Lenders below. Removable at any time.",
      grantsPublic: true,
    },
  ],

  get formAction() {
    return `https://formspree.io/f/${this.formId}`;
  },

  get url() {
    return `https://${this.githubUser}.github.io/${this.repoName}/`;
  },
};
