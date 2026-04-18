const {
  addReview,
  createError,
  getAllReviews,
  removeReview,
} = require('../lib/reviews-core');

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

function sendApiError(res, error, fallbackMessage) {
  const statusCode = Number.isInteger(error && error.statusCode) ? error.statusCode : 500;
  const message = error && error.message ? error.message : fallbackMessage;

  return res.status(statusCode).json({
    success: false,
    error: message,
  });
}

module.exports = async function reviewsHandler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method === 'GET') {
      const reviews = await getAllReviews();

      return res.status(200).json(reviews);
    }

    if (req.method === 'POST') {
      const body = await readRequestBody(req);
      const review = await addReview(body || {});

      return res.status(201).json({
        success: true,
        review,
      });
    }

    if (req.method === 'DELETE') {
      const body = await readRequestBody(req);
      const payload = {
        ...(req.query || {}),
        ...(body || {}),
      };
      const deletedCount = await removeReview(payload);

      if (!deletedCount) {
        return res.status(404).json({
          success: false,
          error: 'Review not found.',
        });
      }

      return res.status(200).json({
        success: true,
        deletedCount,
      });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({
      success: false,
      error: 'Method not allowed.',
    });
  } catch (error) {
    console.error('[reviews api] request failed:', error);
    const fallbackMessage =
      req.method === 'GET'
        ? 'Failed to load reviews'
        : req.method === 'DELETE'
          ? 'Failed to delete review'
          : 'Failed to save review';

    return sendApiError(res, error, fallbackMessage);
  }
};
