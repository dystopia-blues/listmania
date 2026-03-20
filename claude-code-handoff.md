# Claude Code Handoff: Wire Frontend to API

## Date: March 20, 2026

## Context

The Marque.ink frontend currently stores all list data in localStorage via hardcoded JS objects in `app.js`. We've set up a live Express API at `https://marque.ink/api/` backed by Supabase (Postgres). The API is running, seeded with Rob's data, and proxied through Nginx.

The goal of this task is to make the frontend load and save data via the API instead of localStorage.

## Pre-flight checksums

Verify these before editing. If they don't match, STOP and ask Rob.

```
a172f02987375ad0c8abcd3394b1dd9c  app.js
106a8580bb469e4924088e98bd010fc9  index.html
cc9eaffc51936def0dc6dfd6128e6df0  style.css
```

Only `app.js` should need changes. Do not touch `index.html` or `style.css`.

## API reference

Base URL: `https://marque.ink/api`

### GET /api/lists/:handle
Returns all lists for a user, grouped by category.

Response shape:
```json
{
  "books": [{"title": "Dune", "meta": "Frank Herbert", "thumb": null}, ...],
  "films": [{"title": "RoboCop", "meta": "1987", "thumb": null}, ...],
  "albums": [...],
  "tv": [...]
}
```

Items are ordered by position (0-indexed). Missing categories are omitted (not empty arrays).

### PUT /api/lists/:handle/:category
Replaces the entire list for one category. Send a JSON array of items.

Request body:
```json
[
  {"title": "RoboCop", "meta": "1987", "thumb": "https://image.tmdb.org/..."},
  {"title": "Alien", "meta": "1979", "thumb": "https://image.tmdb.org/..."}
]
```

Position is derived from array index — item 0 is position 0, etc.

Response: `{"ok": true}`

### DELETE /api/lists/:handle/:category/:position
Deletes a single item by position.

Response: `{"ok": true}`

## What to change in app.js

### 1. Add an API helper at the top of the file

```js
const API_BASE = 'https://marque.ink/api';
const CURRENT_USER = 'rob';

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function apiPut(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
```

### 2. Replace the data initialization

Currently, `lists` is defined as a hardcoded object literal at the top of `app.js`, and there's a `loadLists()` function that reads from localStorage with the hardcoded data as a fallback.

**Replace this with:**

- Initialize `lists` as an empty object: `let lists = { books: [], films: [], albums: [], tv: [] };`
- Remove the hardcoded demo data entirely
- Create a new `async function loadListsFromAPI()` that calls `GET /api/lists/rob` and populates the `lists` object
- Call `loadListsFromAPI()` on app startup (DOMContentLoaded or wherever the current init runs)
- After loading, call `renderMyList()` to update the view

```js
async function loadListsFromAPI() {
  try {
    const data = await apiGet(`/lists/${CURRENT_USER}`);
    lists.books = data.books || [];
    lists.films = data.films || [];
    lists.albums = data.albums || [];
    lists.tv = data.tv || [];
  } catch (err) {
    console.error('Failed to load lists from API:', err);
    // Fall back to localStorage if API is down
    const saved = localStorage.getItem('lists');
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(lists, parsed);
    }
  }
  renderMyList();
}
```

### 3. Replace saveLists()

There is an existing `saveLists()` function that writes to localStorage. It is called after every mutation (drag reorder, add item, remove item, healThumb fix).

**Replace its implementation** so it saves to the API instead. Keep localStorage as a write-through cache for offline resilience:

```js
async function saveLists() {
  // Write-through to localStorage as backup
  localStorage.setItem('lists', JSON.stringify(lists));

  // Save the current category to API
  const cat = currentCategory(); // however the current active category is determined
  try {
    await apiPut(`/lists/${CURRENT_USER}/${cat}`, lists[cat]);
  } catch (err) {
    console.error('Failed to save to API:', err);
  }
}
```

**IMPORTANT:** Find how the current category is determined in the existing code. It might be a variable like `activeCat`, or derived from the active tab's data attribute, or stored some other way. Use that same mechanism — don't introduce a new one.

### 4. Update healThumb()

`healThumb()` currently fixes a broken poster URL and calls `saveLists()`. This should continue to work as-is since `saveLists()` now hits the API. But verify that `healThumb` passes the correct category so the right list gets saved.

### 5. Handle the add-item flow

When a user adds an item via search (autocomplete), the item gets pushed to the current category's array and `saveLists()` is called. This should continue working with the new `saveLists()`. No changes needed unless the add flow does something special with localStorage directly.

### 6. Handle the remove-item flow

When a user removes an item, verify it calls `saveLists()` after splicing the item out. The PUT endpoint replaces the whole list, so sending the updated array after removal is correct. No need to use the DELETE endpoint for now — PUT with the full updated list is simpler and keeps positions consistent.

### 7. Handle drag reorder

After a drag-and-drop reorder, the items in `lists[cat]` are already rearranged in memory, and `renderMyList(animMap)` is called. Verify that `saveLists()` is also called after the reorder. If it is, no changes needed. If not, add a `saveLists()` call after the reorder commits.

### 8. App initialization order

Find the DOMContentLoaded handler (or equivalent init code). The startup sequence should be:

1. Apply theme (this already happens via inline script in `<head>`)
2. Set up event listeners
3. Call `loadListsFromAPI()` (which calls `renderMyList()` when done)

Make sure `renderMyList()` is NOT called before the API data arrives, or the user will see an empty flash then a re-render. If there's currently a synchronous `renderMyList()` call on init, replace it with the async `loadListsFromAPI()` call.

Consider showing a brief loading state — even just not rendering until data arrives is fine.

## What NOT to change

- Do not touch `index.html` or `style.css`
- Do not change the drag-and-drop implementation (Pointer Events)
- Do not change the render functions (`renderMyList`, `renderDiscover`, `renderMatches`, `renderProfile`)
- Do not change the theme system
- Do not change the export functionality
- Do not remove localStorage entirely — keep it as a fallback
- Do not add any npm dependencies or build steps to the frontend — it must remain vanilla JS
- Do not change how `discoverData` or `matchData` work — those are still hardcoded for now

## Testing

After making changes:

1. Run locally: `python3 -m http.server 8080`, open `http://localhost:8080`
2. Open browser devtools Network tab
3. On load, verify a GET request to `/api/lists/rob` fires and returns data
4. Verify the lists render with the correct items
5. Drag an item to reorder — verify a PUT request fires with the updated array
6. Add an item via search — verify a PUT request fires
7. Remove an item — verify a PUT request fires
8. Hard refresh — verify data persists (came from API, not just localStorage)
9. Check browser console for errors

## Deployment

After verifying locally, the updated `app.js` needs to be copied to the droplet:

```bash
scp app.js rob@159.203.113.76:/var/www/html/app.js
```

Then hard refresh `https://marque.ink` to verify.
