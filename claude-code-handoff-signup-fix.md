# Claude Code Handoff: Fix Signup Flow for Email Confirmation

## Date: March 21, 2026

## Problem

The current signup flow tries to POST to `/api/users` (to create the profile) immediately after `sb.auth.signUp()`. But Supabase has email confirmation enabled, so `signUp` does NOT return a session — the user has to click the confirmation link in their email first. This causes an "Auth required" error on signup.

## Solution

Split signup into two steps:

1. **Signup form**: collects email + password only. After `signUp()`, shows a success message telling the user to check their email. Does NOT collect handle or display name yet.
2. **Complete profile modal**: on the first authenticated visit after email confirmation, `initSession()` calls `/api/me`. If it returns 404 (Supabase auth exists but no row in our `users` table), show a "Complete your profile" modal that collects handle and display name, then POSTs to `/api/users`.

## Changes to index.html

### Update the signup form

Remove the display name and handle fields from `#auth-signup`. It should only have:

```html
<div class="auth-form" id="auth-signup" style="display:none">
  <h2>Create your account</h2>
  <div class="auth-error" id="signup-error"></div>
  <div class="auth-success" id="signup-success"></div>
  <input type="email" id="signup-email" placeholder="Email" autocomplete="email"/>
  <input type="password" id="signup-password" placeholder="Password (min 6 chars)" autocomplete="new-password"/>
  <button class="auth-submit" id="signup-submit">Create account</button>
  <div class="auth-links">
    <a href="#" id="show-login-from-signup">Already have an account? Sign in</a>
  </div>
</div>
```

### Add a "Complete profile" form inside the auth modal

Add this as a new `auth-form` div alongside the existing login/signup/forgot forms:

```html
<div class="auth-form" id="auth-complete-profile" style="display:none">
  <h2>Complete your profile</h2>
  <p class="auth-tagline">One last step — pick a name and handle.</p>
  <div class="auth-error" id="complete-error"></div>
  <input type="text" id="complete-name" placeholder="Display name" autocomplete="name"/>
  <input type="text" id="complete-handle" placeholder="Handle (e.g. rob)" autocomplete="username" pattern="[a-z0-9_]{3,20}"/>
  <button class="auth-submit" id="complete-submit">Let's go</button>
</div>
```

Note: this form has NO close button and NO navigation links — the user must complete it to proceed. The auth-close button should be hidden when this form is active.

## Changes to app.js

### Update handleSignup()

Remove handle and display_name collection. After successful `signUp`, show a success message and do NOT call `initSession()` or `hideAuthModal()`:

```js
async function handleSignup() {
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const errorEl = document.getElementById('signup-error');
  const successEl = document.getElementById('signup-success');
  errorEl.textContent = '';
  successEl.textContent = '';

  if (!email || !password) { errorEl.textContent = 'Email and password required.'; return; }
  if (password.length < 6) { errorEl.textContent = 'Password must be at least 6 characters.'; return; }

  const { error } = await sb.auth.signUp({ email, password });
  if (error) { errorEl.textContent = error.message; return; }

  // Hide the form inputs, show success message
  document.getElementById('signup-submit').style.display = 'none';
  document.querySelectorAll('#auth-signup input').forEach(el => el.style.display = 'none');
  document.querySelector('#auth-signup .auth-links').style.display = 'none';
  successEl.textContent = 'Check your email for a confirmation link. You can close this dialog.';
}
```

### Update showAuthModal()

Add support for the 'complete-profile' view:

```js
function showAuthModal(view = 'login') {
  document.getElementById('auth-overlay').classList.add('open');
  document.getElementById('auth-login').style.display = view === 'login' ? '' : 'none';
  document.getElementById('auth-signup').style.display = view === 'signup' ? '' : 'none';
  document.getElementById('auth-forgot').style.display = view === 'forgot' ? '' : 'none';
  document.getElementById('auth-complete-profile').style.display = view === 'complete-profile' ? '' : 'none';
  // Clear errors and successes
  document.querySelectorAll('.auth-error, .auth-success').forEach(el => el.textContent = '');
  // Hide close button for complete-profile (user must complete it)
  const closeBtn = document.getElementById('auth-close');
  if (closeBtn) closeBtn.style.display = view === 'complete-profile' ? 'none' : '';
}
```

### Add handleCompleteProfile()

```js
async function handleCompleteProfile() {
  const name = document.getElementById('complete-name').value.trim();
  const handle = document.getElementById('complete-handle').value.trim().toLowerCase();
  const errorEl = document.getElementById('complete-error');
  errorEl.textContent = '';

  if (!name || !handle) { errorEl.textContent = 'Both fields are required.'; return; }
  if (!/^[a-z0-9_]{3,20}$/.test(handle)) { errorEl.textContent = 'Handle: 3-20 lowercase letters, numbers, or underscores.'; return; }

  try {
    const headers = { 'Content-Type': 'application/json', ...(await getAuthHeaders()) };
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
```

### Update initSession()

After getting a session, call `/api/me`. If 404, the user has confirmed their email but hasn't set up a profile yet — show the complete-profile modal:

```js
async function initSession() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    try {
      currentUser = await apiGet('/me');
    } catch (err) {
      // 404 means auth exists but no profile row — need to complete profile
      currentUser = null;
      showAuthModal('complete-profile');
      return;
    }
  } else {
    currentUser = null;
  }
  updateAuthUI();
  await loadListsFromAPI();
}
```

### Wire up event listeners

In the DOMContentLoaded handler, add:

```js
document.getElementById('complete-submit').addEventListener('click', handleCompleteProfile);
document.getElementById('complete-handle').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleCompleteProfile();
});
```

### Update the onAuthStateChange listener

The existing `onAuthStateChange` should still work — when the user clicks the confirmation link and lands back on the site, `SIGNED_IN` fires, `initSession()` runs, `/api/me` returns 404, and the complete-profile modal appears. No changes needed here, but verify this is the actual behavior.

### Also update the auth-overlay click-to-close

Make sure clicking the backdrop does NOT close the modal when in complete-profile mode:

```js
document.getElementById('auth-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) {
    // Don't allow closing if complete-profile is showing
    const completeForm = document.getElementById('auth-complete-profile');
    if (completeForm && completeForm.style.display !== 'none') return;
    hideAuthModal();
  }
});
```

## Files modified

- `index.html` — update signup form (remove name/handle fields), add complete-profile form
- `app.js` — update handleSignup, showAuthModal, initSession, add handleCompleteProfile, wire listeners

No changes to `style.css` needed — the complete-profile form uses the same `.auth-form` classes.

No changes to the API needed — `/api/users` POST and `/api/me` GET already work correctly for this flow.

## Testing

1. Go to `https://marque.ink`, click Sign in → Create an account
2. Enter email (`rob.larkin+test@gmail.com`) and password
3. Click Create account → should see "Check your email for a confirmation link"
4. Check Gmail, click the confirmation link
5. Should land back on `marque.ink`, the complete-profile modal should appear (no close button)
6. Enter display name and handle, click "Let's go"
7. Profile should be created, modal closes, user is logged in with empty lists
8. Verify the user exists: `curl https://marque.ink/api/me` (won't work without auth, but check Supabase dashboard → Table Editor → users)
