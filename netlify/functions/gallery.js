const fs = require('fs');
const path = require('path');

const galleryPath = path.join(__dirname, '../../gallery.json');

exports.handler = async function(event, context) {
  if (event.httpMethod === 'GET') {
    // Read gallery.json and return contents
    try {
      const data = fs.readFileSync(galleryPath, 'utf8');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: data
      };
    } catch (err) {
      console.error('Failed to read gallery.json:', err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to read gallery data.', details: err.message, stack: err.stack })
      };
    }
  } else if (event.httpMethod === 'POST') {
    // Save new gallery data
    try {
      const body = JSON.parse(event.body);
      fs.writeFileSync(galleryPath, JSON.stringify(body, null, 2));
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true })
      };
    } catch (err) {
      console.error('Failed to write gallery.json:', err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to save gallery data.', details: err.message, stack: err.stack })
      };
    }
  } else {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }
};
