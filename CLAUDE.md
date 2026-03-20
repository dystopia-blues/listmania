# Marque.ink — project context for Claude Code

## What this is

Marque.ink is a taste-sharing social app where users curate top 50 lists across Books, Films, Albums and TV shows, then discover and match with people who share their cultural sensibility. Think Letterboxd but cross-category, with a taste-matching graph across all categories.

Domain **marque.ink** is registered by Rob. Previous working name was Listmania.

The logged-in user in the prototype is **Rob Larkin (@Rob)**.

---

## File structure

```
index.html   — app shell, all views, nav, sidebar
style.css    — all styles, CSS variables, dark mode, animations, mobile
app.js       — all data, render functions, drag/drop, search, export
CLAUDE.md    — this file
```

**`landing.htm`** — splash/marketing page. Standalone file, inlines all CSS, same design tokens as the app.
- Eyebrow: *"Art is subjective, but everyone's a critic..."*
- Headline: *"Curate, rank and share your top movies, books, albums and shows."*
- 3 feature cards: Your definitive lists, Discover taste, Taste matching
- Both CTAs link to `/index.html` (update when auth/routing exists)

Google Analytics tag (G-0Q4K1Z5866) is included in `<head>` of both `index.html` and `landing.htm` via gtag.js:

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-0Q4K1Z5866"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-0Q4K1Z5866');
</script>
```

This is a **zero-dependency static site**. No build step, no npm, no frameworks. Vanilla HTML/CSS/JS only. To run locally: `python3 -m http.server 8080` then open `http://localhost:8080`.

---

## Hosting & infrastructure

**Live at:** [https://marque.ink](https://marque.ink)

- **Server:** Digital Ocean droplet, Ubuntu 22.04, 1 vCPU / 1 GB RAM, NYC3 region
- **IP:** `159.203.113.76`
- **Web server:** Nginx (replaced Apache which was pre-installed on the droplet)
- **SSL:** Let's Encrypt via Certbot, auto-configured for Nginx
- **DNS:** Domain `marque.ink` registered at Porkbun, A record pointing to droplet IP
- **Analytics:** Google Analytics 4 (G-0Q4K1Z5866)
- **Static files:** served from `/var/www/html/` on the droplet
- **SSH access:** User `rob` with sudo, root login disabled, password auth disabled
- **Firewall (UFW):** ports 22 (SSH), 80 (HTTP), 443 (HTTPS) open
- **Nginx config:** `/etc/nginx/sites-available/listmania` (symlinked to sites-enabled)
- **Auto-updates disabled:** `unattended-upgrades`, `apt-daily`, and `apt-daily-upgrade` services/timers are disabled to prevent lock conflicts

The droplet is intended to host multiple sites via Nginx server blocks (virtual hosts). Each site gets its own domain, server block config, and document root.

Previously hosted on Netlify via GitHub — migrated to DO droplet in March 2026.

---

## Architecture

### Views
Four views rendered as `<section class="view">` elements, toggled via `.active` class:
- `my-lists` — user's own top 10 lists with drag/reorder/search
- `discover` — other users' lists in a card grid
- `matches` — taste-match scores with other users
- `profile` — Rob's profile with stats and list summaries

### Data model
All data lives in `app.js` as plain JS objects. Lists are persisted to localStorage.

```js
lists = { books: [{title, meta, thumb}], films: [...], albums: [...], tv: [...] }
// meta format: "Author · Year" (books/albums) or "Year" (films/tv) — year is parsed from meta where needed
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

### Cover art — hotlink approach
No images are downloaded or stored locally. Cover art is hotlinked directly from source CDNs:
- **Films/TV** → TMDB CDN: `https://image.tmdb.org/t/p/w92/{poster_path}`
- **Books** → Open Library: `https://covers.openlibrary.org/b/isbn/{ISBN}-M.jpg`
- **Albums** → No free cover API without a key. Albums show category emoji for now. Fix when backend is in place.

The prefilled demo data has hardcoded thumb URLs for films, TV and books. If a TMDB poster URL returns a 404, `healThumb(img, cat, idx)` fires — it queries TMDB by title + year (`primary_release_year` for films, `first_air_date_year` for TV), updates `img.src` in-place, writes the correct URL back to `lists[cat][idx].thumb`, and calls `saveLists()` so the fix persists to localStorage. The emoji fallback only happens if TMDB returns no result.

### Theme (dark/light mode)
Theme is controlled by a `data-theme` attribute on `<html>`, set to `"dark"` or `"light"`. This overrides the `@media (prefers-color-scheme: dark)` default. Preference is persisted in localStorage under the key `"theme"`. An inline `<script>` in `<head>` applies the saved theme before first paint to prevent flash.

- Toggle button (`.theme-toggle`) lives in the `.logo` bar — visible on both desktop and mobile
- Shows sun icon in dark mode, moon icon in light mode
- `applyTheme(theme)` sets the attribute, saves to localStorage, and updates the icon
- `effectiveTheme()` reads localStorage or falls back to system preference

### Export
Export button top-right of My Lists view. Exports current list (respecting current sort order) as JSON, YAML, or Markdown. Triggers browser file download.

---

## CSS conventions

### Variables (defined in `:root`; dark mode via `@media (prefers-color-scheme: dark)` and overridden by `[data-theme]` on `<html>`)
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
- [x] Cover art via hotlinks — TMDB for films/TV, Open Library for books (done)
- [x] Dark/light mode toggle — sun/moon button in logo bar, persisted to localStorage (done)
- [x] TMDB poster auto-heal — broken poster URLs are fixed at runtime via `healThumb()` (done)
- [ ] Album cover art — needs backend or a key'd API (Spotify, iTunes)

### Data & search
- [ ] Custom categories (v2 — but consider data model compatibility now)

### Infrastructure
- [x] Hosting — Digital Ocean droplet, Nginx, SSL via Let's Encrypt (done March 2026)
- [x] Domain — `marque.ink` live, DNS via Porkbun A record (done March 2026)
- [x] Analytics — Google Analytics 4 integrated (done March 2026)
- [ ] Install Node.js (v20 LTS) + PM2 process manager on droplet
- [ ] Persistence — no localStorage for lists (demo resets on reload); needs backend when ready
- [ ] Backend — Supabase (hosted, free tier) for initial database + auth; migrate to self-hosted Postgres later if needed. Supabase is just Postgres underneath, so `pg_dump`/`pg_restore` to migrate.
- [ ] Shareable profile URL Option 2 — `/@Rob` style permanent links (requires backend)
- [ ] Proxy TMDB API key through backend (currently exposed in frontend)
- [ ] Album cover art storage once backend exists
- [ ] Set up `www.marque.ink` DNS record + add to Certbot cert

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
| No build step / no frameworks | Keeps it simple, fast to iterate |
| 4 categories only (no games) | Focus — games is a different audience, can be added later |
| `data-i` not `data-idx` | Shorter, consistent with `data-h` for handle |
| TMDB free public key in frontend | Acceptable for prototype, needs proxying before public launch |
| animMap passed into renderMyList | Cleaner than post-render DOM queries for animation targeting |
| `data-theme` on `<html>` for theme | Overrides media query cleanly; inline `<script>` in `<head>` prevents FOUC |
| `healThumb()` on TMDB onerror | Auto-fixes stale poster paths without user intervention; persists to localStorage |
| Nginx over Apache | Lighter, simpler reverse proxy config for Node apps, better for multi-site hosting |
| Digital Ocean over Netlify | Need server-side capabilities for Node backend, multi-site hosting, and future DB |
| Supabase for initial DB | Managed Postgres + auth, free tier, no lock-in — can `pg_dump` to self-hosted Postgres later |
| Postgres over MongoDB | Listmania data is relational (users, lists, items, categories, matches); Mongo is memory-heavy on a 1GB droplet |

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

**Name: Marque.ink** — domain registered by Rob (March 2026).

---

## Rob's lists (current prototype data)

**Books:** Dune, I Am Legend, The Moon is a Harsh Mistress, Flow My Tears the Policeman Said, Ubik, The Windup Girl, God Emperor of Dune, The Dark Forest, The Stars My Destination, Fall; or Dodge in Hell, The Man in the High Castle, Dune Messiah, Children of Dune, Heretics of Dune, Chapterhouse: Dune, Eon, Thin Air, The Forever War, The Fountainhead, Fahrenheit 451, Valis, The Door into Summer

**Films:** RoboCop, The Color of Money, Alien, Twelve Monkeys, They Live, Aliens, Escape from New York, Yojimbo, Rocky, A Better Tomorrow, GoodFellas, Dune (2021), Dune: Part Two, Blade Runner, Raging Bull, Lock Stock and Two Smoking Barrels, The Departed, 25th Hour, The Fly, Iron Man

**Albums:** What Up Dog? (Was Not Was), Electric Ladyland, Elephant, Origin of Symmetry, Led Zeppelin IV, Every Waking Moment, AM

**TV:** The Wire, Battlestar Galactica, Breaking Bad, Westworld, Duckman, BoJack Horseman, Travelers, Red Dwarf
