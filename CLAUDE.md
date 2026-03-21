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

Lists are persisted in Supabase (Postgres) via the Express API. localStorage is used as a fallback only.

```js
lists = { books: [{title, meta, thumb, source, source_id}], films: [...], albums: [...], tv: [...] }
// meta format: "Author · Year" (books/albums) or "Year" (films/tv) — year is parsed from meta where needed
// source: 'tmdb' | 'openlibrary' | 'musicbrainz' | null
// source_id: string ID from the source API, or null
discoverData = [{name, handle, color, cat, items[]}]
matchData = [{name, handle, color, score, shared[], following}]
```

`currentUser` is `null` when logged out, or `{ id, handle, display_name, email, avatar_color }` when logged in.

### Categories
Currently: Books, Films, Albums, TV shows. Games was removed deliberately — keeping focus tight. Per-category enable/disable toggle is on the to-do list.

---

## Backend

### Express API
- **URL:** `https://marque.ink/api`
- **File:** `~/marque-api/index.js` on the droplet
- **Process manager:** PM2 (`pm2 restart marque-api`)
- **Endpoints:**
  - `GET /api/lists/:handle` — returns `{ books, films, albums, tv }` for a user
  - `PUT /api/lists/:handle/:category` — replaces a category's list (auth-protected, pending Phase 2)
  - `POST /api/users` — creates user profile after signup (pending Phase 2)
  - `GET /api/me` — returns current user's profile (pending Phase 2)
  - `PATCH /api/lists/:handle/:category/visibility` — toggles public/private (pending Phase 2)

### Supabase
- **Project URL:** `https://ekokbndwfwiygolwycia.supabase.co`
- **Publishable key (safe in frontend):** `sb_publishable_hvdbnQLxqJWwA3GKRG3j_A_TqLYSsPw`
- **JWT secret (server-side only):** stored in `~/marque-api/.env` as `SUPABASE_JWT_SECRET`
- **Tables:** `users` (id, handle, display_name, auth_id, email, avatar_color), `lists` (user_id, category, position, title, meta, thumb, source, source_id, public)

### Auth
- **Provider:** Supabase Auth (email + password)
- **Frontend client:** `@supabase/supabase-js@2` loaded via CDN, `const sb = supabase.createClient(...)`
- **Session:** managed by Supabase JS client (tokens in localStorage, auto-refreshed)
- **`currentUser`:** null when logged out; `{ id, handle, display_name, email, avatar_color }` when logged in
- **API auth:** Bearer token injected via `getAuthHeaders()` into every `apiGet`/`apiPut` call
- **Auth UI:** modal overlay with login / signup / forgot-password forms; `id="auth-area"` in sidebar renders login button or user badge + sign out

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
- [ ] Per-category public/private toggle on account panel (Phase 5 of auth)
- [ ] Account panel — change display name, handle, avatar color, password (Phase 5 of auth)
- [ ] User onboarding flow for new blank-state users
- [ ] Shareable profile URL — `/@handle` style (requires backend routing)
- [x] Cover art via hotlinks — TMDB for films/TV, Open Library for books (done)
- [x] Dark/light mode toggle — sun/moon button in logo bar, persisted to localStorage (done)
- [x] TMDB poster auto-heal — broken poster URLs are fixed at runtime via `healThumb()` (done)
- [ ] Album cover art — needs backend or a key'd API (Spotify, iTunes)

### Auth (in progress — see claude-code-handoff-auth.md for full spec)
- [x] Phase 3: Frontend — Supabase JS client, `getAuthHeaders()`, updated API calls, `currentUser` global (done)
- [x] Phase 4: Frontend — auth modal (login/signup/forgot), `updateAuthUI()`, `initSession()`, all event listeners (done)
- [ ] Phase 1: DB schema — Rob must run SQL in Supabase: add `auth_id`, `email`, `avatar_color` to `users`; add `public` to `lists`; create `user_preferences`; enable RLS policies
- [ ] Phase 2: Express API — Rob must SSH into droplet and update `~/marque-api/index.js`: add auth middleware (JWT verify), `/api/users` signup endpoint, `/api/me` endpoint, protected PUT/DELETE routes, visibility PATCH endpoint; add `SUPABASE_JWT_SECRET` to `.env`; `pm2 restart marque-api`
- [ ] Phase 5: Account panel UI
- [ ] Phase 6: Migrate Rob's existing `rob` row — sign up, then `UPDATE users SET auth_id = 'UUID' WHERE handle = 'rob'`

### Data & search
- [x] Metadata enrichment scripts — `~/marque-enrich/enrich-metadata.js` + `push-enriched.js` (scripts written, Rob to run)
- [ ] Run enrichment — `cd ~/marque-enrich && node enrich-metadata.js` then review + `node push-enriched.js`
- [ ] Add `source` and `source_id` columns to Supabase `lists` table (precondition for enrichment push)
- [ ] Custom categories (v2 — but consider data model compatibility now)

### Infrastructure
- [x] Hosting — Digital Ocean droplet, Nginx, SSL via Let's Encrypt (done March 2026)
- [x] Domain — `marque.ink` live, DNS via Porkbun A record (done March 2026)
- [x] Analytics — Google Analytics 4 integrated (done March 2026)
- [x] Backend — Node.js + Express + Supabase (Postgres) live at `https://marque.ink/api` (done March 2026)
- [x] Lists persisted to API — `apiGet`/`apiPut` wired, localStorage as fallback (done)
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
| Supabase Auth (email+password only) | Simple, no OAuth complexity for v1; Supabase handles tokens, refresh, and password reset flows |
| Supabase JS client in frontend | No build step needed — CDN UMD bundle; handles session persistence and token refresh automatically |
| `id="auth-area"` replaces hardcoded sidebar footer | Allows `updateAuthUI()` to render login button or user badge dynamically without duplicating HTML |

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
