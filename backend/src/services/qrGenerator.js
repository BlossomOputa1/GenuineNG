// backend/src/services/qrGenerator.js
//
// Encodes a signed unit's payload+signature into a branded QR code image.
// The centered GenuineNG mark is visual only; the signed QR payload itself
// remains unchanged.

import { readFileSync } from 'node:fs';
import QRCode from 'qrcode';
import { PNG } from 'pngjs';

const BRAND_ICON = PNG.sync.read(
  readFileSync(new URL('../assets/genuineng-icon.png', import.meta.url)),
);

function buildQrContent({ payload, signature }) {
  return JSON.stringify({ payload, signature });
}

function insideRoundedRect(x, y, left, top, width, height, radius) {
  const right = left + width - 1;
  const bottom = top + height - 1;
  const nearestX = Math.max(left + radius, Math.min(x, right - radius));
  const nearestY = Math.max(top + radius, Math.min(y, bottom - radius));
  const dx = x - nearestX;
  const dy = y - nearestY;
  return dx * dx + dy * dy <= radius * radius;
}

function fillRoundedWhiteBacking(image, left, top, size, radius) {
  for (let y = top; y < top + size; y += 1) {
    for (let x = left; x < left + size; x += 1) {
      if (!insideRoundedRect(x, y, left, top, size, size, radius)) continue;
      const index = (image.width * y + x) << 2;
      image.data[index] = 255;
      image.data[index + 1] = 255;
      image.data[index + 2] = 255;
      image.data[index + 3] = 255;
    }
  }
}

function compositeScaled(source, destination, left, top, size) {
  for (let y = 0; y < size; y += 1) {
    const sourceY = Math.min(source.height - 1, Math.floor((y / size) * source.height));
    for (let x = 0; x < size; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.floor((x / size) * source.width));
      const sourceIndex = (source.width * sourceY + sourceX) << 2;
      const destinationIndex = (destination.width * (top + y) + (left + x)) << 2;
      const alpha = source.data[sourceIndex + 3] / 255;
      if (alpha <= 0) continue;

      destination.data[destinationIndex] = Math.round(
        source.data[sourceIndex] * alpha + destination.data[destinationIndex] * (1 - alpha),
      );
      destination.data[destinationIndex + 1] = Math.round(
        source.data[sourceIndex + 1] * alpha + destination.data[destinationIndex + 1] * (1 - alpha),
      );
      destination.data[destinationIndex + 2] = Math.round(
        source.data[sourceIndex + 2] * alpha + destination.data[destinationIndex + 2] * (1 - alpha),
      );
      destination.data[destinationIndex + 3] = 255;
    }
  }
}

function addBrandIcon(qrBuffer) {
  const qr = PNG.sync.read(qrBuffer);

  // Keep the mark deliberately small. Combined with QR error correction H,
  // this leaves ample redundancy for phone cameras and print workflows.
  const iconSize = Math.max(24, Math.round(qr.width * 0.14));
  const backingPadding = Math.max(4, Math.round(qr.width * 0.018));
  const backingSize = iconSize + backingPadding * 2;
  const backingLeft = Math.round((qr.width - backingSize) / 2);
  const backingTop = Math.round((qr.height - backingSize) / 2);
  const iconLeft = Math.round((qr.width - iconSize) / 2);
  const iconTop = Math.round((qr.height - iconSize) / 2);

  fillRoundedWhiteBacking(
    qr,
    backingLeft,
    backingTop,
    backingSize,
    Math.max(4, Math.round(backingSize * 0.18)),
  );
  compositeScaled(BRAND_ICON, qr, iconLeft, iconTop, iconSize);

  return PNG.sync.write(qr);
}

export async function generateQrPng({ payload, signature }) {
  const content = buildQrContent({ payload, signature });
  const qrBuffer = await QRCode.toBuffer(content, {
    type: 'png',
    errorCorrectionLevel: 'H',
    margin: 3,
  });

  return addBrandIcon(qrBuffer);
}
