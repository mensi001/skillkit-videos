if (process.env.NODE_ENV !== 'production') require('dotenv').config();
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

app.use(express.static(path.join(__dirname, 'public')));

// Expose config to browser (Cloudinary upload + Supabase listing)
app.get('/api/config', (req, res) => {
  res.json({
    // Supabase — for listing videos
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_KEY,
    bucket: BUCKET,
    // Cloudinary — for uploading (unsigned, safe to expose)
    cloudinaryCloud: process.env.CLOUDINARY_CLOUD_NAME,
    cloudinaryPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
  });
});

// Get all videos from Cloudinary
app.get('/api/videos', async (req, res) => {
  try {
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloud}/resources/video?max_results=100&direction=-1`,
      {
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
        }
      }
    );
    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'Failed to list videos' });

    const videos = (data.resources || []).map(v => ({
      name: v.public_id.split('/').pop() + '.' + v.format,
      url: v.secure_url,
      created_at: v.created_at,
      size: v.bytes,
    }));

    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/videos', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'videos.html'));
});

// Local dev
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📦 Bucket: ${BUCKET}`);
  });
}

module.exports = app;
