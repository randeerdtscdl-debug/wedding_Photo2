import imageCompression from 'browser-image-compression';

const MAX_BYTES = 1024 * 1024; // 1 MB

/** Compress to <= ~1MB JPEG (max 1600px), strip EXIF/GPS, optionally stamp a watermark. */
export async function prepareImage(file: File, opts: { watermark?: string } = {}): Promise<Blob> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.8,
    preserveExif: false, // EXIF orientation is applied to pixels, GPS data is dropped
  });
  return opts.watermark ? addWatermark(compressed, opts.watermark) : compressed;
}

async function addWatermark(blob: Blob, text: string): Promise<Blob> {
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bmp, 0, 0);
  bmp.close?.();

  const size = Math.max(14, Math.round(canvas.width * 0.032));
  const pad = Math.round(size * 0.9);
  ctx.font = `italic ${size}px Georgia, serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(255, 244, 222, 0.85)';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = size * 0.35;
  ctx.fillText(text, canvas.width - pad, canvas.height - pad);

  for (const q of [0.85, 0.75, 0.65]) {
    const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', q));
    if (out && out.size <= MAX_BYTES * 1.05) return out;
  }
  return (await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.6))) ?? blob;
}
