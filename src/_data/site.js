/**
 * Site-wide settings for the templates.
 *
 * What the owner controls lives in `content/config.json`; `lib/config.js` reads and
 * validates it. What the form *is* lives here — intents, loan conditions,
 * acknowledgement choices — because those are structure rather than knobs.
 *
 * ONE export only. Eleventy unwraps a data file's default export only when it is the
 * module's sole export; a named export alongside it hands templates the module
 * namespace instead, and every `site.*` lookup silently renders empty.
 */
import { owner, sections, hidden, page } from "../../lib/config.js";

export default {
  ...owner,

  /** Keep the page out of search results while it circulates by email. */
  noindex: !page.allowSearchEngines,

  sections,
  hidden,

  /** Priority groups, in render order. Labels come from copy.md. */
  priorityOrder: ["critical", "high", "nice"],

  /**
   * What the sender is telling us. Without this the form has room for a firm offer and
   * nothing else, and every "not this semester, but ask me in the spring" goes
   * unrecorded. `subject` prefixes the notification email so the inbox sorts itself.
   */
  intents: [
    {
      value: "lend",
      label: "I can lend this",
      subject: "Equipment loan offer",
      needsConditions: true,
    },
    {
      value: "maybe",
      label: "I might be able to — I need to check first",
      subject: "Possible loan",
      needsConditions: true,
    },
    {
      value: "later",
      label: "Not during your window, but ask me for a later one",
      subject: "Later availability",
      needsConditions: false,
    },
    {
      value: "lead",
      label: "I do not have one, but I know who might",
      subject: "Lead",
      needsConditions: false,
    },
  ],

  /** Loan-condition choices (SPEC §4). */
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

  /** Computed eagerly — see the note on single-export data files above. */
  formAction: `https://formspree.io/f/${owner.formId}`,
  url: `https://${owner.githubUser}.github.io/${owner.repoName}/`,
};
