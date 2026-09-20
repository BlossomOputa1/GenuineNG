import test from 'node:test';
import assert from 'node:assert/strict';
import { multipartImages } from './multipartImages.js';

function multipartRequest(parts, boundary = 'TESTBOUNDARY') {
  const chunks = [];
  for (const part of parts) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${part.name}"; filename="${part.name}.webp"\r\nContent-Type: ${part.type}\r\n\r\n`));
    chunks.push(Buffer.from(part.bytes));
    chunks.push(Buffer.from('\r\n'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  const body = Buffer.concat(chunks);
  return {
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    async *[Symbol.asyncIterator]() { yield body; },
  };
}

function responseStub() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('multipart image middleware reads front and back images into memory', async () => {
  const req = multipartRequest([
    { name: 'front', type: 'image/webp', bytes: [1, 2, 3] },
    { name: 'back', type: 'image/webp', bytes: [4, 5] },
  ]);
  const res = responseStub();

  await new Promise((resolve, reject) => multipartImages(req, res, error => error ? reject(error) : resolve()));

  assert.equal(req.labelImages.front.mimeType, 'image/webp');
  assert.equal(req.labelImages.front.buffer.length, 3);
  assert.equal(req.labelImages.back.buffer.length, 2);
});
