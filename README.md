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

> The build output is committed under `docs/` so Pages can serve it straight from the
> branch. The cost is that build output can go stale relative to `content/` — which is
> exactly what happens when you edit a file in the web editor, since a browser commit
> cannot run Eleventy. CI closes that gap by rebuilding and committing `docs/` on every
> push to `main`, after the guards pass.
>
> (SPEC §6 says `/root`; `/docs` is the same "deploy from a branch" mode, moved into a
> subdirectory because the site now has a build step.)

### 4. Send a test submission

Submit the form yourself and confirm the email arrives, with the instrument name in the
subject line, **before** circulating the link.

---

## Running it

### As offers arrive

Edit `status` in `content/equipment.json` — `needed` → `offered` → `secured`. Secured
items stay on the page, dimmed, with a green badge: visible progress is what encourages
the next offer.

**From the GitHub web editor** (no toolchain needed): edit the file, commit to `main`,
and wait about a minute. CI rebuilds `docs/` and commits the result, then Pages
redeploys. You will see a follow-up "Rebuild docs/ from content/" commit from
`github-actions[bot]` — that is the published output catching up, and it is expected.

**From a clone**, if you would rather not wait:

```bash
npm run check     # rebuilds docs/ and runs every guard
git add content docs && git commit -m "Mark the reference DMM secured" && git push
```

Either way a bad `status` or a missing field fails the build rather than rendering a
broken card — and because the guards run before the rebuilt output is published, a failed
check leaves the live site untouched rather than publishing something broken.

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

`content/benefits.json` drives the "What you get back" cards. Set `request: true` and give
a `request_label` to make a benefit something the lender can ask for; the build fails if
you set one without the other.

A requestable benefit renders as a selectable card, exactly like an instrument — the card
*is* the checkbox. The rest render as static cards, because calibration and custody happen
either way and acknowledgement has its own consent control; a tick box beside those would
imply a choice that is not on offer. `check:html` asserts that the count of "Ask on the
form" cards matches the count of checkboxes, so a card cannot tell someone to ask for
something they have no way to request.

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

`check:html` also warns when an owner setting is filled in but appears nowhere on the
page — which happens when a placeholder gets edited out of `copy.md` while the setting
stays in `config.json`, leaving it looking effective while controlling nothing.

CI runs everything except the sponsor-name scan, which needs the git-ignored
`secrets.local.txt` and so has to be run locally before a push. `check:build` is
enforced only off `main`, and only as a warning: `main` rebuilds its own output, so
failing there would block the web-editor workflow for nothing.

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

- **Choosing is clicking cards** — both for instruments and for the "ask on the form"
  benefits. Each selectable card is a `<label>` for its own checkbox, so selection is
  native: click, tap, or focus and press Space. Any number can be selected, and they all
  travel in one submission.
- **Those checkboxes sit outside `<form>`**, above it on the page. They submit because
  each carries `form="offer-form"`, which makes it a member of a form it is not nested
  in. Remove that attribute and the selection silently stops being sent with nothing
  looking wrong, so `check:html` asserts it on every card.
- **The form reports selections rather than repeating them.** Duplicating those
  checkboxes inside the form would submit every choice twice, so the form shows a live
  summary and `check:html` fails on a duplicate value in either group.
- **Without JavaScript** the page is complete: cards select, `<details>` opens, and the
  form posts natively to Formspree, whose own thank-you page is the fallback
  confirmation. The script only upgrades the submit to `fetch`, keeps the visitor on the
  page, maintains the selection summary and mail subject, and hides fields that the
  current answers make irrelevant.
- **One exception to that**: "at least one instrument" cannot be expressed by a checkbox
  group in HTML — `required` on a checkbox demands that particular box. The rule is
  enforced in script only. Without script a submission with nothing ticked still reaches
  the inbox, which beats a form that cannot be sent.
- **Card details** — model numbers, near-equivalents, compliance limits — are folded into
  a `<details>` disclosure so five cards fit across. Folded away, not dropped: the
  Section 889 constraint on the thermal camera is exactly the kind of thing that decides
  whether someone's unit is usable.
- **Accessibility:** semantic landmarks, one `h1` with no level skips, labelled controls,
  fieldsets for the radio and checkbox groups, 3:1 control borders and 4.5:1 text
  throughout in both schemes, visible focus rings, `prefers-reduced-motion` honored, skip
  link.
- **Requests:** the page itself and formspree.io on submit. No analytics, no cookies, no
  web fonts, no external scripts. The favicon is inline so even `/favicon.ico` is not
  requested.
- **Weight:** roughly 43 KB total.
