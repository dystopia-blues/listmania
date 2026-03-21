# Claude Code Handoff: User Authentication & Accounts

## Date: March 20, 2026

## Overview

Add user authentication to Marque.ink so individual users can create accounts, maintain their own lists, and optionally share them publicly. This is a multi-phase task. Complete each phase and verify before moving to the next.

## Pre-flight checksums

Verify before editing. If they don't match, STOP and ask Rob.

```
a172f02987375ad0c8abcd3394b1dd9c  app.js
106a8580bb469e4924088e98bd010fc9  index.html
cc9eaffc51936def0dc6dfd6128e6df0  style.css
```

## Architecture decisions

- **Auth provider**: Supabase Auth (email + password only for now)
- **Session management**: Supabase JS client handles tokens, refresh, persistence
- **Frontend auth library**: `@supabase/supabase-js` loaded via CDN (no build step — this is vanilla JS)
- **API auth**: Express validates Supabase JWT on protected routes
- **Lists are private by default**: users opt in to make lists publicly discoverable
- **Logged-out users**: can browse discover and matches views (public lists only), cannot create or edit lists
- **Auth UI**: modal overlay on the existing app (login, signup, forgot password, reset password)
- **No build step**: everything remains vanilla HTML/CSS/JS

## Supabase config

- **Project URL**: `https://ekokbndwfwiygolwycia.supabase.co`
- **Publishable key**: `sb_publishable_hvdbnQLxqJWwA3GKRG3j_A_TqLYSsPw`

These are safe to include in frontend code (the publishable key is designed for client-side use).

---

## Phase 1: Database schema changes

Run these in the Supabase SQL Editor.

### 1a. Update users table

```sql
-- Add auth linkage and profile fields
ALTER TABLE users ADD COLUMN auth_id UUID UNIQUE;
ALTER TABLE users ADD COLUMN email TEXT UNIQUE;
ALTER TABLE users ADD COLUMN avatar_color TEXT DEFAULT 'blue' CHECK (avatar_color IN ('blue', 'green', 'amber', 'red'));
ALTER TABLE users ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
-- created_at may already exist — if so, this will error harmlessly

-- Link Rob's existing user to his future auth account (we'll update auth_id after he signs up)
```

### 1b. Add visibility column to lists

```sql
-- Each list can be public or private, per category per user
ALTER TABLE lists ADD COLUMN public BOOLEAN DEFAULT false;
```

### 1c. Create a profile preferences table

```sql
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT,
  bio TEXT,
  default_public BOOLEAN DEFAULT false
);
```

### 1d. Enable Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users: anyone can read basic profile info, only own user can update
CREATE POLICY "Public profiles are viewable by everyone"
  ON users FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE USING (auth.uid() = auth_id);

-- Lists: public lists readable by anyone, private lists only by owner
CREATE POLICY "Public lists are viewable by everyone"
  ON lists FOR SELECT USING (
    public = true
    OR user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can insert own lists"
  ON lists FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can update own lists"
  ON lists FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can delete own lists"
  ON lists FOR DELETE USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Preferences: only own user
CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );
```

**IMPORTANT**: The Express API currently uses the `service_role` key, which bypasses RLS. This is fine for now — RLS is a safety net. The API will enforce auth at the application level. Later we can move to using the user's JWT directly with Supabase client for tighter security.

---

## Phase 2: Express API updates

Edit `~/marque-api/index.js` on the droplet (Rob will SSH in and use vi, or scp a replacement file).

### 2a. Install JWT verification

```bash
cd ~/marque-api
npm install jsonwebtoken
```

### 2b. Add auth middleware

```js
const jwt = require('jsonwebtoken');

// Supabase JWT secret — found in Supabase dashboard → Settings → API → JWT Secret
// Add to .env as SUPABASE_JWT_SECRET
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    req.user = null; // Anonymous
    return next();
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    req.user = decoded; // decoded.sub is the Supabase auth user ID
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.use(authMiddleware);
```

### 2c. Add signup hook endpoint

When a user signs up via Supabase Auth, we need to create a corresponding row in our `users` table. Add this endpoint:

```js
// Called from frontend after successful Supabase signup
app.post('/api/users', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });

  const { handle, display_name } = req.body;
  if (!handle || !display_name) return res.status(400).json({ error: 'handle and display_name required' });

  // Validate handle: lowercase, alphanumeric + underscores, 3-20 chars
  if (!/^[a-z0-9_]{3,20}$/.test(handle)) {
    return res.status(400).json({ error: 'Handle must be 3-20 lowercase letters, numbers, or underscores' });
  }

  // Check uniqueness
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('handle', handle)
    .single();

  if (existing) return res.status(409).json({ error: 'Handle already taken' });

  const { data, error } = await supabase
    .from('users')
    .insert({
      auth_id: req.user.sub,
      email: req.user.email,
      handle,
      display_name
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
```

### 2d. Add "me" endpoint

```js
// Get the current logged-in user's profile
app.get('/api/me', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });

  const { data, error } = await supabase
    .from('users')
    .select('id, handle, display_name, email, avatar_color')
    .eq('auth_id', req.user.sub)
    .single();

  if (error || !data) return res.status(404).json({ error: 'User not found' });
  res.json(data);
});
```

### 2e. Protect write endpoints

Update the existing PUT and DELETE endpoints to require auth and verify ownership:

```js
// Helper: get user from auth token
async function getAuthUser(req) {
  if (!req.user) return null;
  const { data } = await supabase
    .from('users')
    .select('id, handle')
    .eq('auth_id', req.user.sub)
    .single();
  return data;
}
```

For `PUT /api/lists/:handle/:category`:
- Call `getAuthUser(req)` and verify `authUser.handle === req.params.handle`
- If not, return 403
- Accept optional `public` boolean in the request body

For `DELETE /api/lists/:handle/:category/:position`:
- Same ownership check

### 2f. Update GET endpoint for public/private

`GET /api/lists/:handle` should:
- If the requester IS the handle owner (authenticated): return all lists
- If the requester is NOT the owner or anonymous: return only lists where `public = true`

### 2g. Add visibility toggle endpoint

```js
// Toggle public/private for a category
app.patch('/api/lists/:handle/:category/visibility', async (req, res) => {
  const authUser = await getAuthUser(req);
  if (!authUser || authUser.handle !== req.params.handle) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { public: isPublic } = req.body;

  const { error } = await supabase
    .from('lists')
    .update({ public: isPublic })
    .eq('user_id', authUser.id)
    .eq('category', req.params.category);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});
```

### 2h. Add password change endpoint (optional — Supabase handles this client-side, but useful for the account panel)

Not needed — Supabase JS client handles password reset entirely client-side via `supabase.auth.updateUser({ password })` and `supabase.auth.resetPasswordForEmail(email)`.

### 2i. Update .env

Add to `~/marque-api/.env`:

```
SUPABASE_JWT_SECRET=your_jwt_secret_here
```

Get the JWT secret from: Supabase dashboard → Settings → API → JWT Secret.

### 2j. Restart the API

```bash
pm2 restart marque-api
```

---

## Phase 3: Frontend — Supabase client setup

### 3a. Load Supabase JS via CDN

In `index.html`, add before the closing `</head>` tag (after the Google Analytics script, before the theme inline script):

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
```

### 3b. Initialize in app.js

At the top of `app.js`, after the API_BASE constant:

```js
const SUPABASE_URL = 'https://ekokbndwfwiygolwycia.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hvdbnQLxqJWwA3GKRG3j_A_TqLYSsPw';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null; // Will hold { id, handle, display_name, email, avatar_color } when logged in
```

### 3c. Update apiGet and apiPut to include auth token

```js
async function getAuthHeaders() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return {};
  return { 'Authorization': `Bearer ${session.access_token}` };
}

async function apiGet(path) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function apiPut(path, body) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
```

### 3d. Replace hardcoded CURRENT_USER

Remove the `const CURRENT_USER = 'rob';` line. Instead, derive the handle from `currentUser.handle` after login.

Update `loadListsFromAPI()`:

```js
async function loadListsFromAPI() {
  if (!currentUser) {
    // Not logged in — show empty lists, user can browse discover
    lists = { books: [], films: [], albums: [], tv: [] };
    renderMyList();
    return;
  }
  try {
    const data = await apiGet(`/lists/${currentUser.handle}`);
    lists.books  = data.books  || [];
    lists.films  = data.films  || [];
    lists.albums = data.albums || [];
    lists.tv     = data.tv     || [];
  } catch (err) {
    console.error('Failed to load lists from API:', err);
    const saved = localStorage.getItem('lists');
    if (saved) Object.assign(lists, JSON.parse(saved));
  }
  renderMyList();
}
```

Update `saveLists()`:

```js
async function saveLists(cat = currentCat) {
  if (!currentUser) return; // Can't save without auth
  localStorage.setItem('lists', JSON.stringify(lists));
  try {
    await apiPut(`/lists/${currentUser.handle}/${cat}`, lists[cat]);
  } catch (err) {
    console.error('Failed to save to API:', err);
  }
}
```

---

## Phase 4: Frontend — Auth modal

### 4a. HTML structure

Add to `index.html`, just before the closing `</body>` tag:

```html
<!-- Auth Modal -->
<div class="auth-overlay" id="auth-overlay">
  <div class="auth-modal">
    <button class="auth-close" id="auth-close">&times;</button>

    <!-- Login form -->
    <div class="auth-form" id="auth-login">
      <h2>Sign in to Marque</h2>
      <p class="auth-tagline">Art is subjective, but everyone's a critic...</p>
      <div class="auth-error" id="login-error"></div>
      <input type="email" id="login-email" placeholder="Email" autocomplete="email"/>
      <input type="password" id="login-password" placeholder="Password" autocomplete="current-password"/>
      <button class="auth-submit" id="login-submit">Sign in</button>
      <div class="auth-links">
        <a href="#" id="show-signup">Create an account</a>
        <a href="#" id="show-forgot">Forgot password?</a>
      </div>
    </div>

    <!-- Signup form -->
    <div class="auth-form" id="auth-signup" style="display:none">
      <h2>Create your account</h2>
      <div class="auth-error" id="signup-error"></div>
      <input type="text" id="signup-name" placeholder="Display name" autocomplete="name"/>
      <input type="text" id="signup-handle" placeholder="Handle (e.g. rob)" autocomplete="username" pattern="[a-z0-9_]{3,20}"/>
      <input type="email" id="signup-email" placeholder="Email" autocomplete="email"/>
      <input type="password" id="signup-password" placeholder="Password (min 6 chars)" autocomplete="new-password"/>
      <button class="auth-submit" id="signup-submit">Create account</button>
      <div class="auth-links">
        <a href="#" id="show-login-from-signup">Already have an account? Sign in</a>
      </div>
    </div>

    <!-- Forgot password form -->
    <div class="auth-form" id="auth-forgot" style="display:none">
      <h2>Reset your password</h2>
      <p>We'll send you a link to reset your password.</p>
      <div class="auth-error" id="forgot-error"></div>
      <div class="auth-success" id="forgot-success"></div>
      <input type="email" id="forgot-email" placeholder="Email" autocomplete="email"/>
      <button class="auth-submit" id="forgot-submit">Send reset link</button>
      <div class="auth-links">
        <a href="#" id="show-login-from-forgot">Back to sign in</a>
      </div>
    </div>
  </div>
</div>
```

### 4b. CSS

Add to `style.css`. Match the existing design system — use the CSS variables (`--bg`, `--bg2`, `--text`, `--border`, `--r`, etc.). The modal should:

- Overlay the full viewport with a semi-transparent backdrop
- Center a card-style modal (max-width ~400px)
- Use the same font sizes, input styles, and button styles as the rest of the app
- Respect dark/light theme via the existing CSS variables
- Animate in with a subtle fade + scale

Key classes to style:
```
.auth-overlay    — fixed fullscreen backdrop, semi-transparent
.auth-modal      — centered card, padded, rounded corners
.auth-close      — top-right X button
.auth-form h2    — heading
.auth-form input — full-width inputs, match existing search input style
.auth-submit     — primary button, full width
.auth-links      — small text links below form
.auth-links a    — subtle link color
.auth-error      — red text for error messages
.auth-success    — green text for success messages
.auth-tagline    — subtle secondary text below heading
```

### 4c. Auth UI logic in app.js

Add these functions:

```js
// ── Auth UI ──────────────────────────────────────────────────────────────

function showAuthModal(view = 'login') {
  document.getElementById('auth-overlay').classList.add('open');
  document.getElementById('auth-login').style.display = view === 'login' ? '' : 'none';
  document.getElementById('auth-signup').style.display = view === 'signup' ? '' : 'none';
  document.getElementById('auth-forgot').style.display = view === 'forgot' ? '' : 'none';
  // Clear errors
  document.querySelectorAll('.auth-error, .auth-success').forEach(el => el.textContent = '');
}

function hideAuthModal() {
  document.getElementById('auth-overlay').classList.remove('open');
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = '';

  if (!email || !password) { errorEl.textContent = 'Email and password required.'; return; }

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { errorEl.textContent = error.message; return; }

  hideAuthModal();
  await initSession();
}

async function handleSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const handle = document.getElementById('signup-handle').value.trim().toLowerCase();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const errorEl = document.getElementById('signup-error');
  errorEl.textContent = '';

  if (!name || !handle || !email || !password) { errorEl.textContent = 'All fields are required.'; return; }
  if (!/^[a-z0-9_]{3,20}$/.test(handle)) { errorEl.textContent = 'Handle: 3-20 lowercase letters, numbers, or underscores.'; return; }
  if (password.length < 6) { errorEl.textContent = 'Password must be at least 6 characters.'; return; }

  // 1. Sign up with Supabase Auth
  const { data: authData, error: authError } = await sb.auth.signUp({ email, password });
  if (authError) { errorEl.textContent = authError.message; return; }

  // 2. Create user profile in our database
  try {
    const headers = { 'Content-Type': 'application/json' };
    const { data: { session } } = await sb.auth.getSession();
    if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ handle, display_name: name })
    });
    const result = await res.json();
    if (!res.ok) { errorEl.textContent = result.error || 'Failed to create profile.'; return; }
  } catch (err) {
    errorEl.textContent = 'Failed to create profile. Please try again.';
    return;
  }

  hideAuthModal();
  await initSession();
}

async function handleForgotPassword() {
  const email = document.getElementById('forgot-email').value.trim();
  const errorEl = document.getElementById('forgot-error');
  const successEl = document.getElementById('forgot-success');
  errorEl.textContent = '';
  successEl.textContent = '';

  if (!email) { errorEl.textContent = 'Enter your email address.'; return; }

  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://marque.ink'
  });
  if (error) { errorEl.textContent = error.message; return; }
  successEl.textContent = 'Check your email for a reset link.';
}

async function handleLogout() {
  await sb.auth.signOut();
  currentUser = null;
  lists = { books: [], films: [], albums: [], tv: [] };
  updateAuthUI();
  renderMyList();
}
```

### 4d. Session management

```js
async function initSession() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    try {
      currentUser = await apiGet('/me');
    } catch {
      currentUser = null;
    }
  } else {
    currentUser = null;
  }
  updateAuthUI();
  await loadListsFromAPI();
}

function updateAuthUI() {
  // Update nav/sidebar to show user info or login button
  const authArea = document.getElementById('auth-area');
  if (!authArea) return;

  if (currentUser) {
    authArea.innerHTML = `
      <div class="user-badge">
        <div class="user-avatar" style="${avatarStyle(currentUser.avatar_color || 'blue')}">${initials(currentUser.display_name)}</div>
        <span class="user-handle">@${currentUser.handle}</span>
      </div>
      <button class="logout-btn" id="logout-btn">Sign out</button>
    `;
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
  } else {
    authArea.innerHTML = `
      <button class="login-btn" id="login-btn">Sign in</button>
    `;
    document.getElementById('login-btn').addEventListener('click', () => showAuthModal('login'));
  }

  // Disable list editing if not logged in
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.disabled = !currentUser || lists[currentCat].length >= 50;
    if (!currentUser) searchInput.placeholder = 'Sign in to add items';
  }
}
```

### 4e. Add auth-area to index.html

In the sidebar (or wherever the nav lives), add:

```html
<div id="auth-area"></div>
```

This is where the login button / user badge will render.

### 4f. Wire up event listeners

In the DOMContentLoaded handler, add:

```js
// Auth modal navigation
document.getElementById('auth-close').addEventListener('click', hideAuthModal);
document.getElementById('auth-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) hideAuthModal();
});
document.getElementById('show-signup').addEventListener('click', e => { e.preventDefault(); showAuthModal('signup'); });
document.getElementById('show-login-from-signup').addEventListener('click', e => { e.preventDefault(); showAuthModal('login'); });
document.getElementById('show-forgot').addEventListener('click', e => { e.preventDefault(); showAuthModal('forgot'); });
document.getElementById('show-login-from-forgot').addEventListener('click', e => { e.preventDefault(); showAuthModal('login'); });

// Auth form submissions
document.getElementById('login-submit').addEventListener('click', handleLogin);
document.getElementById('signup-submit').addEventListener('click', handleSignup);
document.getElementById('forgot-submit').addEventListener('click', handleForgotPassword);

// Enter key on auth inputs
document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
document.getElementById('signup-password').addEventListener('keydown', e => { if (e.key === 'Enter') handleSignup(); });
document.getElementById('forgot-email').addEventListener('keydown', e => { if (e.key === 'Enter') handleForgotPassword(); });

// Listen for auth state changes (handles token refresh, page reload)
sb.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    if (!currentUser) await initSession();
  }
  if (event === 'SIGNED_OUT') {
    currentUser = null;
    updateAuthUI();
  }
});
```

### 4g. Update init sequence

Replace the current init at the end of DOMContentLoaded:

```js
// OLD:
renderDiscover('all');
renderMatches();
updateProfileCounts();
loadListsFromAPI();

// NEW:
renderDiscover('all');
renderMatches();
initSession(); // This calls loadListsFromAPI() internally, which calls renderMyList() and updateProfileCounts()
```

---

## Phase 5: Account panel

Add an account/settings view accessible from the user badge. This should be a new view section or a modal. Include:

### 5a. Profile editing
- Change display name
- Change handle (with uniqueness check)
- Change avatar color (pick from blue/green/amber/red)

### 5b. Password change
- Current password field (Supabase doesn't require this for `updateUser`, but it's good UX)
- New password field
- Confirm new password field
- Uses `sb.auth.updateUser({ password: newPassword })`

### 5c. List visibility toggles
- Per-category toggle: "Make my [books/films/albums/tv] list public"
- Uses `PATCH /api/lists/:handle/:category/visibility`
- Show current state (public/private) for each category

### 5d. Danger zone
- Delete account button (with confirmation)
- This should delete the user from our users table, their lists, and call `sb.auth.admin.deleteUser()` — but since we can't use admin from the frontend, either:
  - Add a `DELETE /api/me` endpoint that uses the service_role key to delete the auth user and cascade
  - Or just mark the user as deleted (soft delete) and clean up later

---

## Phase 6: Migrate Rob's existing account

After auth is working:

1. Rob signs up with his email via the normal signup flow
2. The existing `rob` user row in the database needs its `auth_id` updated to Rob's new Supabase auth ID
3. Either handle this via a one-time SQL query in Supabase:
   ```sql
   UPDATE users SET auth_id = 'ROBS_AUTH_UUID_HERE' WHERE handle = 'rob';
   ```
4. Or build it into the signup flow: if a user signs up with a handle that already exists and has no `auth_id`, claim it (with email verification)

Option 1 (manual SQL) is simpler and safer for now.

---

## Testing checklist

- [ ] Anonymous user can view discover and matches
- [ ] Anonymous user sees "Sign in" button, cannot add/edit/remove list items
- [ ] Sign up creates both a Supabase auth user and a users table row
- [ ] Sign up with duplicate handle shows error
- [ ] Login works, user sees their lists
- [ ] Logout clears state, returns to anonymous view
- [ ] Forgot password sends email
- [ ] Password reset link works
- [ ] List edits (add/remove/reorder) save with auth token
- [ ] Editing someone else's list is blocked (403)
- [ ] Public/private toggle works per category
- [ ] Another user can only see lists marked as public
- [ ] Account panel: change display name, handle, avatar color
- [ ] Account panel: change password
- [ ] Page refresh maintains session (token in localStorage via Supabase)
- [ ] Rob's existing data migrated to his authenticated account

## Files modified

- `index.html` — add Supabase CDN script, auth modal HTML, auth-area div
- `style.css` — add auth modal styles, login/logout button styles, user badge styles
- `app.js` — Supabase client init, auth functions, session management, protected API calls
- `~/marque-api/index.js` (on droplet) — auth middleware, new endpoints, protected routes
- `~/marque-api/.env` (on droplet) — add SUPABASE_JWT_SECRET

## Deployment

After all changes verified locally:

```bash
scp index.html rob@159.203.113.76:/var/www/html/index.html
scp style.css rob@159.203.113.76:/var/www/html/style.css
scp app.js rob@159.203.113.76:/var/www/html/app.js
ssh rob@159.203.113.76 "cd ~/marque-api && pm2 restart marque-api"
```

(If Rob has fixed permissions with `sudo chown -R rob:rob /var/www/html`, scp will work directly.)
