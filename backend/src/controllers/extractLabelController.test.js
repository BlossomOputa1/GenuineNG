import test from 'node:test';
import assert from 'node:assert/strict';
import { multerFilesToImages } from './extractLabelController.js';

test('maps Multer front/back files into the existing label extractor shape', () => {
  const frontBuffer = Buffer.from([1, 2, 3]);
  const backBuffer = Buffer.from([4, 5]);

  const images = multerFilesToImages({
    front: [{ buffer: frontBuffer, mimetype: 'image/webp', originalname: 'front.webp' }],
    back: [{ buffer: backBuffer, mimetype: 'image/jpeg', originalname: 'back.jpg' }],
  });

  assert.deepEqual(images.front, {
    buffer: frontBuffer,
    mimeType: 'image/webp',
    originalName: 'front.webp',
  });
  assert.deepEqual(images.back, {
    buffer: backBuffer,
    mimeType: 'image/jpeg',
    originalName: 'back.jpg',
  });
});

test('returns null image entries when Multer did not receive those fields', () => {
  assert.deepEqual(multerFilesToImages({}), { front: null, back: null });
});
