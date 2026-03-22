// ── Data ──────────────────────────────────────────────────────────────────

const EMOJIS = { books: '📚', films: '🎬', albums: '🎵', tv: '📺' };

let lists = { books: [], films: [], albums: [], tv: [] };

// ── API ───────────────────────────────────────────────────────────────────

const API_BASE = 'https://marque.ink/api';

const SUPABASE_URL = 'https://ekokbndwfwiygolwycia.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrb2tibmR3ZndpeWdvbHd5Y2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNDA0OTMsImV4cCI6MjA4OTYxNjQ5M30.5eghZZvrKXYxLD4YtC4a_ltc8DSQYHzmByccmTy9sRo';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null; // { id, handle, display_name, email, avatar_color } when logged in

let _cachedToken = null;

sb.auth.onAuthStateChange((event, session) => {
  _cachedToken = session?.access_token || null;
});

async function getAuthHeaders() {
  if (_cachedToken) return { 'Authorization': `Bearer ${_cachedToken}` };
  return {};
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
    method:  'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function loadListsFromAPI() {
  if (!currentUser) {
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

async function saveLists(cat = currentCat) {
  if (!currentUser) return;
  localStorage.setItem('lists', JSON.stringify(lists));
  try {
    await apiPut(`/lists/${currentUser.handle}/${cat}`, lists[cat]);
  } catch (err) {
    console.error('Failed to save to API:', err);
  }
}

const discoverData = [
  { name: 'Priya K.', handle: '@priya', color: 'blue', cat: 'books', items: ['Foundation', "Childhood's End", 'The Left Hand of Darkness', 'Solaris', 'Hyperion'] },
  { name: 'Marcus L.', handle: '@marcus', color: 'green', cat: 'films', items: ['Blade Runner', '2001: A Space Odyssey', 'Arrival', 'Stalker', 'Annihilation'] },
  { name: 'Sofia R.', handle: '@sofia', color: 'amber', cat: 'albums', items: ['Pet Sounds', 'OK Computer', 'Kid A', 'Selected Ambient Works', 'In Rainbows'] },
  { name: 'Tom W.', handle: '@tomw', color: 'red', cat: 'books', items: ['Neuromancer', 'Snow Crash', 'The Dispossessed', 'A Fire Upon the Deep', 'Blindsight'] },
  { name: 'Aiko S.', handle: '@aiko', color: 'blue', cat: 'tv', items: ['The Expanse', 'Westworld', 'Black Mirror', 'Battlestar Galactica', 'Severance'] },
  { name: 'Lena M.', handle: '@lena', color: 'green', cat: 'books', items: ['Dune', 'I Am Legend', 'The Stars My Destination', 'More Than Human', 'The Demolished Man'] },
  { name: 'Dev P.', handle: '@devp', color: 'amber', cat: 'films', items: ['The Thing', 'Solaris', 'Primer', 'Moon', 'Ex Machina'] },
  { name: 'Caro B.', handle: '@caro', color: 'red', cat: 'tv', items: ['Dark', 'Fringe', 'Halt and Catch Fire', 'The Leftovers', 'Station Eleven'] },
  { name: 'James O.', handle: '@jamo', color: 'blue', cat: 'albums', items: ['The Rise and Fall of Ziggy Stardust', 'Horses', 'Unknown Pleasures', 'Marquee Moon', 'Remain in Light'] },
  { name: 'Nadia F.', handle: '@nadia', color: 'amber', cat: 'films', items: ['Alien', 'Predator', 'The Terminator', 'RoboCop', 'Total Recall'] },
  { name: 'Will T.', handle: '@willt', color: 'green', cat: 'tv', items: ['The Wire', 'Deadwood', 'Oz', 'The Sopranos', 'Rome'] },
  { name: 'Elif S.', handle: '@elif', color: 'red', cat: 'books', items: ['Slaughterhouse-Five', 'Cat\'s Cradle', 'The Sirens of Titan', 'Breakfast of Champions', 'Mother Night'] },
  { name: 'Ray C.', handle: '@rayc', color: 'blue', cat: 'albums', items: ['Electric Ladyland', 'Are You Experienced', 'Band of Gypsys', 'Axis: Bold as Love', 'Blues'] },
  { name: 'Mia V.', handle: '@miav', color: 'amber', cat: 'tv', items: ['Twin Peaks', 'The X-Files', 'Lost', 'Stranger Things', 'True Detective'] },
  { name: 'Otto H.', handle: '@otto', color: 'green', cat: 'films', items: ['Yojimbo', 'Sanjuro', 'Seven Samurai', 'Rashomon', 'Ikiru'] },
  { name: 'Bex R.', handle: '@bexr', color: 'red', cat: 'albums', items: ['Elephant', 'White Blood Cells', 'De Stijl', 'Icky Thump', 'Get Behind Me Satan'] },
];

const matchData = [
  { name: 'Lena M.', handle: '@lena', color: 'green', score: 91, shared: ['Dune', 'I Am Legend', 'The Stars My Destination'], following: false },
  { name: 'Nadia F.', handle: '@nadia', color: 'amber', score: 85, shared: ['Alien', 'RoboCop', 'Escape from New York'], following: false },
  { name: 'Tom W.', handle: '@tomw', color: 'red', score: 78, shared: ['Philip K. Dick', 'Neal Stephenson', 'Hard SF'], following: false },
  { name: 'Otto H.', handle: '@otto', color: 'green', score: 74, shared: ['Yojimbo', 'Seven Samurai', 'Classic action'], following: true },
  { name: 'Priya K.', handle: '@priya', color: 'blue', score: 65, shared: ['Ubik', 'The Dark Forest', 'Eon'], following: true },
  { name: 'Will T.', handle: '@willt', color: 'green', score: 61, shared: ['The Wire', 'Deadwood', 'HBO drama'], following: false },
  { name: 'Ray C.', handle: '@rayc', color: 'blue', score: 57, shared: ['Electric Ladyland', 'Hendrix', 'Classic rock'], following: false },
  { name: 'Dev P.', handle: '@devp', color: 'amber', score: 52, shared: ['Classic sci-fi', '1950s–70s era', 'Dystopia'], following: false },
];

const AVATAR_STYLES = {
  blue:  { bg: '#dbeafe', text: '#1e40af' },
  green: { bg: '#dcfce7', text: '#166534' },
  amber: { bg: '#fef3c7', text: '#92400e' },
  red:   { bg: '#fee2e2', text: '#991b1b' },
};


// ── State ─────────────────────────────────────────────────────────────────

let currentCat = 'books';
let searchResults = [];
let focusedIdx = -1;
let debounceTimer = null;

// ── Helpers ───────────────────────────────────────────────────────────────

function avatarStyle(color) {
  const c = AVATAR_STYLES[color] || AVATAR_STYLES.blue;
  return `background:${c.bg};color:${c.text}`;
}

function initials(name) {
  return name.split(' ').map(n => n[0]).join('');
}

function coverHTML(thumb, cat, idx) {
  if (thumb) {
    return `<div class="item-cover"><img src="${thumb}" height="100" alt="" onerror="healThumb(this,'${cat}',${idx})"/></div>`;
  }
  return `<div class="item-cover">${EMOJIS[cat]}</div>`;
}

async function healThumb(img, cat, idx) {
  img.onerror = null; // prevent retry loops
  const item = lists[cat]?.[idx];
  if (!item) { img.parentElement.innerHTML = EMOJIS[cat]; return; }
  const type   = cat === 'tv' ? 'tv' : 'movie';
  const year   = item.meta.match(/\d{4}/)?.[0] || '';
  const yParam = cat === 'tv' ? 'first_air_date_year' : 'primary_release_year';
  try {
    const res  = await fetch(`https://api.themoviedb.org/3/search/${type}?api_key=2dca580c2a14b55200e784d157207b4d&query=${encodeURIComponent(item.title)}&${yParam}=${year}`);
    const data = await res.json();
    const hit  = (data.results || [])[0];
    if (hit?.poster_path) {
      const newThumb = `https://image.tmdb.org/t/p/w92${hit.poster_path}`;
      img.src = newThumb;
      lists[cat][idx].thumb = newThumb;
      saveLists(cat);
    } else {
      img.parentElement.innerHTML = EMOJIS[cat];
    }
  } catch {
    img.parentElement.innerHTML = EMOJIS[cat];
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Render: My List ───────────────────────────────────────────────────────

function renderMyList(animMap) {
  const items = lists[currentCat];
  document.getElementById('list-label').textContent = `Top 50 ${currentCat}`;

  const grid = document.getElementById('my-list');
  grid.innerHTML = items.map((item, i) => `
    <div class="list-item" data-i="${i}">
      <div class="drag-handle" data-h="${i}" title="Drag to reorder">
        <svg width="12" height="16" viewBox="0 0 12 16" fill="none">
          <circle cx="4" cy="4"  r="1.5" fill="currentColor"/>
          <circle cx="4" cy="8"  r="1.5" fill="currentColor"/>
          <circle cx="4" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="8" cy="4"  r="1.5" fill="currentColor"/>
          <circle cx="8" cy="8"  r="1.5" fill="currentColor"/>
          <circle cx="8" cy="12" r="1.5" fill="currentColor"/>
        </svg>
      </div>
      <div class="rank-num">${i + 1}</div>
      ${coverHTML(item.thumb, currentCat, i)}
      <div class="item-info">
        <div class="item-title">${escHtml(item.title)}</div>
        <div class="item-meta">${escHtml(item.meta)}</div>
      </div>
      <div class="item-actions">
        <button class="move-btn" data-u="${i}" title="Move up" ${i === 0 ? 'disabled' : ''}>
          <svg width="14" height="14" viewBox="0 0 10 10" fill="none"><path d="M5 8V2M2 5l3-3 3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="move-btn" data-d="${i}" title="Move down" ${i === items.length - 1 ? 'disabled' : ''}>
          <svg width="14" height="14" viewBox="0 0 10 10" fill="none"><path d="M5 2v6M2 5l3 3 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="item-remove" data-x="${i}" title="Remove">×</button>
      </div>
    </div>
  `).join('');

  if (animMap) {
    grid.querySelectorAll('.list-item').forEach(el => {
      const cls = animMap[+el.dataset.i];
      if (cls) el.classList.add(cls);
    });
  }

  grid.querySelectorAll('[data-u]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = +btn.dataset.u;
      if (i === 0) return;
      [lists[currentCat][i - 1], lists[currentCat][i]] = [lists[currentCat][i], lists[currentCat][i - 1]];
      saveLists();
      renderMyList({ [i - 1]: 'item-moved-up', [i]: 'item-moved-down' });
    });
  });

  grid.querySelectorAll('[data-d]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = +btn.dataset.d;
      if (i === lists[currentCat].length - 1) return;
      [lists[currentCat][i], lists[currentCat][i + 1]] = [lists[currentCat][i + 1], lists[currentCat][i]];
      saveLists();
      renderMyList({ [i]: 'item-moved-down', [i + 1]: 'item-moved-up' });
    });
  });

  grid.querySelectorAll('[data-x]').forEach(btn => {
    btn.addEventListener('click', () => {
      lists[currentCat].splice(+btn.dataset.x, 1);
      saveLists();
      renderMyList();
    });
  });

  initDrag(grid);

  const full = items.length >= 50;
  const input = document.getElementById('search-input');
  input.disabled = full || !currentUser;
  input.placeholder = !currentUser ? 'Sign in to add items' : (full ? 'List is full' : 'Search to add…');
  document.getElementById('limit-note').style.display = full ? 'block' : 'none';

  updateProfileCounts();
}

// ── Drag-and-drop (pointer events — no HTML5 drag API) ────────────────────
// Uses pointerdown/pointermove/pointerup on the drag handle.
// Drop position is calculated by iterating item bounding rects directly,
// avoiding elementFromPoint unreliability when a ghost overlaps the list.

const DROP_LINE = document.createElement('div');
DROP_LINE.className = 'drop-line';

function _removeLine() {
  if (DROP_LINE.parentNode) DROP_LINE.parentNode.removeChild(DROP_LINE);
}

function initDrag(grid) {
  grid.querySelectorAll('[data-h]').forEach(handle => {
    handle.addEventListener('pointerdown', e => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);

      const row     = handle.closest('.list-item');
      const dragIdx = +row.dataset.i;
      const rowRect = row.getBoundingClientRect();
      const offY    = e.clientY - rowRect.top;
      const offX    = e.clientX - rowRect.left;

      // Ghost: clone the row and fix it to body
      const ghost = row.cloneNode(true);
      ghost.style.cssText = `
        position:fixed; pointer-events:none; z-index:9999;
        width:${rowRect.width}px; height:${rowRect.height}px;
        top:${rowRect.top}px; left:${rowRect.left}px;
        border-radius:var(--radius-md);
        box-shadow:0 8px 28px rgba(0,0,0,0.18);
        opacity:0.92;
        background:var(--color-background-primary);
        border:0.5px solid var(--color-border-secondary);
      `;
      document.body.appendChild(ghost);
      row.classList.add('dragging');

      let insertPos = null;

      function getItemRects() {
        return [...grid.querySelectorAll('.list-item')].map(el => ({
          el,
          idx: +el.dataset.i,
          mid: (el.getBoundingClientRect().top + el.getBoundingClientRect().bottom) / 2,
        }));
      }

      function updateLine(clientY) {
        const rects  = getItemRects();
        let best     = null;
        let bestPos  = rects.length > 0 ? rects[rects.length - 1].idx + 1 : 0;

        for (const r of rects) {
          if (clientY <= r.mid) {
            best    = r.el;
            bestPos = r.idx;
            break;
          }
        }

        if (bestPos === insertPos) return;
        insertPos = bestPos;
        if (best) grid.insertBefore(DROP_LINE, best);
        else      grid.appendChild(DROP_LINE);
      }

      handle.addEventListener('pointermove', e => {
        ghost.style.top  = (e.clientY - offY) + 'px';
        ghost.style.left = (e.clientX - offX) + 'px';
        updateLine(e.clientY);
      });

      handle.addEventListener('pointerup', () => {
        ghost.remove();
        row.classList.remove('dragging');
        _removeLine();

        if (insertPos !== null) {
          const list = lists[currentCat];
          const item = list.splice(dragIdx, 1)[0];
          const at   = insertPos > dragIdx ? insertPos - 1 : insertPos;
          list.splice(at, 0, item);
          saveLists();

          // Build animation map
          const animMap = {};
          const lo = Math.min(dragIdx, at);
          const hi = Math.max(dragIdx, at);
          for (let n = lo; n <= hi; n++) {
            animMap[n] = n === at
              ? (dragIdx > at ? 'item-moved-up' : 'item-moved-down')
              : (dragIdx < at ? 'item-moved-up' : 'item-moved-down');
          }
          renderMyList(animMap);
        }

        insertPos = null;
      });
    });
  });
}

// ── Render: Discover ──────────────────────────────────────────────────────

function renderDiscover(filter) {
  const data = filter === 'all' ? discoverData : discoverData.filter(d => d.cat === filter);
  document.getElementById('discover-grid').innerHTML = data.map(d => `
    <div class="discover-card">
      <div class="dc-header">
        <div class="dc-avatar" style="${avatarStyle(d.color)}">${initials(d.name)}</div>
        <div><div class="dc-name">${escHtml(d.name)}</div><div class="dc-handle">${d.handle}</div></div>
      </div>
      <div class="dc-cat-badge">${EMOJIS[d.cat]} ${d.cat}</div>
      <div class="dc-items">${d.items.map((item, i) => `
        <div class="dc-row"><span class="dc-num">${i + 1}</span>${escHtml(item)}</div>`).join('')}
      </div>
    </div>
  `).join('');
}

// ── Render: Matches ───────────────────────────────────────────────────────

function renderMatches() {
  document.getElementById('match-cards').innerHTML = matchData.map((m, i) => `
    <div class="match-card">
      <div class="match-score">
        <div class="score-n">${m.score}%</div>
        <div class="score-l">taste</div>
      </div>
      <div class="dc-avatar" style="${avatarStyle(m.color)};width:36px;height:36px;font-size:12px;flex-shrink:0">${initials(m.name)}</div>
      <div class="match-info">
        <div class="match-name">${escHtml(m.name)}</div>
        <div class="match-handle">${m.handle}</div>
        <div class="shared-tags">${m.shared.map(s => `<span class="shared-tag">${escHtml(s)}</span>`).join('')}</div>
      </div>
      <button class="follow-btn ${m.following ? 'following' : ''}" data-idx="${i}">
        ${m.following ? 'Following' : 'Follow'}
      </button>
    </div>
  `).join('');

  document.querySelectorAll('.follow-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = +btn.dataset.idx;
      matchData[i].following = !matchData[i].following;
      btn.textContent = matchData[i].following ? 'Following' : 'Follow';
      btn.classList.toggle('following', matchData[i].following);
    });
  });
}

// ── Profile ───────────────────────────────────────────────────────────────

function renderProfile() {
  const avatarEl = document.getElementById('profile-avatar');
  const nameEl   = document.getElementById('profile-name');
  const handleEl = document.getElementById('profile-handle');
  if (!avatarEl) return;

  if (currentUser) {
    avatarEl.setAttribute('style', avatarStyle(currentUser.avatar_color || 'blue'));
    avatarEl.textContent   = initials(currentUser.display_name);
    nameEl.textContent     = currentUser.display_name;
    handleEl.textContent   = `@${currentUser.handle}`;
  } else {
    avatarEl.removeAttribute('style');
    avatarEl.textContent = '?';
    nameEl.textContent   = 'Not signed in';
    handleEl.textContent = '';
  }

  const cats       = ['books', 'films', 'albums', 'tv'];
  const totalItems = cats.reduce((n, c) => n + (lists[c]?.length || 0), 0);
  const activeLists = cats.filter(c => lists[c]?.length > 0).length;

  const statLists = document.getElementById('stat-lists');
  const statItems = document.getElementById('stat-items');
  if (statLists) statLists.textContent = activeLists;
  if (statItems) statItems.textContent = totalItems;
}

function updateProfileCounts() {
  ['books', 'films', 'albums', 'tv'].forEach(cat => {
    const el = document.getElementById('pc-' + cat);
    if (el) el.textContent = lists[cat].length + ' items';
  });
  renderProfile();
}

// ── Export ────────────────────────────────────────────────────────────────

function exportList(fmt) {
  const items    = lists[currentCat];
  const catLabel = currentCat.charAt(0).toUpperCase() + currentCat.slice(1);
  const dateStr  = new Date().toISOString().slice(0, 10);
  let content, filename, mime;

  if (fmt === 'json') {
    content  = JSON.stringify({ list: catLabel, user: '@Rob', exported: dateStr, items: items.map((item, i) => ({ rank: i + 1, title: item.title, meta: item.meta })) }, null, 2);
    filename = `marque-${currentCat}.json`;
    mime     = 'application/json';
  } else if (fmt === 'yaml') {
    content  = [`list: ${catLabel}`, `user: "@Rob"`, `exported: ${dateStr}`, `items:`,
      ...items.map((item, i) => `  - rank: ${i + 1}\n    title: "${item.title.replace(/"/g, '\\"')}"\n    meta: "${item.meta.replace(/"/g, '\\"')}"`)
    ].join('\n');
    filename = `marque-${currentCat}.yaml`;
    mime     = 'text/yaml';
  } else if (fmt === 'md') {
    content  = [`# ${catLabel} — @Rob's top ${items.length}`, ``, `> Exported ${dateStr} from Marque.ink`, ``,
      ...items.map((item, i) => `${i + 1}. **${item.title}** — ${item.meta}`)
    ].join('\n');
    filename = `marque-${currentCat}.md`;
    mime     = 'text/markdown';
  }

  const a    = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([content], { type: mime })), download: filename });
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Search / Autocomplete ─────────────────────────────────────────────────

async function searchAPI(query, cat) {
  if (cat === 'books') {
    const res  = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=7&fields=key,title,author_name,first_publish_year,cover_i`);
    const data = await res.json();
    return (data.docs || []).map(d => ({ title: d.title, meta: [d.author_name?.[0], d.first_publish_year].filter(Boolean).join(' · '), thumb: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-S.jpg` : null, source: 'openlibrary', source_id: d.key || null, sourceLabel: 'Open Library' }));
  }
  if (cat === 'films' || cat === 'tv') {
    const res  = await fetch(`https://api.themoviedb.org/3/search/${cat === 'films' ? 'movie' : 'tv'}?api_key=2dca580c2a14b55200e784d157207b4d&query=${encodeURIComponent(query)}&page=1`);
    const data = await res.json();
    return (data.results || []).slice(0, 7).map(d => ({ title: d.title || d.name, meta: (d.release_date || d.first_air_date || '').slice(0, 4), thumb: d.poster_path ? `https://image.tmdb.org/t/p/w92${d.poster_path}` : null, source: 'tmdb', source_id: String(d.id), sourceLabel: 'TMDB' }));
  }
  if (cat === 'albums') {
    const res  = await fetch(`https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(query)}&type=album&fmt=json&limit=7`, { headers: { 'User-Agent': 'Marque.ink/1.0' } });
    const data = await res.json();
    return (data['release-groups'] || []).slice(0, 7).map(d => ({ title: d.title, meta: [d['artist-credit']?.[0]?.name, (d['first-release-date'] || '').slice(0, 4)].filter(Boolean).join(' · '), thumb: null, source: 'musicbrainz', source_id: d.id || null, sourceLabel: 'MusicBrainz' }));
  }
  return [];
}

function renderDropdown(results) {
  const ac = document.getElementById('autocomplete');
  focusedIdx = -1;
  if (!results.length) { ac.innerHTML = `<div class="ac-empty">No results found</div>`; ac.classList.add('open'); return; }
  ac.innerHTML = results.map((r, i) => `
    <div class="ac-item" data-idx="${i}">
      <div class="ac-thumb">${r.thumb ? `<img src="${r.thumb}" alt="" onerror="this.parentElement.innerHTML='${EMOJIS[currentCat]}'"/>` : EMOJIS[currentCat]}</div>
      <div style="min-width:0;flex:1">
        <div class="ac-title">${escHtml(r.title)}</div>
        ${r.meta ? `<div class="ac-meta">${escHtml(r.meta)}</div>` : ''}
        <div class="ac-source">${r.sourceLabel}</div>
      </div>
    </div>`).join('');
  ac.querySelectorAll('.ac-item').forEach(el => el.addEventListener('mousedown', e => { e.preventDefault(); selectResult(+el.dataset.idx); }));
  ac.classList.add('open');
}

function closeDropdown() { document.getElementById('autocomplete').classList.remove('open'); focusedIdx = -1; }

function setFocus(items) {
  items.forEach((el, i) => el.classList.toggle('focused', i === focusedIdx));
  if (items[focusedIdx]) items[focusedIdx].scrollIntoView({ block: 'nearest' });
}

function selectResult(idx) {
  const r = searchResults[idx];
  if (!r || lists[currentCat].length >= 50) return;
  lists[currentCat].push({ title: r.title, meta: r.meta || '—', thumb: r.thumb || null, source: r.source || null, source_id: r.source_id || null });
  document.getElementById('search-input').value = '';
  searchResults = [];
  closeDropdown();
  saveLists();
  renderMyList();
}

// ── Auth UI ───────────────────────────────────────────────────────────────

function showAuthModal(view = 'login') {
  document.getElementById('auth-overlay').classList.add('open');
  document.getElementById('auth-login').style.display            = view === 'login'            ? '' : 'none';
  document.getElementById('auth-signup').style.display           = view === 'signup'           ? '' : 'none';
  document.getElementById('auth-forgot').style.display           = view === 'forgot'           ? '' : 'none';
  document.getElementById('auth-complete-profile').style.display = view === 'complete-profile' ? '' : 'none';
  document.querySelectorAll('.auth-error, .auth-success').forEach(el => el.textContent = '');
  // Hide close button when user must complete profile
  const closeBtn = document.getElementById('auth-close');
  if (closeBtn) closeBtn.style.display = view === 'complete-profile' ? 'none' : '';
}

function hideAuthModal() {
  document.getElementById('auth-overlay').classList.remove('open');
}

async function handleLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl  = document.getElementById('login-error');
  errorEl.textContent = '';
  if (!email || !password) { errorEl.textContent = 'Email and password required.'; return; }
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { errorEl.textContent = error.message; return; }
  // Session is in data.session — skip getSession entirely
  if (data.session) {
    try {
      currentUser = await apiGet('/me');
    } catch {
      currentUser = null;
      hideAuthModal();
      showAuthModal('complete-profile');
      return;
    }
  }
  hideAuthModal();
  updateAuthUI();
  await loadListsFromAPI();
}
async function handleSignup() {
  const email     = document.getElementById('signup-email').value.trim();
  const password  = document.getElementById('signup-password').value;
  const errorEl   = document.getElementById('signup-error');
  const successEl = document.getElementById('signup-success');
  errorEl.textContent   = '';
  successEl.textContent = '';

  if (!email || !password) { errorEl.textContent = 'Email and password required.'; return; }
  if (password.length < 6) { errorEl.textContent = 'Password must be at least 6 characters.'; return; }

  const { error } = await sb.auth.signUp({ email, password });
  if (error) { errorEl.textContent = error.message; return; }

  // Email confirmation required — hide form, show message
  document.getElementById('signup-submit').style.display = 'none';
  document.querySelectorAll('#auth-signup input').forEach(el => el.style.display = 'none');
  document.querySelector('#auth-signup .auth-links').style.display = 'none';
  successEl.textContent = 'Check your email for a confirmation link. You can close this dialog.';
}

async function handleCompleteProfile() {
  const name    = document.getElementById('complete-name').value.trim();
  const handle  = document.getElementById('complete-handle').value.trim().toLowerCase();
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
  } catch {
    errorEl.textContent = 'Failed to create profile. Please try again.';
    return;
  }

hideAuthModal();
  try {
    currentUser = await apiGet('/me');
  } catch {
    currentUser = null;
  }
  updateAuthUI();
  await loadListsFromAPI();
}

async function handleForgotPassword() {
  const email    = document.getElementById('forgot-email').value.trim();
  const errorEl  = document.getElementById('forgot-error');
  const successEl = document.getElementById('forgot-success');
  errorEl.textContent = '';
  successEl.textContent = '';
  if (!email) { errorEl.textContent = 'Enter your email address.'; return; }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: 'https://marque.ink' });
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


function updateAuthUI() {
  const authArea   = document.getElementById('auth-area');
  const mobileAuth = document.getElementById('mobile-auth');

  if (currentUser) {
    const sidebarHTML = `
      <div class="user-badge">
        <div class="user-avatar" style="${avatarStyle(currentUser.avatar_color || 'blue')}">${initials(currentUser.display_name)}</div>
        <span class="user-handle">@${currentUser.handle}</span>
      </div>
      <button class="logout-btn" id="logout-btn">Sign out</button>
    `;
    if (authArea) {
      authArea.innerHTML = sidebarHTML;
      document.getElementById('logout-btn').addEventListener('click', handleLogout);
    }
    if (mobileAuth) {
      mobileAuth.innerHTML = `<button class="logout-btn" id="logout-btn-mobile">Sign out</button>`;
      document.getElementById('logout-btn-mobile').addEventListener('click', handleLogout);
    }
  } else {
    if (authArea) {
      authArea.innerHTML = `<button class="login-btn" id="login-btn">Sign in</button>`;
      document.getElementById('login-btn').addEventListener('click', () => showAuthModal('login'));
    }
    if (mobileAuth) {
      mobileAuth.innerHTML = `<button class="login-btn" id="login-btn-mobile">Sign in</button>`;
      document.getElementById('login-btn-mobile').addEventListener('click', () => showAuthModal('login'));
    }
  }

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.disabled = !currentUser || lists[currentCat].length >= 50;
    if (!currentUser) searchInput.placeholder = 'Sign in to add items';
  }

  // Show landing for logged-out users; switch to my-lists when they log in
  const landingView = document.getElementById('view-landing');
  const isOnLanding = landingView && landingView.classList.contains('active');
  if (!currentUser) {
    showView('landing');
  } else if (isOnLanding) {
    showView('my-lists');
  }

  renderProfile();
}

// ── Nav & Tabs ────────────────────────────────────────────────────────────

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('view-' + id).classList.add('active');
  const navItem = document.querySelector(`.nav-item[data-view="${id}"]`);
  if (navItem) navItem.classList.add('active');
}

// ── Init ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  // Export
  const exportBtn  = document.getElementById('export-btn');
  const exportMenu = document.getElementById('export-menu');
  exportBtn.addEventListener('click', e => { e.stopPropagation(); const o = exportMenu.classList.toggle('open'); exportBtn.classList.toggle('open', o); });
  exportMenu.querySelectorAll('.export-option').forEach(opt => opt.addEventListener('click', () => { exportList(opt.dataset.fmt); exportMenu.classList.remove('open'); exportBtn.classList.remove('open'); }));
  document.addEventListener('click', e => { if (!document.getElementById('export-wrap').contains(e.target)) { exportMenu.classList.remove('open'); exportBtn.classList.remove('open'); } });

  // Nav
  document.querySelectorAll('.nav-item').forEach(el => el.addEventListener('click', () => {
    if (el.dataset.view === 'my-lists' && !currentUser) { showAuthModal('login'); return; }
    showView(el.dataset.view);
  }));

  // Landing page CTA buttons
  document.getElementById('landing-signup-btn').addEventListener('click', () => showAuthModal('signup'));
  document.getElementById('landing-signin-btn').addEventListener('click', () => showAuthModal('login'));

  // My Lists tabs
  document.getElementById('my-tabs').addEventListener('click', e => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    document.querySelectorAll('#my-tabs .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    currentCat = btn.dataset.cat;
    document.getElementById('search-input').value = '';
    searchResults = [];
    closeDropdown();
    renderMyList();
  });

  // Discover tabs
  document.getElementById('disc-tabs').addEventListener('click', e => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    document.querySelectorAll('#disc-tabs .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    renderDiscover(btn.dataset.cat);
  });

  // Search
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const val = searchInput.value.trim();
    if (!val) { closeDropdown(); return; }
    debounceTimer = setTimeout(async () => {
      document.getElementById('spinner').classList.add('visible');
      try {
        searchResults = await searchAPI(val, currentCat);
        renderDropdown(searchResults);
      } catch {
        searchResults = [];
        document.getElementById('autocomplete').innerHTML = `<div class="ac-empty">Search unavailable — check your connection</div>`;
        document.getElementById('autocomplete').classList.add('open');
      } finally {
        document.getElementById('spinner').classList.remove('visible');
      }
    }, 320);
  });

  searchInput.addEventListener('keydown', e => {
    const items = document.querySelectorAll('.ac-item');
    if      (e.key === 'ArrowDown') { e.preventDefault(); focusedIdx = Math.min(focusedIdx + 1, items.length - 1); setFocus(items); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); focusedIdx = Math.max(focusedIdx - 1, 0); setFocus(items); }
    else if (e.key === 'Enter')     { if (focusedIdx >= 0) selectResult(focusedIdx); }
    else if (e.key === 'Escape')    closeDropdown();
  });

  searchInput.addEventListener('focus', () => { if (searchResults.length) document.getElementById('autocomplete').classList.add('open'); });
  document.addEventListener('click', e => { if (!document.getElementById('add-area').contains(e.target)) closeDropdown(); });

  // Auth modal navigation
  document.getElementById('auth-close').addEventListener('click', hideAuthModal);
  document.getElementById('auth-overlay').addEventListener('click', e => {
    if (e.target !== e.currentTarget) return;
    const completeForm = document.getElementById('auth-complete-profile');
    if (completeForm && completeForm.style.display !== 'none') return;
    hideAuthModal();
  });
  document.getElementById('show-signup').addEventListener('click', e => { e.preventDefault(); showAuthModal('signup'); });
  document.getElementById('show-login-from-signup').addEventListener('click', e => { e.preventDefault(); showAuthModal('login'); });
  document.getElementById('show-forgot').addEventListener('click', e => { e.preventDefault(); showAuthModal('forgot'); });
  document.getElementById('show-login-from-forgot').addEventListener('click', e => { e.preventDefault(); showAuthModal('login'); });

  // Auth form submissions
  document.getElementById('login-submit').addEventListener('click', handleLogin);
  document.getElementById('signup-submit').addEventListener('click', handleSignup);
  document.getElementById('forgot-submit').addEventListener('click', handleForgotPassword);
  document.getElementById('complete-submit').addEventListener('click', handleCompleteProfile);

  // Enter key on auth inputs
  document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
  document.getElementById('signup-password').addEventListener('keydown', e => { if (e.key === 'Enter') handleSignup(); });
  document.getElementById('forgot-email').addEventListener('keydown', e => { if (e.key === 'Enter') handleForgotPassword(); });
  document.getElementById('complete-handle').addEventListener('keydown', e => { if (e.key === 'Enter') handleCompleteProfile(); });

// Auth state changes (token refresh, page reload)
  sb.auth.onAuthStateChange(async (event, session) => {
    _cachedToken = session?.access_token || null;
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      if (!currentUser) {
        try {
          currentUser = await apiGet('/me');
        } catch {
          currentUser = null;
          showAuthModal('complete-profile');
        }
        updateAuthUI();
        await loadListsFromAPI();
      }
    }
    if (event === 'SIGNED_OUT') {
      currentUser = null;
      lists = { books: [], films: [], albums: [], tv: [] };
      renderMyList();
      updateAuthUI();
    }
  });

  renderDiscover('all');
  renderMatches();

  // Initial session check — give onAuthStateChange a moment to fire
  setTimeout(async () => {
    if (_cachedToken && !currentUser) {
      try {
        currentUser = await apiGet('/me');
      } catch {
        currentUser = null;
        showAuthModal('complete-profile');
      }
    }
    updateAuthUI();
    await loadListsFromAPI();
  }, 500);
  

  // ── Theme toggle ──────────────────────────────────────────────────────────
  const SUN_SVG  = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" fill="currentColor"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
  const MOON_SVG = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M13.5 10.5A6 6 0 016.5 3.5a6 6 0 100 10 6 6 0 007-3z" fill="currentColor"/></svg>`;

  function effectiveTheme() {
    return localStorage.getItem('theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
    const btn = document.getElementById('theme-toggle');
    if (theme === 'dark') {
      btn.innerHTML = SUN_SVG;
      btn.title = 'Switch to light mode';
    } else {
      btn.innerHTML = MOON_SVG;
      btn.title = 'Switch to dark mode';
    }
  }

  document.getElementById('theme-toggle').addEventListener('click', () => {
    applyTheme(effectiveTheme() === 'dark' ? 'light' : 'dark');
  });

  applyTheme(effectiveTheme());
});
