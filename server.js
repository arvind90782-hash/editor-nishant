const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { URL } = require('url');
const { handleContactSubmission, createError } = require('./lib/contact-core');

const PORT = Number(process.env.PORT || 8080);
const ROOT_DIR = __dirname;
const STATIC_ROOTS = [ROOT_DIR, path.join(ROOT_DIR, 'Edito-Grapher-main')];

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();

      if (!raw) {
        resolve({});
        return;
      }

      const contentType = String(req.headers['content-type'] || '').toLowerCase();

      if (contentType.includes('application/x-www-form-urlencoded')) {
        resolve(Object.fromEntries(new URLSearchParams(raw)));
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(createError(400, 'Invalid request body.'));
      }
    });

    req.on('error', reject);
  });
}

function safeResolve(rootDir, pathname) {
  const normalized = pathname.replace(/^\/+/, '');
  const resolved = path.resolve(rootDir, normalized);
  const rootResolved = path.resolve(rootDir) + path.sep;

  if (resolved !== path.resolve(rootDir) && !resolved.startsWith(rootResolved)) {
    return null;
  }

  return resolved;
}

async function findStaticFile(pathname) {
  const isRootRequest = pathname === '/' || pathname === '';
  const candidatePaths = isRootRequest ? ['index.html'] : [pathname];

  if (pathname.endsWith('/')) {
    candidatePaths.push(path.join(pathname, 'index.html'));
  }

  for (const root of STATIC_ROOTS) {
    for (const candidatePath of candidatePaths) {
      const resolved = safeResolve(root, candidatePath);
      if (!resolved) {
        continue;
      }

      try {
        const stat = await fsp.stat(resolved);
        if (stat.isFile()) {
          return { path: resolved, stat };
        }

        if (stat.isDirectory()) {
          const indexPath = path.join(resolved, 'index.html');
          const indexStat = await fsp.stat(indexPath);
          if (indexStat.isFile()) {
            return { path: indexPath, stat: indexStat };
          }
        }
      } catch {
        // Try the next candidate/root.
      }
    }
  }

  return null;
}

function serveFile(req, res, filePath, stat) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const rangeHeader = req.headers.range;

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', contentType);

  if (rangeHeader && stat.size > 0) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
    if (match) {
      const start = match[1] ? Number.parseInt(match[1], 10) : 0;
      const end = match[2] ? Number.parseInt(match[2], 10) : stat.size - 1;

      if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start < 0 ||
        end < start ||
        start >= stat.size
      ) {
        res.writeHead(416, {
          'Content-Range': `bytes */${stat.size}`,
        });
        res.end();
        return;
      }

      res.writeHead(206, {
        'Content-Length': end - start + 1,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      });

      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }
  }

  res.writeHead(200, {
    'Content-Length': stat.size,
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  fs.createReadStream(filePath).pipe(res);
}

async function handleContact(req, res) {
  if (req.method !== 'POST') {
    sendJson(
      res,
      405,
      { success: false, error: 'Method not allowed.' },
      { Allow: 'POST' }
    );
    return;
  }

  try {
    const body = await parseRequestBody(req);
    const result = await handleContactSubmission(body);

    sendJson(res, 200, {
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[local contact server] submission failed:', error);

    const statusCode = error.statusCode || 500;
    const message = error.message || 'Failed to send message';

    sendJson(res, statusCode, {
      success: false,
      error: message,
    });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(requestUrl.pathname);

    if (pathname === '/api/contact') {
      await handleContact(req, res);
      return;
    }

    const staticFile = await findStaticFile(pathname);

    if (!staticFile) {
      sendJson(res, 404, {
        success: false,
        error: 'Not found.',
      });
      return;
    }

    serveFile(req, res, staticFile.path, staticFile.stat);
  } catch (error) {
    console.error('[local server] unexpected error:', error);
    if (!res.headersSent) {
      sendJson(res, 500, {
        success: false,
        error: 'Internal server error.',
      });
      return;
    }

    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Local dev server running at http://localhost:${PORT}`);
});
