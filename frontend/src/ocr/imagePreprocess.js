const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_INPUT_BYTES = 12 * 1024 * 1024;
const MAX_DIMENSION = 1800;
const WEBP_QUALITY = 0.84;

export async function preprocessImage(file) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error('Choose a JPG, PNG or WebP photo. If your phone uses HEIC, take a new photo here or convert it first.');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('This photo is over 12 MB. Choose a smaller photo or take a new one.');
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();

    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not prepare your photo.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Could not prepare this photo. Try another image.')),
        'image/webp',
        WEBP_QUALITY,
      );
    });
  } catch (error) {
    if (error.name === 'EncodingError') throw new Error('This photo could not be opened. Try another JPG, PNG or WebP image.');
    throw error;
  } finally {
    URL.revokeObjectURL(url);
  }
}
