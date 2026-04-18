const { addReview, createError, getAllReviews } = require('../lib/reviews-core');

async function readRequestBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      throw createError(400, 'Invalid request body.');
    }
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();

  if (!raw) {
    return {};
  }

  const contentType = String(req.headers['content-type'] || '').toLowerCase();

  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(raw));
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw createError(400, 'Invalid request body.');
  }
}

module.exports = async function reviewsHandler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    try {
      const reviews = await getAllReviews();

      return res.status(200).json(reviews);
    } catch (error) {
      console.error('[reviews api] fetch failed:', error);
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to load reviews';

      return res.status(statusCode).json({
        success: false,
        error: message,
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      const review = await addReview(body);

      return res.status(201).json(review);
    } catch (error) {
      console.error('[reviews api] submission failed:', error);
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Failed to save review';

      return res.status(statusCode).json({
        success: false,
        error: message,
      });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({
    success: false,
    error: 'Method not allowed.',
  });
};
