# Marque.ink — project context for Claude Code

## What this is

Marque.ink is a taste-sharing social app where users curate top 50 lists across Books, Films, Albums and TV shows, then discover and match with people who share their cultural sensibility. Think Letterboxd but cross-category, with a taste-matching graph across all categories.

Domain **marque.ink** is registered by Rob at Porkbun. Previous working name was Listmania.

**Tagline:** "Art is subjective, but everyone's a critic..."

---

## File structure

```
index.html   — app shell, all views (including landing view for logged-out users)
landing.htm  — standalone marketing page (separate, links to /index.html)
style.css    — all styles, CSS variables, dark mode, animations, mobile, auth styles
app.js       — API client, auth, render functions, drag/drop, search, export
.gitignore   — excludes api.md
CLAUDE.md    — this file
```

**Landing view in `index.html`:** `#view-landing` is a view section shown to logged-out visitors — same hero copy and feature cards as `landing.htm`. When a user logs in, `updateAuthUI()` automatically switches from `view-landing` to `view-my-lists`. On sign-out, it switches back. Nav clicks on "My lists" while logged out open the auth modal instead of switching view.

**`api.md`** — local-only file (gitignored) containing API keys and secrets. Never commit this file. Contains:
- Resend API key (for transactional email)

Google Analytics tag (G-0Q4K1Z5866) is included in `<head>` via gtag.js.

Ahrefs analytics is included in both `index.html` and `landing.htm`:
```html
<script src="https://analytics.ahrefs.com/analytics.js" data-key="sPb/zymd7+9A+lCDikW6sg" async></script>
```

Supabase JS client loaded via CDN in `<head>`:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.12/dist/umd/supabase.min.js"></script>
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
- **Analytics:** Google Analytics 4 (G-0Q4K1Z5866) + Ahrefs Analytics (key: `sPb/zymd7+9A+lCDikW6sg`)
- **Static files:** served from `/var/www/html/` on the droplet (owned by `rob:rob`)
- **SSH access:** User `rob` with sudo, root login disabled, password auth disabled
- **Firewall (UFW):** ports 22 (SSH), 80 (HTTP), 443 (HTTPS) open
- **Nginx config:** `/etc/nginx/sites-available/listmania` (symlinked to sites-enabled)
- **Auto-updates disabled:** `unattended-upgrades`, `apt-daily`, and `apt-daily-upgrade` services/timers are disabled to prevent lock conflicts

The droplet hosts multiple sites via Nginx server blocks. Each site gets its own domain, server block config, and document root.

### Backend API

- **Location:** `~/marque-api/` on the droplet
- **Runtime:** Node.js v20 LTS
- **Framework:** Express
- **Process manager:** PM2 (`pm2 restart marque-api` to restart)
- **Port:** 3000 (proxied by Nginx at `/api/`)
- **Dependencies:** express, @supabase/supabase-js, cors, dotenv, jsonwebtoken

### Environment variables (`~/marque-api/.env`)

```
SUPABASE_URL=https://ekokbndwfwiygolwycia.supabase.co
SUPABASE_SERVICE_KEY=<secret>
SUPABASE_JWT_SECRET=<legacy JWT secret — not used for token verification, see ES256 note below>
PORT=3000
```

### Nginx reverse proxy config

```nginx
server {
    listen 80;
    server_name marque.ink;

    root /var/www/html;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri $uri/ =404;
    }
}
```

(Certbot has added SSL directives to this file.)

---

## Database (Supabase / Postgres)

**Project URL:** `https://ekokbndwfwiygolwycia.supabase.co`

### Keys

- **Publishable key:** `sb_publishable_hvdbnQLxqJWwA3GKRG3j_A_TqLYSsPw` — NOT used in the app (causes `getSession()` to hang in the JS client)
- **Legacy anon key:** starts with `eyJ...` — used in the frontend JS client
- **Service role key:** in `.env` on droplet — used by Express API server-side

### Schema

```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  auth_id UUID UNIQUE,
  email TEXT UNIQUE,
  avatar_color TEXT DEFAULT 'blue' CHECK (avatar_color IN ('blue', 'green', 'amber', 'red')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('books', 'films', 'albums', 'tv')),
  position INT NOT NULL,
  title TEXT NOT NULL,
  meta TEXT,
  thumb TEXT,
  source TEXT,
  source_id TEXT,
  public BOOLEAN DEFAULT false,
  UNIQUE (user_id, category, position)
);

CREATE INDEX idx_lists_user_category ON lists(user_id, category);

CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT,
  bio TEXT,
  default_public BOOLEAN DEFAULT false
);
```

### Row Level Security

RLS is enabled on all tables. Policies allow public read of user profiles and public lists. All writes are scoped to the authenticated owner. The Express API uses the `service_role` key which bypasses RLS — RLS is a safety net for any future direct Supabase client access.

---

## Authentication

### Architecture

- **Provider:** Supabase Auth (email + password)
- **Frontend:** Supabase JS client v2.47.12 via CDN, using legacy anon key
- **Backend:** Express validates Supabase JWT using ES256 public key
- **Session:** Managed via `onAuthStateChange` → `_cachedToken` global variable

### Auth flow

1. **Signup:** email + password only → confirmation email → click link → redirected to `https://marque.ink` → `onAuthStateChange` fires → `GET /api/me` returns 404 → "Complete your profile" modal → user enters handle + display name → `POST /api/users` → logged in
2. **Login:** `signInWithPassword()` returns session directly → `GET /api/me` → if 404, show complete profile → otherwise, load lists
3. **Page reload:** `onAuthStateChange` fires → token cached in `_cachedToken` → 500ms `setTimeout` checks token and loads user

### Auth UI

Modal overlay (`#auth-overlay`) with four forms:
- `#auth-login` — email + password
- `#auth-signup` — email + password only (handle/name collected after email confirmation)
- `#auth-forgot` — password reset
- `#auth-complete-profile` — handle + display name (cannot be dismissed)

### Known issues & workarounds (CRITICAL)

**`sb.auth.getSession()` hangs permanently.** Compatibility issue between the Supabase JS UMD CDN build and the project configuration. Never resolves. **Do NOT reintroduce any calls to `getSession()` — it will hang the app.**

**Workaround:** `initSession()` was removed. Instead:
- `_cachedToken` is set by `onAuthStateChange`
- `getAuthHeaders()` reads `_cachedToken`
- `handleLogin()` uses the session from `signInWithPassword()` directly
- Page load uses `setTimeout(500)` to allow `onAuthStateChange` to fire

**Publishable key (`sb_publishable_...`) also hangs.** Use the legacy anon key.

**JWT signing uses ES256.** Supabase Auth issues ES256 tokens. The Express middleware verifies using the hardcoded ES256 public key (JWK):
```js
const SUPABASE_JWK = {
  "x": "WqCI10o7EqQMyEzlpcupVol7M2ozhnBlVbTdtDEZWS0",
  "y": "JVbvqBci-k7Ju1zRzUUy5l71975gnQoVhHdUZ_yLlVk",
  "alg": "ES256",
  "crv": "P-256",
  "kty": "EC",
  "key_ops": ["verify"]
};
```
If Supabase rotates this key, update it in `~/marque-api/index.js`.

### API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/me` | Required | Get current user's profile |
| POST | `/api/users` | Required | Create user profile after signup |
| GET | `/api/lists/:handle` | Optional | Get lists (public only if not owner) |
| PUT | `/api/lists/:handle/:category` | Required + owner | Replace entire category list |
| DELETE | `/api/lists/:handle/:category/:position` | Required + owner | Delete single item |
| PATCH | `/api/lists/:handle/:category/visibility` | Required + owner | Toggle public/private |

### Visibility model

Lists are **private by default**. Users opt in per category. Anonymous users can browse discover/matches (public lists only) but cannot create or edit lists.

---

## Data model

### List item shape

```js
{ title, meta, thumb, source, source_id }
```

- **`meta`** — `"Author · Year"` (books/albums) or `"Year"` (films/tv)
- **`thumb`** — URL hotlinked from source CDN, or `null`
- **`source`** — canonical: `'tmdb'` | `'openlibrary'` | `'musicbrainz'` | `null`
- **`source_id`** — ID string from that API, or `null`
  - TMDB: numeric ID as string (e.g. `"238"`)
  - Open Library: work key (e.g. `"/works/OL893415W"`)
  - MusicBrainz: release-group UUID

`source` and `source_id` are populated at add-time from `searchAPI()`. Items added before this was implemented have `null` for both.

### App globals

```js
lists = { books: [], films: [], albums: [], tv: [] }  // current user's lists, loaded from API
currentUser = null | { id, handle, display_name, email, avatar_color }
currentCat = 'books' | 'films' | 'albums' | 'tv'     // active tab
```

`discoverData` and `matchData` are hardcoded in `app.js` — not yet API-backed.

---

## Key rendering patterns

### renderMyList(animMap?)
Main list renderer. Takes optional `animMap` for CSS animations after moves.

### Drag and drop
Uses Pointer Events API. See "Decisions made" for rationale.

### Cover art
Hotlinked from TMDB (films/TV), Open Library (books). Albums show emoji fallback. `healThumb()` auto-fixes broken TMDB URLs.

### Theme
`data-theme` on `<html>`, persisted to localStorage. Inline script prevents FOUC.

### Export
JSON, YAML, or Markdown download of current category list.

---

## CSS conventions

### Variables
```css
--bg, --bg2, --bg3          /* background levels */
--text, --text2, --text3    /* text levels */
--border, --border2, --border3
--radius-sm: 6px, --radius-md: 8px, --radius-lg: 12px
--sidebar-w: 210px
```

### Mobile breakpoint: `@media (max-width: 640px)`

---

## To-do list

### UI / UX
- [ ] Account panel — change display name, handle, avatar color, password (Phase 5 of auth handoff)
- [ ] Per-category public/private toggle UI
- [ ] User onboarding flow for new blank-state users
- [ ] Shareable profile URL — `/@handle` permanent links
- [ ] Album cover art — needs key'd API
- [x] Profile view — renders dynamically from `currentUser`; shows real lists/items counts (done)
- [x] Auth modal — login, signup, forgot password, complete profile (done)
- [x] Cover art hotlinks (done)
- [x] Dark/light mode toggle (done)
- [x] TMDB poster auto-heal (done)

### Data & search
- [x] `source` and `source_id` populated on add — search results now write canonical source + ID to the list item (done)
- [ ] Move discoverData and matchData from hardcoded to API-backed
- [ ] Custom categories (v2)

### Infrastructure
- [x] Hosting — DO droplet, Nginx, SSL (done)
- [x] Backend API — Express + Supabase Postgres (done)
- [x] User authentication (done)
- [ ] Fix `getSession()` hang — investigate npm build or newer Supabase JS version
- [ ] Set up `www.marque.ink` DNS + cert
- [ ] Proxy TMDB API key through backend

### Product
- [ ] Matching algorithm improvements
- [ ] Per-category opt-in affects matching logic

---

## Decisions made (don't revisit without good reason)

| Decision | Rationale |
|---|---|
| No HTML5 drag API | Unreliable drop events, elementFromPoint flicker |
| Pointer Events for drag | Consistent cross-platform, setPointerCapture locks cleanly |
| No build step / no frameworks | Simple, fast iteration |
| 4 categories only (no games) | Focus |
| Nginx over Apache | Lighter reverse proxy for Node apps |
| Digital Ocean over Netlify | Need server-side for Node backend |
| Supabase for DB + auth | Managed Postgres + auth, free tier, no lock-in |
| Postgres over MongoDB | Relational data; Mongo too heavy for 1GB droplet |
| Legacy anon key over publishable | Publishable key hangs `getSession()` in CDN build |
| ES256 public key verification | Supabase Auth issues ES256 JWTs; HS256 returns "invalid algorithm" |
| No `initSession()` / no `getSession()` | `getSession()` hangs permanently; use `_cachedToken` from `onAuthStateChange` |
| Signup splits into two steps | Email confirmation means no session on signup; handle/name on first login |
| Lists private by default | Privacy-first; users opt in to share |
| `data-theme` on `<html>` | Overrides media query; inline script prevents FOUC |
| `healThumb()` on onerror | Auto-fixes stale poster paths |
| animMap into renderMyList | Cleaner than post-render DOM queries |

---

## Competitive context

- **Letterboxd** — closest competitor, films only
- **Goodreads** — books, neglected by Amazon
- **Last.fm** — passive scrobbling, not curatorial
- **Rate Your Music** — beloved but niche
- **PI.FYI** — ephemeral recs, different intent

The gap: no cross-category taste graph exists.

---

## Deployment checklist

Frontend:
```bash
scp index.html style.css app.js rob@159.203.113.76:/var/www/html/
```

API:
```bash
scp index.js rob@159.203.113.76:~/marque-api/index.js
ssh rob@159.203.113.76 "pm2 restart marque-api"
```

---

## Handoff files

| File | Status | Description |
|------|--------|-------------|
| `claude-code-handoff.md` | Done | Wire frontend to API |
| `claude-code-handoff-enrich.md` | Abandoned | Bulk enrichment scripts — data was wiped; source/source_id now populated live via search |
| `claude-code-handoff-auth.md` | Phases 1-4,6 done; Phase 5 pending | User authentication |
| `claude-code-handoff-signup-fix.md` | Done | Fix signup for email confirmation |
