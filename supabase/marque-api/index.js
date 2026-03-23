require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Auth middleware ───────────────────────────────────────────────────────

const SUPABASE_JWK = {
  "x": "WqCI10o7EqQMyEzlpcupVol7M2ozhnBlVbTdtDEZWS0",
  "y": "JVbvqBci-k7Ju1zRzUUy5l71975gnQoVhHdUZ_yLlVk",
  "alg": "ES256",
  "crv": "P-256",
  "kty": "EC",
  "key_ops": ["verify"]
};

const SUPABASE_PUBLIC_KEY = crypto.createPublicKey({ key: SUPABASE_JWK, format: 'jwk' });

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, SUPABASE_PUBLIC_KEY, { algorithms: ['ES256'] });
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT verify failed:', err.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.use(authMiddleware);

// ── Helpers ──────────────────────────────────────────────────────────────

async function getAuthUser(req) {
  if (!req.user) return null;
  const { data } = await supabase
    .from('users')
    .select('id, handle, display_name, email, avatar_color')
    .eq('auth_id', req.user.sub)
    .single();
  return data;
}

// ── User endpoints ───────────────────────────────────────────────────────

// Get current logged-in user
app.get('/api/me', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });

  const user = await getAuthUser(req);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Create user profile after signup
app.post('/api/users', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });

  const { handle, display_name } = req.body;
  if (!handle || !display_name) {
    return res.status(400).json({ error: 'handle and display_name required' });
  }

  if (!/^[a-z0-9_]{3,20}$/.test(handle)) {
    return res.status(400).json({ error: 'Handle must be 3-20 lowercase letters, numbers, or underscores' });
  }

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

// ── List endpoints ───────────────────────────────────────────────────────

// Get all lists for a user (respects public/private visibility)
app.get('/api/lists/:handle', async (req, res) => {
  const { handle } = req.params;

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('handle', handle)
    .single();

  if (!user) return res.status(404).json({ error: 'User not found' });

  // Check if requester is the owner
  const authUser = await getAuthUser(req);
  const isOwner = authUser && authUser.handle === handle;

  let query = supabase
    .from('lists')
    .select('category, position, title, meta, thumb, source, source_id, public')
    .eq('user_id', user.id)
    .order('category')
    .order('position');

  // If not the owner, only show public lists
  if (!isOwner) {
    query = query.eq('public', true);
  }

  const { data: lists, error } = await query;

  if (error) return res.status(500).json({ error: error.message });

  const grouped = {};
  lists.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push({
      title: item.title,
      meta: item.meta,
      thumb: item.thumb,
      source: item.source,
      source_id: item.source_id,
      public: item.public
    });
  });

  res.json(grouped);
});

// Replace an entire category list for a user
app.put('/api/lists/:handle/:category', async (req, res) => {
  const { handle, category } = req.params;
  const items = req.body;

  // Auth check
  const authUser = await getAuthUser(req);
  if (!authUser || authUser.handle !== handle) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('handle', handle)
    .single();

  if (!user) return res.status(404).json({ error: 'User not found' });

  // Get current visibility setting before deleting
  const { data: existing } = await supabase
    .from('lists')
    .select('public')
    .eq('user_id', user.id)
    .eq('category', category)
    .limit(1);

  const isPublic = existing?.[0]?.public || false;

  // Delete existing items for this category
  await supabase
    .from('lists')
    .delete()
    .eq('user_id', user.id)
    .eq('category', category);

  // Insert new items with positions
  const rows = items.map((item, i) => ({
    user_id: user.id,
    category,
    position: i,
    title: item.title,
    meta: item.meta || null,
    thumb: item.thumb || null,
    source: item.source || null,
    source_id: item.source_id || null,
    public: isPublic
  }));

  if (rows.length > 0) {
    const { error } = await supabase.from('lists').insert(rows);
    if (error) return res.status(500).json({ error: error.message });
  }

  res.json({ ok: true });
});

// Delete a single item
app.delete('/api/lists/:handle/:category/:position', async (req, res) => {
  const { handle, category, position } = req.params;

  // Auth check
  const authUser = await getAuthUser(req);
  if (!authUser || authUser.handle !== handle) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('handle', handle)
    .single();

  if (!user) return res.status(404).json({ error: 'User not found' });

  const { error } = await supabase
    .from('lists')
    .delete()
    .eq('user_id', user.id)
    .eq('category', category)
    .eq('position', parseInt(position));

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// Toggle visibility for a category
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

// ── Start ────────────────────────────────────────────────────────────────

app.listen(process.env.PORT, () => {
  console.log(`Marque API running on port ${process.env.PORT}`);
});
