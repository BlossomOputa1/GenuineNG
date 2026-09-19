import { createWorker } from 'tesseract.js';
import { extractFieldsFromOcr, hasEnoughOcrSignal } from './fieldExtractor';

let sharedWorker = null;
let activeLogger = null;

async function getWorker() {
  if (sharedWorker) return sharedWorker;
  sharedWorker = await createWorker('eng', 1, {
    logger(message) {
      activeLogger?.(message);
    },
  });
  return sharedWorker;
}

export async function readTwoLabelImages(frontBlob, backBlob, { onProgress, signal } = {}) {
  if (!frontBlob || !backBlob) throw new Error('Front and back images are both required.');
  if (signal?.aborted) throw new DOMException('OCR cancelled.', 'AbortError');

  const worker = await getWorker();
  activeLogger = message => {
    if (message?.status) {
      const base = message.status === 'recognizing text' ? 0.1 : 0;
      onProgress?.({
        status: message.status,
        progress: Math.min(0.49, base + (message.progress || 0) * 0.39),
      });
    }
  };

  const front = await worker.recognize(frontBlob);
  if (signal?.aborted) throw new DOMException('OCR cancelled.', 'AbortError');

  activeLogger = message => {
    if (message?.status) {
      onProgress?.({
        status: message.status,
        progress: 0.5 + (message.progress || 0) * 0.5,
      });
    }
  };

  const back = await worker.recognize(backBlob);
  activeLogger = null;
  if (signal?.aborted) throw new DOMException('OCR cancelled.', 'AbortError');

  const fields = extractFieldsFromOcr(front.data.text, back.data.text);
  const combinedText = `${front.data.text}\n${back.data.text}`;
  const confidence = Math.round(((front.data.confidence || 0) + (back.data.confidence || 0)) / 2);

  return {
    fields,
    confidence,
    rawText: { front: front.data.text, back: back.data.text },
    enoughSignal: hasEnoughOcrSignal({ text: combinedText, confidence, fields }),
  };
}

export async function terminateOcrWorker() {
  if (!sharedWorker) return;
  await sharedWorker.terminate();
  sharedWorker = null;
}
