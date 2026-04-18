const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');
const RUNTIME_REVIEWS_FILE = process.env.VERCEL === '1'
  ? path.join('/tmp', 'reviews.json')
  : REVIEWS_FILE;
const MIN_REVIEW_LENGTH = 10;
const MAX_REVIEW_LENGTH = 300;
const MAX_NAME_LENGTH = 80;

let writeQueue = Promise.resolve();

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeSingleLine(value, maxLength) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\u0000/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeMultiline(value, maxLength) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\u0000/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .slice(0, maxLength);
}

function normalizeDate(value) {
  const text = normalizeSingleLine(value, 20);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  return new Date().toISOString().slice(0, 10);
}

function normalizeRating(value) {
  const rating = Number.parseInt(value, 10);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw createError(400, 'Rating must be between 1 and 5.');
  }

  return rating;
}

function normalizeStoredReview(review) {
  if (!review || typeof review !== 'object') {
    return null;
  }

  const name = normalizeSingleLine(review.name, MAX_NAME_LENGTH);
  const rating = normalizeRating(review.rating);
  const text = normalizeMultiline(review.review, MAX_REVIEW_LENGTH);
  const date = normalizeDate(review.date);

  if (!name || !text || text.length < MIN_REVIEW_LENGTH) {
    return null;
  }

  return {
    name,
    rating,
    review: text,
    date,
  };
}

async function readReviewsFile() {
  const filePaths = process.env.VERCEL === '1'
    ? [RUNTIME_REVIEWS_FILE, REVIEWS_FILE]
    : [REVIEWS_FILE];

  for (const filePath of filePaths) {
    try {
      const raw = await fs.readFile(filePath, 'utf8');

      if (!raw.trim()) {
        return [];
      }

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        throw createError(500, 'reviews.json must contain an array of reviews.');
      }

      return parsed.map(normalizeStoredReview).filter(Boolean);
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        continue;
      }

      if (error instanceof SyntaxError) {
        if (process.env.VERCEL === '1' && filePath === RUNTIME_REVIEWS_FILE) {
          continue;
        }

        throw createError(500, 'reviews.json contains invalid JSON.');
      }

      throw error;
    }
  }

  return [];
}

async function writeReviewsFile(reviews) {
  if (process.env.VERCEL === '1') {
    await fs.writeFile(RUNTIME_REVIEWS_FILE, `${JSON.stringify(reviews, null, 2)}\n`, 'utf8');
    return;
  }

  await fs.mkdir(path.dirname(REVIEWS_FILE), { recursive: true });
  await fs.writeFile(REVIEWS_FILE, `${JSON.stringify(reviews, null, 2)}\n`, 'utf8');
}

function validateReviewPayload(payload) {
  const name = normalizeSingleLine(payload.name, MAX_NAME_LENGTH);
  const review = normalizeMultiline(payload.review, MAX_REVIEW_LENGTH);
  const rating = normalizeRating(payload.rating);

  if (!name) {
    throw createError(400, 'Name cannot be empty.');
  }

  if (review.length < MIN_REVIEW_LENGTH) {
    throw createError(400, 'Review must be at least 10 characters.');
  }

  if (review.length > MAX_REVIEW_LENGTH) {
    throw createError(400, 'Review must be 300 characters or less.');
  }

  return {
    name,
    rating,
    review,
    date: new Date().toISOString().slice(0, 10),
  };
}

function enqueueWrite(task) {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

async function getAllReviews() {
  return readReviewsFile();
}

async function addReview(payload) {
  const review = validateReviewPayload(payload);

  return enqueueWrite(async () => {
    const reviews = await readReviewsFile();
    reviews.unshift(review);
    await writeReviewsFile(reviews);

    return review;
  });
}

module.exports = {
  REVIEWS_FILE,
  MIN_REVIEW_LENGTH,
  MAX_REVIEW_LENGTH,
  MAX_NAME_LENGTH,
  addReview,
  createError,
  getAllReviews,
  normalizeDate,
  normalizeMultiline,
  normalizeRating,
  normalizeSingleLine,
  readReviewsFile,
  validateReviewPayload,
  writeReviewsFile,
};
