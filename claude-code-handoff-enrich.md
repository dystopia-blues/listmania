# Claude Code Handoff: Metadata Enrichment Script

## Date: March 20, 2026

## Context

The Marque.ink API has been seeded with Rob's lists, but the metadata is incomplete — books have just author names without years, albums are missing artist/year, and there are no source API IDs stored. We need a script that looks up each item against its source API, pulls back rich metadata, and outputs the results for Rob to review before committing to the database.

This script runs **locally** on Rob's Linux machine, not on the droplet.

## Goal

Build a Node script (`enrich-metadata.js`) that:

1. Reads Rob's current lists from the live API (`GET https://marque.ink/api/lists/rob`)
2. For each item, queries the appropriate source API to find the best match
3. Outputs an enriched JSON file (`enriched-lists.json`) for Rob to review
4. After Rob approves (with manual edits if needed), a second script (`push-enriched.js`) sends the enriched data back to the API via PUT

## Source APIs

### Films & TV → TMDB
- API docs: https://developer.themoviedb.org/reference
- Search films: `GET https://api.themoviedb.org/3/search/movie?query={title}&year={year}`
- Search TV: `GET https://api.themoviedb.org/3/search/tv?query={title}&first_air_date_year={year}`
- Auth: Bearer token in header. The TMDB API key is already used in the frontend — Rob will need to provide it as an env var `TMDB_API_KEY`
- Pull back: `id` (tmdb_id), `title`, `release_date` (year), `poster_path` (for thumb URL)
- Thumb URL format: `https://image.tmdb.org/t/p/w92/{poster_path}`

### Books → Open Library
- Search: `GET https://openlibrary.org/search.json?title={title}&author={author}&limit=3`
- No auth needed
- Pull back: `key` (Open Library work ID, e.g. `/works/OL12345W`), `isbn` (from `isbn` array, pick first), `first_publish_year`, `author_name`
- Thumb URL format: `https://covers.openlibrary.org/b/isbn/{isbn}-M.jpg`
- The current `meta` field has just the author name. Use it as the `author` search param to narrow results.

### Albums → MusicBrainz
- Search: `GET https://musicbrainz.org/ws/2/release-group/?query=releasegroup:{title} AND artist:{artist}&fmt=json&limit=3`
- No auth needed, but requires a `User-Agent` header: `MarqueInk/1.0 (rob.larkin@gmail.com)`
- MusicBrainz rate limits to 1 request per second — add a delay between requests
- Pull back: `id` (MusicBrainz release-group ID), `title`, `first-release-date` (year), `artist-credit[0].name`
- Cover art: `https://coverartarchive.org/release-group/{id}/front-250` (may 404 — check availability)
- **IMPORTANT**: The current meta field has just the artist name. Use it to search. Be careful with compilation/cover albums — match on artist name, not just title.

## Database schema update

Before running the enrichment, update the Supabase schema. Run this in the Supabase SQL Editor:

```sql
ALTER TABLE lists ADD COLUMN source TEXT;
ALTER TABLE lists ADD COLUMN source_id TEXT;
```

Where:
- `source` = `'tmdb'`, `'openlibrary'`, or `'musicbrainz'`
- `source_id` = the ID from that API (string — TMDB IDs are numeric but store as text for consistency)

## API update needed

The Express API (`~/marque-api/index.js` on the droplet) needs to handle the new fields. Update the PUT endpoint to accept and store `source` and `source_id`, and the GET endpoint to return them.

**This is a server-side change on the droplet — Rob will need to SSH in and edit `~/marque-api/index.js` with vi. Or, if preferred, output a replacement `index.js` that Rob can scp to the droplet.**

Updated row shape for PUT:
```json
{
  "title": "Dune",
  "meta": "Frank Herbert · 1965",
  "thumb": "https://covers.openlibrary.org/b/isbn/9780441172719-M.jpg",
  "source": "openlibrary",
  "source_id": "/works/OL893415W"
}
```

## Script 1: enrich-metadata.js

### Setup
```bash
mkdir ~/marque-enrich && cd ~/marque-enrich
npm init -y
npm install node-fetch
```

Note: Rob's local machine has Node installed. Use `node-fetch` for HTTP requests (or native fetch if Node 20+).

### Behavior

1. Fetch current lists from `https://marque.ink/api/lists/rob`
2. For each category, iterate items and query the source API
3. For each item, pick the best match (first result is usually right, but log alternatives)
4. Build an enriched object with this shape per item:

```json
{
  "title": "Dune",
  "meta": "Frank Herbert · 1965",
  "thumb": "https://covers.openlibrary.org/b/isbn/9780441172719-M.jpg",
  "source": "openlibrary",
  "source_id": "/works/OL893415W",
  "_candidates": [
    {"title": "Dune", "author": "Frank Herbert", "year": 1965, "id": "/works/OL893415W"},
    {"title": "Dune Messiah", "author": "Frank Herbert", "year": 1969, "id": "/works/OL893416W"}
  ]
}
```

The `_candidates` field is for Rob's review — shows what alternatives the API returned so he can spot mismatches (like Haken vs Citizen Cope). This field gets stripped before pushing to the database.

5. Write the full result to `enriched-lists.json`, pretty-printed
6. Print a summary to stdout:

```
Films: 20 items, 20 matched, 0 unmatched
Books: 22 items, 21 matched, 1 unmatched
  ⚠ "Fall; or Dodge in Hell" — no confident match, review manually
Albums: 7 items, 7 matched, 0 unmatched
TV: 8 items, 8 matched, 0 unmatched

Review enriched-lists.json, then run: node push-enriched.js
```

### Meta format by category

- **Books**: `"{author} · {first_publish_year}"` — e.g. `"Frank Herbert · 1965"`
- **Films**: `"{release_year}"` — e.g. `"1987"` (keep it simple, same as current)
- **TV**: `"{first_air_year}"` — e.g. `"2002"`
- **Albums**: `"{artist} · {first_release_year}"` — e.g. `"Citizen Cope · 2011"`

### Rate limiting

- TMDB: no hard rate limit but be polite — 200ms delay between requests
- Open Library: no rate limit but add 200ms delay
- MusicBrainz: strict 1 request/second — use 1100ms delay to be safe

### Error handling

- If an API returns no results for an item, set `source` and `source_id` to `null`, keep the original `meta` and `thumb`, and flag it in the summary output
- If an API request fails (network error, 429, etc.), retry once after 2 seconds, then skip and flag
- Never crash the whole script on a single item failure

## Script 2: push-enriched.js

### Behavior

1. Read `enriched-lists.json`
2. Strip `_candidates` from every item
3. For each category, PUT to `https://marque.ink/api/lists/rob/{category}`
4. Print confirmation per category

```
Pushed films: 20 items → ok
Pushed books: 22 items → ok
Pushed albums: 7 items → ok
Pushed tv: 8 items → ok
```

## Known edge cases

- **"Dune" appears in both books and films** — different source APIs, different source_ids. This is fine.
- **"Fall; or Dodge in Hell"** — the semicolon in the title may trip up search. Try searching with and without it.
- **"What Up Dog?"** — question mark in title. URL-encode properly.
- **"Every Waking Moment"** — this is by **Citizen Cope** (2011), NOT Haken. If MusicBrainz returns Haken first, the candidates list will let Rob catch it.
- **"GoodFellas"** — may appear as "Goodfellas" in TMDB. Match should still work.
- **"Lock Stock and Two Smoking Barrels"** — long title, should still match.
- **"Dune (2021)" and "Dune: Part Two"** — the year in the current title helps disambiguation. Strip the "(2021)" from the search query but use it as the year filter.
- **"Led Zeppelin IV"** — officially untitled album, often listed under various names. MusicBrainz should have it. Also try searching "Led Zeppelin IV" and "Led Zeppelin - IV".

## File locations

- Script lives in: `~/marque-enrich/` (local machine)
- Output: `~/marque-enrich/enriched-lists.json`
- Rob's env var for TMDB: `export TMDB_API_KEY=xxx` (Rob provides this)

## After completion

Once the enriched data is pushed:
1. Verify via `curl https://marque.ink/api/lists/rob` — all items should have `source`, `source_id`, and richer `meta`
2. Refresh `https://marque.ink` — lists should render with correct metadata and cover art
3. Update CLAUDE.md to reflect the new data model (add `source` and `source_id` to the data model section, mark the metadata enrichment as done in the to-do list)
