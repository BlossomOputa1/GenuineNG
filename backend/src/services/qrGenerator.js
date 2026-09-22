// backend/src/services/qrGenerator.js
//
// Encodes a signed unit's payload+signature into a QR code image.
// Pure logic — takes data, returns a buffer — no Supabase, no HTTP.
// Used by the CSV/QR ZIP/print-manifest export flow.

import QRCode from 'qrcode';

// What actually gets embedded in the QR: enough for an offline scanner
// to reconstruct and verify the signature without a server round trip.
// This shape must match exactly what verifySignature.js expects to
// receive from a scanned code — keep them in sync deliberately.
function buildQrContent({ payload, signature }) {
  return JSON.stringify({ payload, signature });
}

export async function generateQrPng({ payload, signature }) {
  const content = buildQrContent({ payload, signature });

  // Returns a PNG buffer — suitable for writing to a QR ZIP file or
  // embedding directly in a print manifest, not a data: URL, since
  // export volume (thousands of units per batch) makes base64
  // inflation wasteful when writing to disk/zip.
  return QRCode.toBuffer(content, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
  });
}
