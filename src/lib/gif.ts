// @ts-ignore
import { GIFEncoder, quantize, applyPalette } from "gifenc";

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Generate animated GIF from photos array using pure JS gifenc (works 100% offline without CDN)
 */
export async function generateGifFromPhotos(
  photos: string[],
  width = 500,
  height = 500,
  delay = 500
): Promise<string> {
  if (!photos || photos.length === 0) {
    throw new Error("No photos to generate GIF");
  }

  const gif = GIFEncoder();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas context could not be created");

  for (let i = 0; i < photos.length; i++) {
    const img = await loadImg(photos[i]);
    ctx.clearRect(0, 0, width, height);

    // Center crop to fill canvas
    const scale = Math.max(width / img.width, height / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (width - drawW) / 2;
    const drawY = (height - drawH) / 2;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    const imgData = ctx.getImageData(0, 0, width, height);
    const palette = quantize(imgData.data, 256);
    const index = applyPalette(imgData.data, palette);
    gif.writeFrame(index, width, height, { palette, delay });
  }

  gif.finish();
  const bytes = gif.bytes();
  const blob = new Blob([bytes], { type: "image/gif" });

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
