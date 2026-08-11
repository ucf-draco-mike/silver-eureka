# Instrument Loans — DRACO Lab

A one-page site that lists the instruments DRACO Lab needs to borrow, says plainly what
a lender gets back, and collects offers through Formspree. Static output, deployed from
this repository by GitHub Pages.

Built with [Eleventy](https://www.11ty.dev/) and Nunjucks. Templates hold no prose: every
word comes from `content/`, so updating the site is editing a Markdown or JSON file.

---

## Quick start

```bash
npm install
npm run serve     # http://localhost:8080 with live reload
npm run build     # writes docs/
npm run check     # build + every guard below
```

Node 18 or newer.

---

## Setup, once

### 1. Fill in `content/config.json`

One file controls the launch settings **and** what the public page shows.

```jsonc
{
  "owner": {
    "formId": "{FORM_ID}",                    // 8-character Formspree ID
    "loanWindow": "[Oct 2026 – Jan 2027]",    // as it should read in prose
    "location": "[building/room]",            // where the instruments live
    "contactEmail": "[contact email]",        // mailto link in the footer and error message
    "githubUser": "{username}",               // canonical Pages URL only
    "repoName": "equipment-loans"
  },
  "page":     { "allowSearchEngines": false },
  "sections": { "howItWorks": true, "scopeNote": true, "progressCount": true,
                "benefits": true, "lendersWall": true, "acknowledgement": true,
                "interest": true },
  "hidden":   { "equipment": [], "benefits": [] }
}
```

The bracketed defaults are placeholders, substituted into the copy and equipment data at
build time — `content/` keeps its generic wording and you never hunt for them.

**`sections`** turns a part of the page off entirely. Form controls travel with the
section that explains them: switch off `benefits` and the request checkboxes go with it;
switch off `acknowledgement` and the page stops asking and the lenders wall goes too.
Anything you leave out of the file stays on.

**`hidden`** withholds individual records without deleting them:

```jsonc
"hidden": { "equipment": ["interposer", "gpu-time"], "benefits": [] }
```

A hidden instrument disappears from the cards, from the form dropdown, and from the
progress count — ask for it privately by email instead. This is the lever for an item
that is too revealing to list: the notes never state a purpose, but a distinctive part
can narrow the design down on its own.

Every setting is validated at build time. An unknown section name, a non-boolean toggle,
or an id in `hidden` that matches no record all fail the build, listing the valid values.
That last one matters most — a typo in `hidden` would otherwise publish something you
believed you had withheld, and nothing on the page would look wrong.

### 2. Create the Formspree form

1. Free account at [formspree.io](https://formspree.io) → **New form** → name it
   "Equipment loans".
2. Copy the form ID into `owner.formId` in `content/config.json`.
3. In form settings, confirm the notification email. Leave reCAPTCHA at its default —
   AJAX submissions work on the free tier, and the honeypot handles casual spam.
4. Free tier allows 50 submissions per month, which is ample here.

`npm run check:html` warns for as long as `{FORM_ID}` is unfilled.

### 3. Turn on GitHub Pages

Push, then **Settings → Pages → Deploy from a branch → `main` → `/docs`**.

Site URL: `https://<githubUser>.github.io/<repoName>/`.

> The build output is committed under `docs/` on purpose: Pages serves it straight from
> the branch, so the site deploys with no CI and no Actions permissions. `npm run check`
> fails if `docs/` has drifted from the source, which is the failure this trades against.
> (SPEC §6 says `/root`; `/docs` is the same "deploy from a branch" mode, moved into a
> subdirectory because the site now has a build step.)

### 4. Send a test submission

Submit the form yourself and confirm the email arrives, with the instrument name in the
subject line, **before** circulating the link.

---

## Running it

### As offers arrive

Edit `status` in `content/equipment.json` — `needed` → `offered` → `secured` — then
rebuild and commit. Secured items stay on the page, dimmed, with a green badge: visible
progress is what encourages the next offer.

```bash
npm run check     # rebuilds docs/ and runs every guard
git add content docs && git commit -m "Mark the reference DMM secured" && git push
```

A bad `status` or a missing field fails the build rather than rendering a broken card.

### Honoring the acknowledgement opt-in

The form's acknowledgement question defaults to **"Let us discuss it"**, which grants
nothing. Only two answers permit anything:

| Lender's answer | What you may do |
|---|---|
| Let us discuss it *(default)* | Nothing. Ask them in person. |
| No acknowledgement, please | Nothing, ever. Do not ask again. |
| Acknowledge me in resulting publications | Name in the paper's acknowledgements only. **Not** on the site. |
| Acknowledge me in publications and on this page | Both. Add them to `content/lenders.json`. |

Add a lender to `content/lenders.json` **only** for the last answer, using their
`credit_as` wording verbatim. Remove an entry the moment they ask — no approval step, no
archive. The build refuses an entry with no `credit_as`, which is the mechanical half of
"we use their words, not ours".

### Reading the inbox

The form's first question asks what the sender is telling you, and the answer prefixes
the notification subject so the inbox sorts itself:

| Answer | Subject prefix | Loan conditions asked? |
|---|---|---|
| I can lend this | `Equipment loan offer:` | Yes |
| I might be able to — I need to check first | `Possible loan:` | Yes |
| Not during your window, but ask me for a later one | `Later availability:` | No |
| I do not have one, but I know who might | `Lead:` | No |

The last two hide the loan-conditions question, since it has nothing to answer. Without
JavaScript the question stays visible and "Let us discuss" covers it.

A separate "register interest" form was the obvious alternative and is the worse one: it
splits the inbox, doubles what you maintain, and eats the same 50-submission monthly
allowance. One form with an intent field costs a sender four seconds and catches the
"not this semester" replies that a pure offer form loses silently.

**Follow-up consent** is a single unticked checkbox — "you may come back to me about
later needs". Unticked means reply about this message only. It is what turns a "not now"
into a lead you may legitimately use next semester, and leaving it unticked by default is
what keeps it from being a mailing list.

### Changing what lenders are offered

`content/benefits.json` drives both the "What you get back" cards and the checkboxes in
the form, from one list — the page cannot advertise something the form has no way to
accept. Set `request: true` and give a `request_label` to make a benefit something the
lender ticks; the build fails if you set one without the other.

**These are promises.** Bench time, a facilities letter, student seats, and reciprocal
borrowing all cost real hours later. Remove any item you are not prepared to honor
before the link circulates.

---

## The two confidentiality rules

### The sponsor and dollar figures never appear

Not in the site, the repo, the commit messages, or the form. The approved description of
the work is "an industry-sponsored benchmarking engagement".

```bash
cp secrets.local.txt.example secrets.local.txt   # then add the real names
npm run check:confidential
```

`secrets.local.txt` is git-ignored — one term per line: the company, its partners, any
product code names. The script scans every text file **and the last 200 commit
messages**. A hit in history needs a rebase, not an edit. Without the file it still
checks for dollar figures, and says so.

A false positive on a line you have read can be skipped with a `confidentiality-ok`
comment on that line. The hatch exists so nobody deletes the check.

### No instrument says what it is for

`notes` and `alternatives` in `content/equipment.json` describe **the instrument** —
specs, accessories that must travel with it, compliance limits, control interfaces,
handover practicalities. They never describe **the job**.

> Good: "The matching amplifier needs to travel with the probe head."
> Bad: "The independent second power-measurement path our protocol requires."

Individually a role is harmless; together, thirteen roles reconstruct the measurement
design and narrow down what is being benchmarked. `npm run check:purpose` fails on
role and methodology language, and prints advisories for the borderline vocabulary that
is sometimes legitimate ("rail sourcing" is what an SMU does).

The page tells lenders this omission is deliberate, so nobody reads it as vagueness.

---

## Checks

| Command | What it protects |
|---|---|
| `npm run check:html` | Labels resolve, every required field is required, honeypot and `_subject` survive, "Offer this" links match select options, no third-party subresources, page weight under 200 KB |
| `npm run check:purpose` | No instrument describes its job |
| `npm run check:confidential` | No sponsor names, no dollar figures, in files or commit messages |
| `npm run check:build` | Committed `docs/` matches the source |
| `npm run check` | All of the above, after a fresh build |

CI runs everything except the sponsor-name scan, which needs the git-ignored
`secrets.local.txt` and so has to be run locally before a push.

---

## Layout

```
content/            Everything a human edits
  config.json         Launch settings and what the page shows. Start here.
  copy.md             All page prose. Sections are matched by heading.
  equipment.json      The list. `status` drives the badges.
  benefits.json       The return side; drives cards and form checkboxes together.
  lenders.json        Public acknowledgement wall — opt-in only.
lib/
  config.js           Reads and validates config.json
src/
  _data/              JS that loads, validates, and shapes content/ for the templates
  _includes/          Nunjucks layout and partials — markup only, no prose
  assets/             One stylesheet, one progressive-enhancement script
  index.njk           The page
scripts/            The guards above
docs/               Build output. Committed; served by Pages. Do not edit by hand.
```

> `lib/config.js` sits outside `src/_data/` on purpose. Every `.js` in the data directory
> is a data file, and Eleventy unwraps a data file's default export **only** when it is
> the module's sole export — add one named export beside it and templates receive
> `{default: {...}}` instead, so every `site.*` lookup silently renders empty. Shared
> helpers live in `lib/`; data files keep exactly one export each.

---

## How it behaves

- **Without JavaScript** the page is complete: cards, select options, and a native POST
  to Formspree. Formspree's own thank-you page is the fallback confirmation. The script
  only upgrades the submit to `fetch`, keeps the visitor on the page, preselects the
  instrument from an "Offer this" link, and hides the credit-wording field until it is
  relevant.
- **"Offer this"** is a link rather than a button precisely so it still reaches the form
  with scripting off. With scripting on it preselects the instrument, sets the mail
  subject, moves focus to the first field, and announces the change to a screen reader.
- **Accessibility:** semantic landmarks, one `h1` with no level skips, labelled controls,
  fieldsets for the radio and checkbox groups, 3:1 control borders and 4.5:1 text
  throughout in both schemes, visible focus rings, `prefers-reduced-motion` honored, skip
  link.
- **Requests:** the page itself and formspree.io on submit. No analytics, no cookies, no
  web fonts, no external scripts. The favicon is inline so even `/favicon.ico` is not
  requested.
- **Weight:** roughly 43 KB total.
