/** How wide and tall a profile picture is kept, in pixels. */
const avatarSize = 320;

/**
 * A photo cropped to a centered square and made small, so it uploads and loads fast.
 * Resolves to a JPEG.
 */
export async function shrinkToAvatar(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = avatarSize;
  canvas.height = avatarSize;
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error('canvas is not available');
  }
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    avatarSize,
    avatarSize,
  );
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob === null) {
          reject(new Error('the picture could not be made'));
        } else {
          resolve(blob);
        }
      },
      'image/jpeg',
      0.85,
    );
  });
}

/** The longest side a photo sent to be read is kept at, in pixels: enough for small print. */
const readingSize = 1600;

/** A photo made small enough to send to be read (an invitation, a note), as base64 JPEG. */
export async function shrinkForReading(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, readingSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error('canvas is not available');
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85).replace(/^data:image\/jpeg;base64,/, '');
}
