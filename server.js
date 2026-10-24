require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET || 'videos';

const HEADERS = {
  Authorization: `Bearer ${SUPABASE_KEY}`,
  apikey: SUPABASE_KEY,
};

app.use(express.static(path.join(__dirname, 'public')));

// Config for browser TUS upload
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_KEY,
    bucket: BUCKET,
  });
});

// List all videos
app.get('/api/videos', async (req, res) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`,
      {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: '', limit: 1000, sortBy: { column: 'created_at', order: 'desc' } }),
      }
    );
    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.message || 'Failed to list videos' });

    const videos = data
      .filter((f) => f.name && f.name.match(/\.(mp4|webm|mov|avi|mkv)$/i))
      .map((f) => ({
        name: f.name,
        url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(f.name)}`,
        created_at: f.created_at,
        size: f.metadata?.size,
      }));

    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/videos', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'videos.html'));
});

// Local dev only
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 http://localhost:${PORT}`);
    console.log(`SUPABASE_URL: ${SUPABASE_URL ? '✅' : '❌ MISSING'}`);
    console.log(`SUPABASE_KEY: ${SUPABASE_KEY ? '✅' : '❌ MISSING'}`);
  });
}

module.exports = app;
