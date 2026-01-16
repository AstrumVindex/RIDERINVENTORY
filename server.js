const express = require('express');
const fs = require('fs');
const path = require('path');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Security middleware with custom CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.cloudinary.com"],
      imgSrc: ["'self'", "https://res.cloudinary.com", "https://images.unsplash.com", "data:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "data:"],
      upgradeInsecureRequests: []
    }
  }
}));

// Enable CORS with specific origin
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Enable compression
app.use(compression());

app.use(express.json());

// Set security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

const galleryPath = path.join(__dirname, 'gallery.json');

// Handle CORS preflight OPTIONS request for gallery endpoint
app.options('/.netlify/functions/gallery', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendStatus(204);
});

// Netlify-style function endpoint compatibility - NO CACHING
app.get('/.netlify/functions/gallery', (req, res) => {
  try {
    const data = fs.readFileSync(galleryPath, 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.status(200).send(data);
  } catch (err) {
    console.error('Failed to read gallery.json:', err);
    return res.status(500).json({ error: 'Failed to read gallery data.', details: err.message });
  }
});

app.post('/.netlify/functions/gallery', (req, res) => {
  try {
    const body = req.body;
    fs.writeFileSync(galleryPath, JSON.stringify(body, null, 2));
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Failed to write gallery.json:', err);
    return res.status(500).json({ error: 'Failed to save gallery data.', details: err.message });
  }
});

// Serve static site from project root with caching (but NOT gallery.json)
app.use(express.static(path.join(__dirname), {
  maxAge: '1d',
  etag: true,
  setHeaders: (res, path) => {
    // Don't cache gallery.json or other JSON files
    if (path.endsWith('gallery.json') || path.endsWith('.json')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Fallback for single-page app routes to serve index.html
app.get('*', (req, res, next) => {
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

const port = 5000;
const host = '0.0.0.0';
const server = app.listen(port, host, () => {
  console.log(`Server started on ${host}:${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
