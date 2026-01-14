# MotoFit Gallery

## Overview
Motorcycle fitting gallery website - a static site with gallery API for browsing and uploading motorcycle fitting photos.

## Project Architecture
- **Backend**: Node.js with Express server
- **Frontend**: Static HTML/CSS/JavaScript
- **Entry Point**: `server.js`
- **Port**: 5000 (bound to 0.0.0.0)

## Key Files
- `server.js` - Express server serving static files and gallery API
- `index.html` - Main gallery page
- `upload.html` - Photo upload page
- `gallery.json` - Gallery data storage
- `script.js` - Frontend JavaScript
- `style.css` - Styles

## API Endpoints
- `GET /.netlify/functions/gallery` - Get gallery data
- `POST /.netlify/functions/gallery` - Update gallery data

## Running the Project
```bash
npm start
```

## Recent Changes
- 2026-01-14: Configured for Replit environment (port 5000, 0.0.0.0 binding, iframe-compatible headers)
