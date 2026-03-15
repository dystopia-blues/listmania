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
    { title: '2001: A Space Odyssey', meta: 'Kubrick · 1968', thumb: null },
    { title: 'Mulholland Drive', meta: 'Lynch · 2001', thumb: null },
    { title: 'Yi Yi', meta: 'Edward Yang · 2000', thumb: null },
    { title: 'Certified Copy', meta: 'Kiarostami · 2010', thumb: null },
    { title: 'The Tree of Life', meta: 'Malick · 2011', thumb: null },
  ],
  albums: [
    { title: 'In the Aeroplane Over the Sea', meta: 'Neutral Milk Hotel · 1998', thumb: null },
    { title: 'Carrie & Lowell', meta: 'Sufjan Stevens · 2015', thumb: null },
    { title: 'OK Computer', meta: 'Radiohead · 1997', thumb: null },
    { title: 'Blue', meta: 'Joni Mitchell · 1971', thumb: null },
    { title: 'Illinois', meta: 'Sufjan Stevens · 2005', thumb: null },
    { title: 'For Emma, Forever Ago', meta: 'Bon Iver · 2008', thumb: null },
    { title: 'Blood on the Tracks', meta: 'Bob Dylan · 1975', thumb: null },
    { title: 'The Suburbs', meta: 'Arcade Fire · 2010', thumb: null },
    { title: 'Funeral', meta: 'Arcade Fire · 2004', thumb: null },
    { title: 'A Moon Shaped Pool', meta: 'Radiohead · 2016', thumb: null },
  ],
  tv: [
    { title: 'The Wire', meta: 'HBO · 2002–2008', thumb: null },
    { title: 'Twin Peaks', meta: 'Lynch · 1990–1991', thumb: null },
    { title: 'Mad Men', meta: 'AMC · 2007–2015', thumb: null },
    { title: 'Deadwood', meta: 'HBO · 2004–2006', thumb: null },
    { title: 'Succession', meta: 'HBO · 2018–2023', thumb: null },
  ],
};

const discoverData = [
  { name: 'Priya K.', handle: '@priya', color: 'blue', cat: 'books', items: ['Foundation', 'Childhood\'s End', 'The Left Hand of Darkness', 'Solaris', 'Hyperion'] },
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

// Colour tokens for avatars (works light + dark)
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

function coverHTML(thumb, cat, size = 38) {
  if (thumb) {
    return `<div class="item-cover"><img src="${thumb}" width="${size}" height="${size}" alt="" onerror="this.parentElement.innerHTML='${EMOJIS[cat]}'"/></div>`;
  }
  return `<div class="item-cover">${EMOJIS[cat]}</div>`;
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

  // Remove buttons
  grid.querySelectorAll('.item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      lists[currentCat].splice(+btn.dataset.idx, 1);
      renderMyList();
    });
  });

  // Drag-and-drop
  initDrag(grid);

  const full = items.length >= 10;
  const input = document.getElementById('search-input');
  input.disabled = full;
  input.placeholder = full ? 'List is full' : 'Search to add…';
  document.getElementById('limit-note').style.display = full ? 'block' : 'none';

  updateProfileCounts();
}

// ── Drag-and-drop ─────────────────────────────────────────────────────────

function initDrag(grid) {
  let dragIdx = null;
  let overIdx = null;

  grid.querySelectorAll('.list-item').forEach(el => {
    el.addEventListener('dragstart', e => {
      dragIdx = +el.dataset.idx;
      e.dataTransfer.effectAllowed = 'move';
      // Delay adding class so the drag ghost renders cleanly
      requestAnimationFrame(() => el.classList.add('dragging'));
    });

    el.addEventListener('dragend', () => {
      grid.querySelectorAll('.list-item').forEach(r => {
        r.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
      });
      dragIdx = null;
      overIdx = null;
    });

    el.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const targetIdx = +el.dataset.idx;
      if (targetIdx === dragIdx) return;

      // Determine top or bottom half
      const rect = el.getBoundingClientRect();
      const mid  = rect.top + rect.height / 2;
      const half = e.clientY < mid ? 'top' : 'bottom';

      grid.querySelectorAll('.list-item').forEach(r => r.classList.remove('drag-over-top', 'drag-over-bottom'));
      el.classList.add(half === 'top' ? 'drag-over-top' : 'drag-over-bottom');
      overIdx = half === 'top' ? targetIdx : targetIdx + 1;
    });

    el.addEventListener('dragleave', () => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    el.addEventListener('drop', e => {
      e.preventDefault();
      if (dragIdx === null || overIdx === null) return;

      const list = lists[currentCat];
      const item = list.splice(dragIdx, 1)[0];
      // Adjust insert index after removal
      const insertAt = overIdx > dragIdx ? overIdx - 1 : overIdx;
      list.splice(insertAt, 0, item);

      renderMyList();
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

// ── Search / Autocomplete ─────────────────────────────────────────────────

async function searchAPI(query, cat) {
  if (cat === 'books') {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=7&fields=title,author_name,first_publish_year,cover_i`
    );
    const data = await res.json();
    return (data.docs || []).map(d => ({
      title: d.title,
      meta: [d.author_name?.[0], d.first_publish_year].filter(Boolean).join(' · '),
      thumb: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-S.jpg` : null,
      source: 'Open Library',
    }));
  }

  if (cat === 'films' || cat === 'tv') {
    const type = cat === 'films' ? 'movie' : 'tv';
    const res = await fetch(
      `https://api.themoviedb.org/3/search/${type}?api_key=2dca580c2a14b55200e784d157207b4d&query=${encodeURIComponent(query)}&page=1`
    );
    const data = await res.json();
    return (data.results || []).slice(0, 7).map(d => ({
      title: d.title || d.name,
      meta: (d.release_date || d.first_air_date || '').slice(0, 4),
      thumb: d.poster_path ? `https://image.tmdb.org/t/p/w92${d.poster_path}` : null,
      source: 'TMDB',
    }));
  }

  if (cat === 'albums') {
    const res = await fetch(
      `https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(query)}&type=album&fmt=json&limit=7`,
      { headers: { 'User-Agent': 'Listmania/1.0 (prototype)' } }
    );
    const data = await res.json();
    return (data['release-groups'] || []).slice(0, 7).map(d => ({
      title: d.title,
      meta: [d['artist-credit']?.[0]?.name, (d['first-release-date'] || '').slice(0, 4)].filter(Boolean).join(' · '),
      thumb: null,
      source: 'MusicBrainz',
    }));
  }

  return [];
}

function renderDropdown(results) {
  const ac = document.getElementById('autocomplete');
  focusedIdx = -1;

  if (!results.length) {
    ac.innerHTML = `<div class="ac-empty">No results found</div>`;
    ac.classList.add('open');
    return;
  }

  ac.innerHTML = results.map((r, i) => `
    <div class="ac-item" data-idx="${i}">
      <div class="ac-thumb">
        ${r.thumb
          ? `<img src="${r.thumb}" alt="" onerror="this.parentElement.innerHTML='${EMOJIS[currentCat]}'"/>`
          : EMOJIS[currentCat]}
      </div>
      <div style="min-width:0;flex:1">
        <div class="ac-title">${escHtml(r.title)}</div>
        ${r.meta ? `<div class="ac-meta">${escHtml(r.meta)}</div>` : ''}
        <div class="ac-source">${r.source}</div>
      </div>
    </div>
  `).join('');

  ac.querySelectorAll('.ac-item').forEach(el => {
    el.addEventListener('mousedown', e => {
      e.preventDefault();
      selectResult(+el.dataset.idx);
    });
  });

  ac.classList.add('open');
}

function closeDropdown() {
  document.getElementById('autocomplete').classList.remove('open');
  focusedIdx = -1;
}

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

// ── Export ────────────────────────────────────────────────────────────────

function exportList(fmt) {
  const items = lists[currentCat];
  const catLabel = currentCat.charAt(0).toUpperCase() + currentCat.slice(1);
  let content, filename, mime;

  if (fmt === 'json') {
    const payload = {
      list: catLabel,
      user: '@Rob',
      exported: new Date().toISOString().slice(0, 10),
      items: items.map((item, i) => ({ rank: i + 1, title: item.title, meta: item.meta })),
    };
    content  = JSON.stringify(payload, null, 2);
    filename = `listmania-${currentCat}.json`;
    mime     = 'application/json';
  }

  else if (fmt === 'yaml') {
    const lines = [
      `list: ${catLabel}`,
      `user: "@Rob"`,
      `exported: ${new Date().toISOString().slice(0, 10)}`,
      `items:`,
      ...items.map((item, i) =>
        `  - rank: ${i + 1}\n    title: "${item.title.replace(/"/g, '\\"')}"\n    meta: "${item.meta.replace(/"/g, '\\"')}"`
      ),
    ];
    content  = lines.join('\n');
    filename = `listmania-${currentCat}.yaml`;
    mime     = 'text/yaml';
  }

  else if (fmt === 'md') {
    const lines = [
      `# ${catLabel} — @Rob's top ${items.length}`,
      ``,
      `> Exported ${new Date().toISOString().slice(0, 10)} from Listmania`,
      ``,
      ...items.map((item, i) => `${i + 1}. **${item.title}** — ${item.meta}`),
    ];
    content  = lines.join('\n');
    filename = `listmania-${currentCat}.md`;
    mime     = 'text/markdown';
  }

  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}



function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('view-' + id).classList.add('active');
  document.querySelector(`.nav-item[data-view="${id}"]`).classList.add('active');
}

// ── Escape HTML ───────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Init ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  // Export button
  const exportBtn  = document.getElementById('export-btn');
  const exportMenu = document.getElementById('export-menu');

  exportBtn.addEventListener('click', e => {
    e.stopPropagation();
    const open = exportMenu.classList.toggle('open');
    exportBtn.classList.toggle('open', open);
  });

  exportMenu.querySelectorAll('.export-option').forEach(opt => {
    opt.addEventListener('click', () => {
      exportList(opt.dataset.fmt);
      exportMenu.classList.remove('open');
      exportBtn.classList.remove('open');
    });
  });

  document.addEventListener('click', e => {
    if (!document.getElementById('export-wrap').contains(e.target)) {
      exportMenu.classList.remove('open');
      exportBtn.classList.remove('open');
    }
  });

  // Nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => showView(el.dataset.view));
  });

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

  // Search input
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
      } catch (err) {
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
    if (e.key === 'ArrowDown') { e.preventDefault(); focusedIdx = Math.min(focusedIdx + 1, items.length - 1); setFocus(items); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusedIdx = Math.max(focusedIdx - 1, 0); setFocus(items); }
    else if (e.key === 'Enter') { if (focusedIdx >= 0) selectResult(focusedIdx); }
    else if (e.key === 'Escape') closeDropdown();
  });

  searchInput.addEventListener('focus', () => {
    if (searchResults.length) document.getElementById('autocomplete').classList.add('open');
  });

  // Close dropdown on outside click
  document.addEventListener('click', e => {
    if (!document.getElementById('add-area').contains(e.target)) closeDropdown();
  });

  // Initial renders
  renderMyList();
  renderDiscover('all');
  renderMatches();
  updateProfileCounts();
});
