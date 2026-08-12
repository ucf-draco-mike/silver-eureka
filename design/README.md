# Design explorations

Scratch space for design work that is **not** part of the built site. The site
builds from `src/` to `docs/`; nothing in here is served or deployed.

## `card-layouts.html`

Four alternative layouts for the equipment cards, side by side, on the real
design tokens and the real instrument list. Open it directly in a browser
(no build step, no external requests) and compare:

| Option | Name | Character |
|--------|------|-----------|
| A | Datasheet grid | Specs on the face — model, qty, weeks — instead of hidden under a disclosure. Densest. |
| B | Compact rows | One row per instrument, status colour-bar on the left, tick on the right. Fastest to scan. |
| C | Status-led tiles | Bold status band up top, full-width select button at the foot. Most persuasive. |
| D | Checklist | Bone-simple: tick, name, one meta line, hairline dividers. Closest to today's cards. |

Every option keeps the site's JavaScript-free selection model: the checkbox is
the control and the `<label>` is the clickable face, so a card ticked here would
submit with the form even with scripts disabled. The only script on the page
fills the four sections from one shared data array so the demo markup does not
have to be hand-written four times; a chosen layout would be rendered in the
Nunjucks partial (`src/_includes/partials/equipment.njk`), not by that script.

A couple of demo rows are shown as `offered` / `secured` so each layout can be
judged against all three states — the live data currently has everything at
`needed`.

Once a direction is picked, port it into the partial and delete this folder.
