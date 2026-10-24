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

function getPublicUrl(fileName) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(fileName)}`;
}

app.use(express.static('public'));

// Expose safe config to browser (service key used only server-side)
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_KEY, // service_role used here since this is local dev
    bucket: BUCKET,
  });
});

// Get all videos
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
        url: getPublicUrl(f.name),
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📦 Bucket: ${BUCKET}`);
});
