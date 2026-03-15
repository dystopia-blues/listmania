// ── Data ──────────────────────────────────────────────────────────────────

const EMOJIS = { books: '📚', films: '🎬', albums: '🎵', tv: '📺' };

const lists = {
  books: [
    { title: 'Dune', meta: 'Frank Herbert · 1965', thumb: null },
    { title: 'The Moon is a Harsh Mistress', meta: 'Robert A. Heinlein · 1965', thumb: null },
    { title: 'I Am Legend', meta: 'Richard Matheson · 1954', thumb: null },
    { title: 'Flow My Tears, the Policeman Said', meta: 'Philip K. Dick · 1974', thumb: null },
    { title: 'Ubik', meta: 'Philip K. Dick · 1969', thumb: null },
    { title: 'The Stars My Destination', meta: 'Alfred Bester · 1956', thumb: null },
    { title: 'The Dark Forest', meta: '刘慈欣 · 2008', thumb: null },
    { title: 'Fall; or, Dodge in Hell', meta: 'Neal Stephenson · 2019', thumb: null },
    { title: 'The Man in the High Castle', meta: 'Philip K. Dick · 1962', thumb: null },
    { title: 'Eon', meta: 'Greg Bear · 1985', thumb: null },
  ],
  films: [
    { title: 'RoboCop', meta: '1987', thumb: null },
    { title: 'The Color of Money', meta: '1986', thumb: null },
    { title: 'Alien', meta: '1979', thumb: null },
    { title: 'Twelve Monkeys', meta: '1995', thumb: null },
    { title: 'Escape from New York', meta: '1981', thumb: null },
    { title: 'Aliens', meta: '1986', thumb: null },
    { title: 'Yojimbo', meta: '1961', thumb: null },
    { title: 'Rocky', meta: '1976', thumb: null },
    { title: 'They Live', meta: '1988', thumb: null },
    { title: 'A Better Tomorrow', meta: '1986', thumb: null },
  ],
  albums: [
    { title: 'What Up, Dog?', meta: 'Was (Not Was) · 1988', thumb: null },
    { title: 'Electric Ladyland', meta: 'The Jimi Hendrix Experience · 1968', thumb: null },
    { title: 'Elephant', meta: 'The White Stripes · 2003', thumb: null },
    { title: 'Origin of Symmetry', meta: 'Muse · 2001', thumb: null },
    { title: 'Led Zeppelin IV', meta: 'Led Zeppelin · 1971', thumb: null },
    { title: 'Every Waking Moment', meta: 'Citizen Cope · 2006', thumb: null },
    { title: 'AM', meta: 'Arctic Monkeys · 2013', thumb: null },
  ],
  tv: [
    { title: 'The Wire', meta: 'HBO · 2002–2008', thumb: null },
    { title: 'Battlestar Galactica', meta: '2004', thumb: null },
    { title: 'Breaking Bad', meta: '2008', thumb: null },
    { title: 'Westworld', meta: '2016', thumb: null },
    { title: 'Duckman', meta: '1994', thumb: null },
    { title: 'BoJack Horseman', meta: '2014', thumb: null },
    { title: 'Travelers', meta: '2016', thumb: null },
    { title: 'Red Dwarf', meta: '1988', thumb: null },
  ],
};

const discoverData = [
  { name: 'Priya K.', handle: '@priya', color: 'blue', cat: 'books', items: ['Foundation', "Childhood's End", 'The Left Hand of Darkness', 'Solaris', 'Hyperion'] },
  { name: 'Marcus L.', handle: '@marcus', color: 'green', cat: 'films', items: ['Blade Runner', '2001: A Space Odyssey', 'Arrival', 'Stalker', 'Annihilation'] },
  { name: 'Sofia R.', handle: '@sofia', color: 'amber', cat: 'albums', items: ['Pet Sounds', 'OK Computer', 'Kid A', 'Selected Ambient Works', 'In Rainbows'] },
  { name: 'Tom W.', handle: '@tomw', color: 'red', cat: 'books', items: ['Neuromancer', 'Snow Crash', 'The Dispossessed', 'A Fire Upon the Deep', 'Blindsight'] },
  { name: 'Aiko S.', handle: '@aiko', color: 'blue', cat: 'tv', items: ['The Expanse', 'Westworld', 'Black Mirror', 'Battlestar Galactica', 'Severance'] },
  { name: 'Lena M.', handle: '@lena', color: 'green', cat: 'books', items: ['Dune', 'I Am Legend', 'The Stars My Destination', 'More Than Human', 'The Demolished Man'] },
  { name: 'Dev P.', handle: '@devp', color: 'amber', cat: 'films', items: ['The Thing', 'Solaris', 'Primer', 'Moon', 'Ex Machina'] },
  { name: 'Caro B.', handle: '@caro', color: 'red', cat: 'tv', items: ['Dark', 'Fringe', 'Halt and Catch Fire', 'The Leftovers', 'Station Eleven'] },
];

const matchData = [
  { name: 'Lena M.', handle: '@lena', color: 'green', score: 91, shared: ['Dune', 'I Am Legend', 'The Stars My Destination'], following: false },
  { name: 'Tom W.', handle: '@tomw', color: 'red', score: 78, shared: ['Philip K. Dick', 'Neal Stephenson', 'Hard SF'], following: false },
  { name: 'Priya K.', handle: '@priya', color: 'blue', score: 65, shared: ['Ubik', 'The Dark Forest', 'Eon'], following: true },
  { name: 'Dev P.', handle: '@devp', color: 'amber', score: 58, shared: ['Classic sci-fi', '1950s–70s era', 'Dystopia'], following: false },
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

function coverHTML(thumb, cat) {
  if (thumb) {
    return `<div class="item-cover"><img src="${thumb}" width="38" height="38" alt="" onerror="this.parentElement.innerHTML='${EMOJIS[cat]}'"/></div>`;
  }
  return `<div class="item-cover">${EMOJIS[cat]}</div>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Render: My List ───────────────────────────────────────────────────────

function renderMyList() {
  const items = lists[currentCat];
  document.getElementById('list-label').textContent = `Top 10 ${currentCat}`;

  const grid = document.getElementById('my-list');
  grid.innerHTML = items.map((item, i) => `
    <div class="list-item" draggable="true" data-idx="${i}">
      <div class="drag-handle" title="Drag to reorder">
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
      ${coverHTML(item.thumb, currentCat)}
      <div class="item-info">
        <div class="item-title">${escHtml(item.title)}</div>
        <div class="item-meta">${escHtml(item.meta)}</div>
      </div>
      <button class="item-remove" data-idx="${i}" title="Remove">×</button>
    </div>
  `).join('');

  grid.querySelectorAll('.item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      lists[currentCat].splice(+btn.dataset.idx, 1);
      renderMyList();
    });
  });

  initDrag(grid);

  const full = items.length >= 10;
  const input = document.getElementById('search-input');
  input.disabled = full;
  input.placeholder = full ? 'List is full' : 'Search to add…';
  document.getElementById('limit-note').style.display = full ? 'block' : 'none';

  updateProfileCounts();
}

// ── Drag-and-drop ─────────────────────────────────────────────────────────

// Single persistent drop-line — never re-created, just moved/removed.
const DROP_LINE = document.createElement('div');
DROP_LINE.className = 'drop-line';

let _dragIdx   = null;
let _insertPos = null;
let _committed = false; // guard against double-commit (item drop + grid drop)

function _removeLine() {
  if (DROP_LINE.parentNode) DROP_LINE.parentNode.removeChild(DROP_LINE);
}

function _showLine(grid, beforeEl) {
  if (beforeEl) grid.insertBefore(DROP_LINE, beforeEl);
  else grid.appendChild(DROP_LINE);
}

function _getItems(grid) {
  return [...grid.querySelectorAll('.list-item')];
}

function _commitDrop(grid) {
  if (_committed) return;
  _committed = true;
  _removeLine();

  if (_dragIdx !== null && _insertPos !== null) {
    const list = lists[currentCat];
    const item = list.splice(_dragIdx, 1)[0];
    const at   = _insertPos > _dragIdx ? _insertPos - 1 : _insertPos;
    list.splice(at, 0, item);
    _flipRender(grid);
  }

  _dragIdx   = null;
  _insertPos = null;
}

function _flipRender(grid) {
  // Snapshot Y positions of every item by its current data-idx
  const before = new Map(
    _getItems(grid).map(el => [+el.dataset.idx, el.getBoundingClientRect().top])
  );

  renderMyList();

  // Animate from old positions
  _getItems(grid).forEach((el, newI) => {
    const oldTop = before.get(newI);
    if (oldTop == null) return;
    const delta = oldTop - el.getBoundingClientRect().top;
    if (Math.abs(delta) < 2) return;
    el.style.transition = 'none';
    el.style.transform  = `translateY(${delta}px)`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transition = 'transform 0.22s cubic-bezier(0.25,0.46,0.45,0.94)';
      el.style.transform  = 'translateY(0)';
    }));
  });
}

function initDrag(grid) {

  // ── Mouse drag ──
  // No hold delay on desktop — native drag is intentional enough.
  // Drop-line only moves when insertPos actually changes, preventing flicker.

  grid.querySelectorAll('.list-item').forEach(el => {
    el.addEventListener('dragstart', e => {
      _dragIdx   = +el.dataset.idx;
      _insertPos = null;
      _committed = false;
      e.dataTransfer.effectAllowed = 'move';
      requestAnimationFrame(() => el.classList.add('dragging'));
    });

    el.addEventListener('dragend', () => {
      _removeLine();
      _getItems(grid).forEach(r => r.classList.remove('dragging'));
      if (!_committed) { _dragIdx = null; _insertPos = null; }
      _committed = false;
    });

    el.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const targetIdx = +el.dataset.idx;
      const rect      = el.getBoundingClientRect();
      const after     = e.clientY > rect.top + rect.height / 2;
      const newPos    = after ? targetIdx + 1 : targetIdx;
      if (newPos === _insertPos) return; // no change — skip DOM write
      _insertPos = newPos;
      const items  = _getItems(grid);
      _showLine(grid, items[after ? targetIdx + 1 : targetIdx] || null);
    });

    el.addEventListener('drop', e => {
      e.preventDefault();
      e.stopPropagation();
      _commitDrop(grid);
    });
  });

  grid.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (e.target === grid) {
      const newPos = _getItems(grid).length;
      if (newPos !== _insertPos) { _insertPos = newPos; _showLine(grid, null); }
    }
  });

  grid.addEventListener('drop', e => {
    e.preventDefault();
    _commitDrop(grid);
  });

  // ── Touch drag — 250ms hold to activate so scroll works freely ──

  let touchEl     = null;
  let touchClone  = null;
  let touchOffY   = 0;
  let touchTimer  = null;
  let touchReady  = false;
  let touchStartY = 0;

  grid.querySelectorAll('.list-item').forEach(el => {
    el.addEventListener('touchstart', e => {
      const touch = e.touches[0];
      touchStartY = touch.clientY;
      touchReady  = false;

      touchTimer = setTimeout(() => {
        touchReady = true;
        touchEl    = el;
        _dragIdx   = +el.dataset.idx;
        _insertPos = null;
        _committed = false;
        const rect = el.getBoundingClientRect();
        touchOffY  = touch.clientY - rect.top;

        touchClone = el.cloneNode(true);
        Object.assign(touchClone.style, {
          position: 'fixed', left: rect.left + 'px', top: rect.top + 'px',
          width: rect.width + 'px', zIndex: 999, pointerEvents: 'none',
          opacity: '0.85', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        });
        document.body.appendChild(touchClone);
        el.classList.add('dragging');
        navigator.vibrate?.(30);
      }, 250);
    }, { passive: true });

    el.addEventListener('touchmove', e => {
      const touch = e.touches[0];
      if (!touchReady) {
        if (Math.abs(touch.clientY - touchStartY) > 8) clearTimeout(touchTimer);
        return;
      }
      e.preventDefault();
      if (touchClone) touchClone.style.top = (touch.clientY - touchOffY) + 'px';

      touchClone.style.display = 'none';
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      touchClone.style.display = '';

      const hoverItem = target?.closest?.('.list-item');
      if (hoverItem && hoverItem !== touchEl) {
        const items  = _getItems(grid);
        const rect   = hoverItem.getBoundingClientRect();
        const after  = touch.clientY > rect.top + rect.height / 2;
        const ti     = +hoverItem.dataset.idx;
        const newPos = after ? ti + 1 : ti;
        if (newPos !== _insertPos) {
          _insertPos = newPos;
          _showLine(grid, items[after ? ti + 1 : ti] || null);
        }
      }
    }, { passive: false });

    el.addEventListener('touchend', () => {
      clearTimeout(touchTimer);
      if (!touchReady) { touchReady = false; return; }
      if (touchClone) { touchClone.remove(); touchClone = null; }
      touchEl?.classList.remove('dragging');
      touchEl = null; touchReady = false;
      _commitDrop(grid);
    });

    el.addEventListener('touchcancel', () => {
      clearTimeout(touchTimer);
      if (touchClone) { touchClone.remove(); touchClone = null; }
      touchEl?.classList.remove('dragging');
      touchEl = null; touchReady = false;
      _removeLine();
      _dragIdx = null; _insertPos = null; _committed = false;
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
    filename = `listmania-${currentCat}.json`;
    mime     = 'application/json';
  } else if (fmt === 'yaml') {
    content  = [`list: ${catLabel}`, `user: "@Rob"`, `exported: ${dateStr}`, `items:`,
      ...items.map((item, i) => `  - rank: ${i + 1}\n    title: "${item.title.replace(/"/g, '\\"')}"\n    meta: "${item.meta.replace(/"/g, '\\"')}"`)
    ].join('\n');
    filename = `listmania-${currentCat}.yaml`;
    mime     = 'text/yaml';
  } else if (fmt === 'md') {
    content  = [`# ${catLabel} — @Rob's top ${items.length}`, ``, `> Exported ${dateStr} from Listmania`, ``,
      ...items.map((item, i) => `${i + 1}. **${item.title}** — ${item.meta}`)
    ].join('\n');
    filename = `listmania-${currentCat}.md`;
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
    const res  = await fetch(`https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(query)}&type=album&fmt=json&limit=7`, { headers: { 'User-Agent': 'Listmania/1.0' } });
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
  if (!r || lists[currentCat].length >= 10) return;
  lists[currentCat].push({ title: r.title, meta: r.meta || '—', thumb: r.thumb || null });
  document.getElementById('search-input').value = '';
  searchResults = [];
  closeDropdown();
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

  renderMyList();
  renderDiscover('all');
  renderMatches();
  updateProfileCounts();
});
