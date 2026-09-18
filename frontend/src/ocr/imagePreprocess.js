export async function preprocessImage(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG or WebP photo. If your phone uses HEIC, take a new photo here or convert it first.');
  if (file.size > 12 * 1024 * 1024) throw new Error('This photo is over 12 MB. Choose a smaller photo, or type the label details.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not prepare your photo. You can type the details instead.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not read this photo. Try another image.')), 'image/png'));
  } catch (error) {
    if (error.name === 'EncodingError') throw new Error('This photo could not be opened. Try another JPG or PNG, or type the details.');
    throw error;
  } finally {
    URL.revokeObjectURL(url);
  }
}
