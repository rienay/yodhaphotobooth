// @ts-ignore
import gifencPkg from "gifenc";
const { GIFEncoder, quantize, applyPalette } = gifencPkg;

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
 * Generate animated GIF from photos array with dimensions matching camera aspect ratio in HD quality
 */
export async function generateGifFromPhotos(
  photos: string[],
  maxDimension = 1280, // True HD Quality (1280x720 / 1280x960)
  delay = 500,
  targetDurationMs = 12000 // 12 seconds total duration
): Promise<string> {
  if (!photos || photos.length === 0) {
    throw new Error("No photos to generate GIF");
  }

  // Load first image to determine camera native aspect ratio
  const firstImg = await loadImg(photos[0]);
  const camW = firstImg.naturalWidth || firstImg.width || 1280;
  const camH = firstImg.naturalHeight || firstImg.height || 960;
  const aspect = camW / camH;

  let width: number;
  let height: number;
  if (aspect >= 1) {
    width = maxDimension;
    height = Math.round(maxDimension / aspect);
  } else {
    height = maxDimension;
    width = Math.round(maxDimension * aspect);
  }

  // Ensure even dimensions for GIF compatibility
  if (width % 2 !== 0) width += 1;
  if (height % 2 !== 0) height += 1;

  const gif = GIFEncoder();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas context could not be created");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Pre-process each photo frame once
  const processedFrames = [];
  for (let i = 0; i < photos.length; i++) {
    const img = i === 0 ? firstImg : await loadImg(photos[i]);
    ctx.clearRect(0, 0, width, height);

    // Draw image exactly matching camera aspect ratio with high quality bicubic interpolation
    ctx.drawImage(img, 0, 0, width, height);

    const imgData = ctx.getImageData(0, 0, width, height);
    const palette = quantize(imgData.data, 256, { format: "rgb565" });
    const index = applyPalette(imgData.data, palette, "rgb565");
    processedFrames.push({ index, palette });
  }

  // Calculate repeats needed to reach 12 seconds
  const oneCycleDuration = processedFrames.length * delay;
  const repeats = Math.max(1, Math.round(targetDurationMs / oneCycleDuration));

  // Write repeated frames to make a 12-second looping GIF
  for (let r = 0; r < repeats; r++) {
    for (let i = 0; i < processedFrames.length; i++) {
      gif.writeFrame(processedFrames[i].index, width, height, {
        palette: processedFrames[i].palette,
        delay,
      });
    }
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
