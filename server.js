const path = require('path');
const express = require('express');
const { handleContactSubmission } = require('./lib/contact-core');
const { addReview, getAllReviews } = require('./lib/reviews-core');

const PORT = Number(process.env.PORT || 8080);
const SITE_DIR = path.join(__dirname, 'Edito-Grapher-main');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(SITE_DIR));

function sendApiError(res, error, fallbackMessage) {
  const statusCode = Number.isInteger(error && error.statusCode) ? error.statusCode : 500;
  const message = error && error.message ? error.message : fallbackMessage;

  res.setHeader('Cache-Control', 'no-store');
  res.status(statusCode).json({
    success: false,
    error: message,
  });
}

app.post('/api/contact', async (req, res) => {
  try {
    const result = await handleContactSubmission(req.body || {});

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[local contact server] submission failed:', error);
    sendApiError(res, error, 'Failed to send message');
  }
});

async function handleGetReviews(req, res) {
  try {
    const reviews = await getAllReviews();

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(reviews);
  } catch (error) {
    console.error('[reviews api] fetch failed:', error);
    sendApiError(res, error, 'Failed to load reviews');
  }
}

async function handlePostReview(req, res) {
  try {
    const review = await addReview(req.body || {});

    res.setHeader('Cache-Control', 'no-store');
    res.status(201).json(review);
  } catch (error) {
    console.error('[reviews api] submission failed:', error);
    sendApiError(res, error, 'Failed to save review');
  }
}

['/reviews', '/api/reviews'].forEach((route) => {
  app.get(route, handleGetReviews);
  app.post(route, handlePostReview);
});

app.use((error, req, res, next) => {
  if (error && error.type === 'entity.parse.failed') {
    res.status(400).json({
      success: false,
      error: 'Invalid request body.',
    });
    return;
  }

  next(error);
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found.',
  });
});

app.listen(PORT, () => {
  console.log(`Local dev server running at http://localhost:${PORT}`);
});
