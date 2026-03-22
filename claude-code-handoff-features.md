# Claude Code Handoff: Next Feature Batch

## Date: March 22, 2026

## Context

Auth is working, lists are API-backed, search populates source/source_id at add-time. This handoff covers six improvements. They're independent — tackle in any order, though items 2 and 3 are quick wins.

---

## 1. Branded auth emails

**Where:** Supabase dashboard → Authentication → Email Templates

**What:** Customize the confirmation and password reset email templates with Marque branding. This is NOT a code change — it's HTML templates edited in the Supabase dashboard. But since Rob may want Claude Code to draft the HTML, here are the specs:

- **From:** `no-reply@marque.ink` / `Marque` (already configured in SMTP settings)
- **Design:** match the app's dark/light aesthetic, keep it simple
  - Marque.ink wordmark at the top (text-based, no image hosting needed — just styled text)
  - Tagline: "Art is subjective, but everyone's a critic..."
  - Clean button for the CTA (confirm email / reset password)
  - Minimal footer: "© Marque.ink"
- **Templates to customize:**
  - Confirm signup
  - Reset password
  - Magic link (if ever enabled later)
- **Supabase template variables available:**
  - `{{ .ConfirmationURL }}` — the confirmation link
  - `{{ .Token }}` — the OTP token
  - `{{ .SiteURL }}` — your site URL

**Output:** Draft the HTML for each template. Rob will paste them into the Supabase dashboard manually.

---

## 2. Duplicate prevention via source_id

**Where:** `app.js` → `selectResult()` function

**What:** Before adding an item to the list, check if an item with the same `source_id` (and same `source`) already exists in `lists[currentCat]`. If it does, don't add it and show a brief message.

**Implementation:**

```js
function selectResult(idx) {
  const r = searchResults[idx];
  if (!r || lists[currentCat].length >= 50) return;

  // Check for duplicates by source_id
  if (r.source_id && lists[currentCat].some(item =>
    item.source_id === r.source_id && item.source === r.source
  )) {
    // Show a brief "already on your list" message — could be a toast, 
    // or temporarily change the autocomplete item's style
    // Don't add the item
    return;
  }

  lists[currentCat].push({ title: r.title, meta: r.meta || '—', thumb: r.thumb || null, source: r.source || null, source_id: r.source_id || null });
  document.getElementById('search-input').value = '';
  searchResults = [];
  closeDropdown();
  saveLists();
  renderMyList();
}
```

**Edge case:** Items added before `source_id` was implemented have `null` for both fields. Don't block those — only check when both the new item AND the existing item have non-null `source_id`.

**UX:** Show a subtle inline message (not an alert). Could briefly highlight the existing item in the list, or show "Already on your list" in the autocomplete dropdown. Keep it non-intrusive.

---

## 3. Prune existing items from search dropdown

**Where:** `app.js` → wherever `searchAPI()` results are processed before `renderDropdown()`

**What:** After fetching search results, filter out any item whose `source_id` already exists in `lists[currentCat]`. This way the user never even sees items they've already added.

**Implementation:** In the search input handler, after `searchResults = await searchAPI(val, currentCat)`, add:

```js
// Filter out items already on the list
const existingIds = new Set(
  lists[currentCat]
    .filter(item => item.source_id)
    .map(item => `${item.source}:${item.source_id}`)
);
searchResults = searchResults.filter(r =>
  !r.source_id || !existingIds.has(`${r.source}:${r.source_id}`)
);
```

**Note:** This works alongside item 2 (duplicate prevention) as a belt-and-suspenders approach. Item 3 hides duplicates from the dropdown; item 2 catches any that slip through (e.g., items with null source_id).

---

## 4. Admin page

**Where:** New file `admin.htm` in the repo root. Deployed to `/var/www/html/admin.htm` on the droplet. NOT linked from the main site — accessed directly via `https://marque.ink/admin.htm`.

**What:** A standalone admin dashboard for Rob to manage the platform. Must be authenticated — only Rob's account should have access.

### Auth approach

Option A (simple): Hardcode Rob's user ID or handle in the admin page. On load, check `currentUser.handle === 'rob'`. If not, show "Access denied."

Option B (better): Add an `is_admin` boolean column to the `users` table, and an `/api/admin/*` set of endpoints that check for admin status. This is more work but scales.

**Recommend Option A for now** — it's a one-person admin tool. Can upgrade later.

### Features

- **User list:** Table showing all users (handle, display name, email, created_at, number of items per category)
- **View any user's lists:** Click a user to see all their lists regardless of public/private status. Read-only.
- **Stats:** Total users, total list items, items per category breakdown
- **No edit/delete of other users' data** (for now — just viewing)

### API needs

Add an admin endpoint to the Express API (`~/marque-api/index.js`):

```js
// GET /api/admin/users — returns all users with list counts
// Requires auth + admin check
app.get('/api/admin/users', async (req, res) => {
  const authUser = await getAuthUser(req);
  if (!authUser || authUser.handle !== 'rob') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { data: users, error } = await supabase
    .from('users')
    .select('id, handle, display_name, email, avatar_color, created_at')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Get list counts per user
  for (const user of users) {
    const { data: lists } = await supabase
      .from('lists')
      .select('category')
      .eq('user_id', user.id);

    user.list_counts = { books: 0, films: 0, albums: 0, tv: 0 };
    (lists || []).forEach(l => { user.list_counts[l.category]++; });
  }

  res.json(users);
});

// GET /api/admin/lists/:handle — returns ALL lists for a user (ignores public/private)
app.get('/api/admin/lists/:handle', async (req, res) => {
  const authUser = await getAuthUser(req);
  if (!authUser || authUser.handle !== 'rob') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('handle', req.params.handle)
    .single();

  if (!user) return res.status(404).json({ error: 'User not found' });

  const { data: lists, error } = await supabase
    .from('lists')
    .select('category, position, title, meta, thumb, source, source_id, public')
    .eq('user_id', user.id)
    .order('category')
    .order('position');

  if (error) return res.status(500).json({ error: error.message });

  const grouped = {};
  lists.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });

  res.json(grouped);
});
```

### Frontend (admin.htm)

- Standalone HTML file, same design system (include `style.css` or inline the relevant styles)
- Loads Supabase JS client for auth (same CDN, same anon key)
- On load: check auth, verify admin, fetch `/api/admin/users`
- Render user table with expandable rows to view their lists
- Keep it simple — no frameworks, vanilla JS, match the app aesthetic

### Deployment

Rob will need to:
1. `scp admin.htm rob@159.203.113.76:/var/www/html/admin.htm`
2. Update `~/marque-api/index.js` with the admin endpoints, then `pm2 restart marque-api`

---

## 5. Shareable public links

**What:** Users can opt in to make individual category lists public, then share a read-only URL.

### URL structure

`https://marque.ink/@handle` — profile overview (public lists only)
`https://marque.ink/@handle/films` — specific category list

### Implementation approach

Since this is a static site with no server-side rendering, the cleanest approach is:

**Option A: Single `profile.htm` page with query/hash routing**

- `https://marque.ink/profile.htm?u=handle&cat=films`
- Nginx rewrite rule to make `/@handle` resolve to `profile.htm?u=handle`:

```nginx
location ~ ^/@([a-zA-Z0-9_]+)(/([a-z]+))?$ {
    rewrite ^/@([a-zA-Z0-9_]+)(/([a-z]+))?$ /profile.htm?u=$1&cat=$3 last;
}
```

**Option B: Hash routing on the main app**

- `https://marque.ink/#/@handle/films`
- No Nginx changes needed, all handled in JS
- Less clean URLs

**Recommend Option A** — the URLs are cleaner and more shareable.

### profile.htm

- Standalone read-only page
- Reads `u` and `cat` from query params
- Fetches `GET /api/lists/:handle` (unauthenticated — only returns public lists)
- Renders the lists in a clean, read-only layout
- Shows user's display name, handle, avatar
- Category tabs to switch between public lists
- If a category is private, don't show the tab
- "Join Marque.ink" CTA at the bottom for visitors

### Per-list visibility toggle

The API already supports `PATCH /api/lists/:handle/:category/visibility`. The frontend needs:

- A toggle (switch or checkbox) per category in the My Lists view or profile/account area
- Label: "Make this list public"
- When toggled on, show the shareable URL: `marque.ink/@handle/category`
- Copy-to-clipboard button next to the URL

### API note

The `GET /api/lists/:handle` endpoint already respects visibility — unauthenticated requests only get public lists. No API changes needed for the read-only view.

The Nginx rewrite rule needs to be added by Rob on the droplet:

```bash
sudo vi /etc/nginx/sites-available/listmania
```

Add the `location ~ ^/@` block inside the server block, before the existing `location / {` block. Then:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. Full-width landing hero for logged-out users

**Where:** `index.html`, `style.css`, `app.js`

**What:** When no user is logged in, hide the sidebar entirely and render the landing/hero section full-width. The sidebar nav links (My lists, Discover, Matches, Profile) are useless without an account — showing them to logged-out visitors is confusing.

**Behavior:**

- **Logged out:** Sidebar is hidden (`display: none`). The landing hero, feature cards, and CTAs span the full viewport width. No app chrome visible — it's a pure marketing/landing page.
- **Logged in:** Sidebar appears as normal. Landing/hero section is hidden. App views are visible.

**Implementation:**

- Add a body-level class or data attribute to toggle layout mode, e.g. `<body data-auth="false">` or `<body class="logged-out">`
- In CSS:
  ```css
  body.logged-out .sidebar { display: none; }
  body.logged-out .main-content { margin-left: 0; }
  body.logged-out .landing-hero { max-width: 100%; }
  ```
- In `app.js`, in `updateAuthUI()`:
  - If `currentUser` is null: `document.body.classList.add('logged-out')`
  - If `currentUser` exists: `document.body.classList.remove('logged-out')`
- The landing section should already be hidden when logged in (Claude Code implemented this). Just make sure it goes full-width when the sidebar is gone.

**The "Sign in" button** currently in the sidebar footer should move into the landing hero area for logged-out users (it's already there as one of the CTAs — "Get started" / "Sign in"). No need for a separate sidebar sign-in button when the sidebar is hidden.

---

## 6. Full-width landing hero for logged-out visitors

**Where:** `index.html`, `style.css`, `app.js`

**What:** When the user is not logged in, hide the sidebar entirely and render the landing/hero section full-width. The sidebar nav links (My lists, Discover, Matches, Profile) are meaningless without an account, and the sidebar eats space that the hero should use.

**Behavior:**

- **Logged out:** Sidebar is hidden (`display: none` or a class toggle). The landing hero, feature cards, and CTAs span the full viewport width. The "Sign in" button lives in the hero CTAs, not buried in the sidebar footer.
- **Logged in:** Sidebar appears as normal. Landing/hero section is hidden. App views (My lists, Discover, etc.) render as they do now.

**Implementation approach:**

- Add a body-level class like `.logged-out` when `currentUser` is null
- In `updateAuthUI()`, toggle this class:
  ```js
  document.body.classList.toggle('logged-out', !currentUser);
  ```
- In CSS:
  ```css
  .logged-out .sidebar { display: none; }
  .logged-out .main { margin-left: 0; }
  .logged-out .landing-hero { max-width: 100%; }
  ```
- The landing section should already be hidden when logged in (if not, add `.logged-out .landing { display: block }` / `.landing { display: none }`)

**Mobile:** On mobile the sidebar is already collapsed to a top nav — same logic applies: hide the nav bar for logged-out users on the landing view.

---

## Files modified

| Feature | Files |
|---------|-------|
| 1. Branded emails | None (Supabase dashboard only) — but draft HTML templates as separate files for Rob to paste |
| 2. Duplicate prevention | `app.js` |
| 3. Prune search results | `app.js` |
| 4. Admin page | New `admin.htm`, `~/marque-api/index.js` on droplet |
| 5. Shareable links | New `profile.htm`, `app.js` (visibility toggle UI), Nginx config on droplet |
| 6. Full-width landing | `index.html`, `style.css`, `app.js` |
| 6. Full-width landing | `index.html`, `style.css`, `app.js` (`updateAuthUI`) |
