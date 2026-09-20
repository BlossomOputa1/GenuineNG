const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_FILE_BYTES * 2 + 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function parseBoundary(contentType = '') {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  return (match?.[1] || match?.[2] || '').trim();
}

function parseHeaders(raw = '') {
  const headers = {};
  for (const line of raw.split('\r\n')) {
    const index = line.indexOf(':');
    if (index < 0) continue;
    headers[line.slice(0, index).trim().toLowerCase()] = line.slice(index + 1).trim();
  }
  return headers;
}

function parseContentDisposition(value = '') {
  const name = value.match(/name="([^"]+)"/i)?.[1] || null;
  const filename = value.match(/filename="([^"]*)"/i)?.[1] || null;
  return { name, filename };
}

function parseMultipart(buffer, boundary) {
  const fields = {};
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const separator = Buffer.from('\r\n\r\n');
  let cursor = buffer.indexOf(boundaryBuffer);

  while (cursor >= 0) {
    cursor += boundaryBuffer.length;
    if (buffer.slice(cursor, cursor + 2).equals(Buffer.from('--'))) break;
    if (buffer.slice(cursor, cursor + 2).equals(Buffer.from('\r\n'))) cursor += 2;

    const headerEnd = buffer.indexOf(separator, cursor);
    if (headerEnd < 0) break;

    const headers = parseHeaders(buffer.slice(cursor, headerEnd).toString('utf8'));
    const disposition = parseContentDisposition(headers['content-disposition']);
    const bodyStart = headerEnd + separator.length;
    const nextBoundary = buffer.indexOf(Buffer.from(`\r\n--${boundary}`), bodyStart);
    if (nextBoundary < 0) break;

    if (disposition.name && disposition.filename !== null) {
      fields[disposition.name] = {
        fieldName: disposition.name,
        originalName: disposition.filename || `${disposition.name}.jpg`,
        mimeType: (headers['content-type'] || 'application/octet-stream').toLowerCase(),
        buffer: buffer.slice(bodyStart, nextBoundary),
      };
    }

    cursor = nextBoundary + 2;
  }

  return fields;
}

export async function multipartImages(req, res, next) {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
    return res.status(415).json({
      status: 'error',
      reason: 'Use multipart/form-data with front and back image files.',
    });
  }

  const boundary = parseBoundary(contentType);
  if (!boundary) {
    return res.status(400).json({ status: 'error', reason: 'Multipart boundary is missing.' });
  }

  try {
    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
      total += chunk.length;
      if (total > MAX_REQUEST_BYTES) {
        return res.status(413).json({
          status: 'error',
          reason: 'The uploaded images are too large. Each image must be 8 MB or smaller.',
        });
      }
      chunks.push(chunk);
    }

    const files = parseMultipart(Buffer.concat(chunks), boundary);
    const selected = {};

    for (const key of ['front', 'back']) {
      const file = files[key];
      if (!file) continue;
      if (!ALLOWED_TYPES.has(file.mimeType)) {
        return res.status(415).json({
          status: 'error',
          reason: `${key} must be a JPEG, PNG or WebP image.`,
        });
      }
      if (!file.buffer.length || file.buffer.length > MAX_FILE_BYTES) {
        return res.status(413).json({
          status: 'error',
          reason: `${key} must be 8 MB or smaller.`,
        });
      }
      selected[key] = file;
    }

    if (!selected.front && !selected.back) {
      return res.status(400).json({
        status: 'error',
        reason: 'At least one front or back image is required.',
      });
    }

    req.labelImages = selected;
    next();
  } catch (error) {
    next(error);
  }
}

export const multipartLimits = {
  maxFileBytes: MAX_FILE_BYTES,
  maxRequestBytes: MAX_REQUEST_BYTES,
  allowedTypes: [...ALLOWED_TYPES],
};
