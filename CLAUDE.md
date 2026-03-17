# Listmania — project context for Claude Code

## What this is

Listmania is a taste-sharing social app where users curate top 10 lists across Books, Films, Albums and TV shows, then discover and match with people who share their cultural sensibility. Think Letterboxd but cross-category, with a taste-matching graph across all categories.

Working name is Listmania. Strong alternative candidate: **curation.ink** (domain confirmed available). Other names under consideration: Wavelength (taken), CultureVulture, Canon/Canonical (taken by Ubuntu).

The logged-in user in the prototype is **Rob Larkin (@Rob)**.

---

## File structure

```
index.html   — app shell, all views, nav, sidebar
style.css    — all styles, CSS variables, dark mode, animations, mobile
app.js       — all data, render functions, drag/drop, search, export
CLAUDE.md    — this file
```

This is a **zero-dependency static site**. No build step, no npm, no frameworks. Vanilla HTML/CSS/JS only. Hosted on Netlify via GitHub. To run locally: `python3 -m http.server 8080` then open `http://localhost:8080`.

---

## Architecture

### Views
Four views rendered as `<section class="view">` elements, toggled via `.active` class:
- `my-lists` — user's own top 10 lists with drag/reorder/search
- `discover` — other users' lists in a card grid
- `matches` — taste-match scores with other users
- `profile` — Rob's profile with stats and list summaries

### Data model
All data lives in `app.js` as plain JS objects — no backend, no localStorage yet.

```js
lists = { books: [{title, meta, thumb}], films: [...], albums: [...], tv: [...] }
discoverData = [{name, handle, color, cat, items[]}]
matchData = [{name, handle, color, score, shared[], following}]
```

### Categories
Currently: Books, Films, Albums, TV shows. Games was removed deliberately — keeping focus tight. Per-category enable/disable toggle is on the to-do list.

---

## Key rendering patterns

### renderMyList(animMap?)
Main list renderer. Takes an optional `animMap` object `{[index]: 'item-moved-up' | 'item-moved-down'}` to trigger CSS animations on specific items after a move. Called after every data mutation.

```js
renderMyList({ [i-1]: 'item-moved-up', [i]: 'item-moved-down' });
```

Items use `data-i` attribute (not `data-idx`) for index. Drag handles use `data-h` attribute.

### Drag and drop
**Critical decision: uses Pointer Events API, NOT the HTML5 drag API.**

The HTML5 drag API (`draggable`, `dragstart`, `dragover`, `drop`) was tried extensively and proved unreliable — drop events fail to fire, `elementFromPoint` flickers when ghost overlaps items, grid-level `dragover` bubbles cause the drop-line to snap to the bottom. All of this was removed.

Current approach:
- `pointerdown` on the drag handle (`.drag-handle[data-h]`) starts drag
- `handle.setPointerCapture(e.pointerId)` locks pointer to handle
- Ghost is a cloned row appended to `<body>` with `position:fixed`
- Drop position calculated by **iterating item `.getBoundingClientRect()` midpoints directly** — never uses `elementFromPoint`
- `DROP_LINE` is a single persistent `<div class="drop-line">` element, never recreated
- `pointerup` commits the move, removes ghost, calls `renderMyList(animMap)`
- Touch drag uses a 250ms hold timer before activating, allowing scroll to work unimpeded

### Search / autocomplete
- Books → Open Library API (no key needed)
- Films/TV → TMDB API (key: `2dca580c2a14b55200e784d157207b4d`)
- Albums → MusicBrainz API (no key needed)
- 320ms debounce on input
- Keyboard navigation: ↑↓ Enter Esc
- Results show cover art thumbnails where available

### Export
Export button top-right of My Lists view. Exports current list (respecting current sort order) as JSON, YAML, or Markdown. Triggers browser file download.

---

## CSS conventions

### Variables (defined in `:root`, dark mode overrides in `@media (prefers-color-scheme: dark)`)
```css
--bg, --bg2, --bg3          /* background levels */
--text, --text2, --text3    /* text levels */
--border, --border2, --border3  /* border opacities */
--r: 8px                    /* default border-radius */
--rl: 12px                  /* large border-radius (cards) */
--sidebar-w: 210px
```

### Animation classes (applied via JS after re-render)
```css
.item-moved-up    /* nudge-up keyframe, spring easing */
.item-moved-down  /* nudge-down keyframe, spring easing */
```

### Mobile breakpoint: `@media (max-width: 640px)`
Sidebar collapses to sticky top nav bar. Discover grid goes single column. Autocomplete slides up from bottom.

---

## To-do list

### UI / UX
- [ ] Per-category enable/disable toggle on profile page (users can make individual lists public/private)
- [ ] Shareable profile URL — Option 1: URL-encoded state (no backend needed as first step)
- [ ] User onboarding flow for new blank-state users
- [ ] Re-add films/TV lists via TMDB search to pull cover art thumbnails

### Data & search
- [ ] Custom categories (v2 — but consider data model compatibility now)

### Infrastructure
- [ ] Backend / persistence — Supabase recommended (free tier, Postgres, auth, JS SDK)
- [ ] Shareable profile URL Option 2 — `/@Rob` style permanent links (requires backend)
- [ ] Proxy TMDB API key through backend (currently exposed in frontend)

### Product
- [ ] Lead category decision: Films vs Books (leaning Films for initial density)
- [ ] Matching algorithm: weight by shared categories, not just shared items
- [ ] Per-category opt-in changes matching logic — match on categories in common only

---

## Decisions made (don't revisit without good reason)

| Decision | Rationale |
|---|---|
| No HTML5 drag API | Unreliable drop events, iframe issues, elementFromPoint flicker |
| Pointer Events for drag | Consistent across platforms, setPointerCapture locks drag cleanly |
| No build step / no frameworks | Keeps it simple, fast to iterate, Netlify deploys in seconds |
| 4 categories only (no games) | Focus — games is a different audience, can be added later |
| `data-i` not `data-idx` | Shorter, consistent with `data-h` for handle |
| TMDB free public key in frontend | Acceptable for prototype, needs proxying before public launch |
| animMap passed into renderMyList | Cleaner than post-render DOM queries for animation targeting |

---

## Competitive context

- **Letterboxd** — closest spiritual competitor, films only, much-loved UX
- **Goodreads** — books space, widely considered unloved/neglected by Amazon
- **Last.fm** — music taste but passive (scrobbling), not curatorial
- **Rate Your Music** — music ranking, beloved but niche and dense
- **PI.FYI** — rec-feed product, different intent (ephemeral recs not definitive lists)

The gap: nobody has built the cross-category version. The cross-category taste graph (your films + books + music together) is the novel thing.

---

## Naming status

Working title: **Listmania**
Best available domain found: **curation.ink** (confirmed available March 2026, ~$3/yr)
Strong conceptual name (taken): Wavelength
Other candidates: CultureVulture, Strata, Crit, Savant

---

## Rob's lists (current prototype data)

**Books:** Dune, The Moon is a Harsh Mistress, I Am Legend, Flow My Tears the Policeman Said, Ubik, The Stars My Destination, The Dark Forest, Fall; or Dodge in Hell, The Man in the High Castle, Eon

**Films:** RoboCop, The Color of Money, Alien, Twelve Monkeys, Escape from New York, Aliens, Yojimbo, Rocky, They Live, A Better Tomorrow

**Albums:** What Up Dog? (Was Not Was), Electric Ladyland, Elephant, Origin of Symmetry, Led Zeppelin IV, Every Waking Moment, AM

**TV:** The Wire, Battlestar Galactica, Breaking Bad, Westworld, Duckman, BoJack Horseman, Travelers, Red Dwarf
