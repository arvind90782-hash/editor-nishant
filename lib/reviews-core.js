const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const { neon } = require('@neondatabase/serverless');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SEED_REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');
const LOCAL_REVIEWS_FILE = path.join(DATA_DIR, 'reviews.local.json');
const MIN_REVIEW_LENGTH = 10;
const MAX_REVIEW_LENGTH = 300;
const MAX_NAME_LENGTH = 80;
const DB_SEED_KEY = 'reviews_seeded_v1';

let writeQueue = Promise.resolve();
let dbClient = null;
let dbInitPromise = null;

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

function normalizeStoredReview(review, index = 0) {
  if (!review || typeof review !== 'object') {
    return null;
  }

  const id = normalizeSingleLine(review.id, 80) || `seed-${index + 1}`;
  const name = normalizeSingleLine(review.name, MAX_NAME_LENGTH);
  const rating = normalizeRating(review.rating);
  const text = normalizeMultiline(review.review, MAX_REVIEW_LENGTH);
  const date = normalizeDate(review.date);

  if (!name || !text || text.length < MIN_REVIEW_LENGTH) {
    return null;
  }

  return {
    id,
    name,
    rating,
    review: text,
    date,
  };
}

function normalizeReviewId(value) {
  const id = normalizeSingleLine(value, 80);

  if (!id) {
    throw createError(400, 'Review id is required.');
  }

  return id;
}

function normalizeReviewDeleteTarget(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const id = normalizeSingleLine(value.id ?? value.reviewId, 80);
    const name = normalizeSingleLine(value.name ?? value.reviewName, MAX_NAME_LENGTH);

    if (id) {
      return { id, name: '' };
    }

    if (name) {
      return { id: '', name };
    }
  }

  if (typeof value === 'string') {
    const id = normalizeSingleLine(value, 80);

    if (id) {
      return { id, name: '' };
    }
  }

  throw createError(400, 'Review id or name is required.');
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

function getDatabaseUrl() {
  return normalizeSingleLine(
    process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING,
    2000
  );
}

function getSqlClient() {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    return null;
  }

  if (!dbClient) {
    dbClient = neon(databaseUrl);
  }

  return dbClient;
}

async function readJsonReviewFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');

  if (!raw.trim()) {
    return [];
  }

  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw createError(500, 'reviews.json must contain an array of reviews.');
  }

  return parsed
    .map((review, index) => normalizeStoredReview(review, index))
    .filter(Boolean);
}

async function readSeedReviewsFile() {
  try {
    return await readJsonReviewFile(SEED_REVIEWS_FILE);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }

    if (error instanceof SyntaxError) {
      throw createError(500, 'reviews.json contains invalid JSON.');
    }

    throw error;
  }
}

async function readLocalReviewsFile() {
  try {
    return await readJsonReviewFile(LOCAL_REVIEWS_FILE);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return readSeedReviewsFile();
    }

    if (error instanceof SyntaxError) {
      throw createError(500, 'reviews.json contains invalid JSON.');
    }

    throw error;
  }
}

async function writeLocalReviewsFile(reviews) {
  await fs.mkdir(path.dirname(LOCAL_REVIEWS_FILE), { recursive: true });
  await fs.writeFile(LOCAL_REVIEWS_FILE, `${JSON.stringify(reviews, null, 2)}\n`, 'utf8');
}

async function ensureDatabase() {
  const sql = getSqlClient();

  if (!sql) {
    return null;
  }

  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS reviews (
          id text PRIMARY KEY,
          name text NOT NULL,
          rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
          review text NOT NULL,
          review_date text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS review_metadata (
          key text PRIMARY KEY,
          value text NOT NULL
        )
      `;

      const seededRows = await sql`
        SELECT value
        FROM review_metadata
        WHERE key = ${DB_SEED_KEY}
        LIMIT 1
      `;

      if (seededRows.length) {
        return;
      }

      const countRows = await sql`
        SELECT COUNT(*)::int AS count
        FROM reviews
      `;
      const reviewCount = Number(countRows[0] && countRows[0].count ? countRows[0].count : 0);

      if (reviewCount === 0) {
        const seedReviews = await readSeedReviewsFile();

        for (const review of seedReviews) {
          await sql`
            INSERT INTO reviews (id, name, rating, review, review_date)
            VALUES (${review.id}, ${review.name}, ${review.rating}, ${review.review}, ${review.date})
            ON CONFLICT (id) DO NOTHING
          `;
        }
      }

      await sql`
        INSERT INTO review_metadata (key, value)
        VALUES (${DB_SEED_KEY}, 'true')
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `;
    })().catch((error) => {
      dbInitPromise = null;
      throw error;
    });
  }

  return dbInitPromise;
}

function mapDbReview(row) {
  return normalizeStoredReview({
    id: row.id,
    name: row.name,
    rating: row.rating,
    review: row.review,
    date: row.review_date,
  });
}

async function getAllReviews() {
  const sql = getSqlClient();

  if (!sql) {
    return readLocalReviewsFile();
  }

  await ensureDatabase();

  const rows = await sql`
    SELECT id, name, rating, review, review_date
    FROM reviews
    ORDER BY created_at DESC, id DESC
  `;

  return rows.map(mapDbReview).filter(Boolean);
}

async function addReview(payload) {
  const review = validateReviewPayload(payload);
  const id = randomUUID();

  const sql = getSqlClient();

  if (!sql) {
    return enqueueWrite(async () => {
      const reviews = await readLocalReviewsFile();
      const storedReview = {
        id,
        ...review,
      };

      reviews.unshift(storedReview);
      await writeLocalReviewsFile(reviews);

      return storedReview;
    });
  }

  await ensureDatabase();

  await sql`
    INSERT INTO reviews (id, name, rating, review, review_date)
    VALUES (${id}, ${review.name}, ${review.rating}, ${review.review}, ${review.date})
  `;

  return {
    id,
    ...review,
  };
}

async function removeReview(reviewSelector) {
  const { id, name } = normalizeReviewDeleteTarget(reviewSelector);
  const sql = getSqlClient();

  if (!sql) {
    return enqueueWrite(async () => {
      const reviews = await readLocalReviewsFile();
      const nextReviews = reviews.filter((review) => {
        if (id) {
          return review.id !== id;
        }

        const storedName = normalizeSingleLine(review.name, MAX_NAME_LENGTH).toLowerCase();
        return storedName !== name.toLowerCase();
      });

      if (nextReviews.length === reviews.length) {
        return 0;
      }

      await writeLocalReviewsFile(nextReviews);
      return reviews.length - nextReviews.length;
    });
  }

  await ensureDatabase();

  const deletedRows = id
    ? await sql`
        DELETE FROM reviews
        WHERE id = ${id}
        RETURNING id
      `
    : await sql`
        DELETE FROM reviews
        WHERE LOWER(name) = LOWER(${name})
        RETURNING id
      `;

  return deletedRows.length;
}

function enqueueWrite(task) {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

module.exports = {
  DATA_DIR,
  SEED_REVIEWS_FILE,
  LOCAL_REVIEWS_FILE,
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
  normalizeReviewId,
  normalizeReviewDeleteTarget,
  normalizeStoredReview,
  readJsonReviewFile,
  readLocalReviewsFile,
  readSeedReviewsFile,
  removeReview,
  validateReviewPayload,
  writeLocalReviewsFile,
};
