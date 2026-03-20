// ── Data ──────────────────────────────────────────────────────────────────

const EMOJIS = { books: '📚', films: '🎬', albums: '🎵', tv: '📺' };

let lists = { books: [], films: [], albums: [], tv: [] };

// ── API ───────────────────────────────────────────────────────────────────

const API_BASE    = 'https://marque.ink/api';
const CURRENT_USER = 'rob';

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function apiPut(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function loadListsFromAPI() {
  try {
    const data = await apiGet(`/lists/${CURRENT_USER}`);
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
  localStorage.setItem('lists', JSON.stringify(lists));
  try {
    await apiPut(`/lists/${CURRENT_USER}/${cat}`, lists[cat]);
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
  input.disabled = full;
  input.placeholder = full ? 'List is full' : 'Search to add…';
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

// ── Profile counts ────────────────────────────────────────────────────────

function updateProfileCounts() {
  ['books', 'films', 'albums', 'tv'].forEach(cat => {
    const el = document.getElementById('pc-' + cat);
    if (el) el.textContent = lists[cat].length + ' items';
  });
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
    const res  = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=7&fields=title,author_name,first_publish_year,cover_i`);
    const data = await res.json();
    return (data.docs || []).map(d => ({ title: d.title, meta: [d.author_name?.[0], d.first_publish_year].filter(Boolean).join(' · '), thumb: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-S.jpg` : null, source: 'Open Library' }));
  }
  if (cat === 'films' || cat === 'tv') {
    const res  = await fetch(`https://api.themoviedb.org/3/search/${cat === 'films' ? 'movie' : 'tv'}?api_key=2dca580c2a14b55200e784d157207b4d&query=${encodeURIComponent(query)}&page=1`);
    const data = await res.json();
    return (data.results || []).slice(0, 7).map(d => ({ title: d.title || d.name, meta: (d.release_date || d.first_air_date || '').slice(0, 4), thumb: d.poster_path ? `https://image.tmdb.org/t/p/w92${d.poster_path}` : null, source: 'TMDB' }));
  }
  if (cat === 'albums') {
    const res  = await fetch(`https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(query)}&type=album&fmt=json&limit=7`, { headers: { 'User-Agent': 'Marque.ink/1.0' } });
    const data = await res.json();
    return (data['release-groups'] || []).slice(0, 7).map(d => ({ title: d.title, meta: [d['artist-credit']?.[0]?.name, (d['first-release-date'] || '').slice(0, 4)].filter(Boolean).join(' · '), thumb: null, source: 'MusicBrainz' }));
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
        <div class="ac-source">${r.source}</div>
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
  lists[currentCat].push({ title: r.title, meta: r.meta || '—', thumb: r.thumb || null });
  document.getElementById('search-input').value = '';
  searchResults = [];
  closeDropdown();
  saveLists();
  renderMyList();
}

// ── Nav & Tabs ────────────────────────────────────────────────────────────

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('view-' + id).classList.add('active');
  document.querySelector(`.nav-item[data-view="${id}"]`).classList.add('active');
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
  document.querySelectorAll('.nav-item').forEach(el => el.addEventListener('click', () => showView(el.dataset.view)));

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

  renderDiscover('all');
  renderMatches();
  updateProfileCounts();
  loadListsFromAPI();

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
