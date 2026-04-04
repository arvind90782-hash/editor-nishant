const { createError, handleContactSubmission } = require('../lib/contact-core');

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

module.exports = async function contactHandler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      success: false,
      error: 'Method not allowed.',
    });
  }

  try {
    const body = await readRequestBody(req);
    const result = await handleContactSubmission(body);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[nested contact api] submission failed:', error);
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Failed to send message';

    return res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
};
