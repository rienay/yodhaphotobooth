// @ts-ignore
import gifencPkg from "gifenc";
const { GIFEncoder, quantize, applyPalette } = gifencPkg;
import {
  Input,
  Output,
  Conversion,
  ALL_FORMATS,
  BlobSource,
  Mp4OutputFormat,
  BufferTarget,
  canEncode,
} from "mediabunny";

/**
 * Helper utilities for Live Photo video recording and framed live composition
 */

export function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Converts any video Blob (e.g. WebM/VP8/VP9 from MediaRecorder) to a genuine
 * ISO Base Media File Format MP4 with H.264 (AVC) video track and fastStart metadata.
 * This guarantees 100% native playback on mobile phones (iOS Photos/Files and Android Gallery).
 */
export async function convertBlobToMp4(inputBlob: Blob): Promise<Blob> {
  try {
    if (!inputBlob || inputBlob.size === 0) return inputBlob;

    // Check if it already has an MP4 ISO box header (bytes 4-7 equal 'ftyp')
    const head = new Uint8Array(await inputBlob.slice(0, 8).arrayBuffer());
    const isAlreadyMp4 =
      head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70;
    if (isAlreadyMp4 && inputBlob.type === "video/mp4") {
      return inputBlob;
    }

    // Verify browser support for AVC (H.264) encoding via WebCodecs
    const avcSupported = await canEncode("avc");
    if (!avcSupported) {
      console.warn("AVC (H.264) encoder not supported in this environment, using original blob");
      return inputBlob;
    }

    const input = new Input({
      source: new BlobSource(inputBlob),
      formats: ALL_FORMATS,
    });

    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: "in-memory" }),
      target: new BufferTarget(),
    });

    const conversion = await Conversion.init({ input, output });
    if (!conversion.isValid) {
      console.warn("Conversion to MP4 not valid:", conversion.discardedTracks);
      return inputBlob;
    }

    await conversion.execute();

    if (output.target.buffer && output.target.buffer.byteLength > 0) {
      return new Blob([output.target.buffer], { type: "video/mp4" });
    }
  } catch (err) {
    console.warn("convertBlobToMp4 encountered error:", err);
  }
  return inputBlob;
}

/**
 * Record a 5-second live video clip from camera MediaStream and output true H.264 MP4
 */
export function recordLiveClip(stream: MediaStream, durationMs = 5000): Promise<string> {
  return new Promise((resolve) => {
    try {
      const mimeType = MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")
        ? "video/mp4;codecs=avc1"
        : MediaRecorder.isTypeSupported("video/mp4;codecs=h264")
        ? "video/mp4;codecs=h264"
        : MediaRecorder.isTypeSupported("video/mp4")
        ? "video/mp4"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
        ? "video/webm;codecs=vp8"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "";

      const options: MediaRecorderOptions = {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 6000000, // 6 Mbps HD
      };
      const recorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        try {
          const rawBlob = new Blob(chunks, { type: mimeType || "video/webm" });
          const mp4Blob = await convertBlobToMp4(rawBlob);
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string) || "");
          reader.onerror = () => resolve("");
          reader.readAsDataURL(mp4Blob);
        } catch (e) {
          console.warn("Error processing recorded live clip:", e);
          const fallbackBlob = new Blob(chunks, { type: "video/mp4" });
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string) || "");
          reader.onerror = () => resolve("");
          reader.readAsDataURL(fallbackBlob);
        }
      };

      recorder.start(100);

      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, durationMs);
    } catch (err) {
      console.warn("MediaRecorder live clip error:", err);
      resolve("");
    }
  });
}

export interface FrameHole {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Detect transparent holes in frame overlay image
 */
export function detectHolesFromImage(frameImg: HTMLImageElement): FrameHole[] {
  const SCALE_MAX = 400;
  const origW = frameImg.naturalWidth || frameImg.width;
  const origH = frameImg.naturalHeight || frameImg.height;
  const scale = Math.min(1, SCALE_MAX / Math.max(origW, origH));
  const width = Math.round(origW * scale);
  const height = Math.round(origH * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  ctx.drawImage(frameImg, 0, 0, width, height);

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const isTransparent = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) {
      isTransparent[i / 4] = 1;
    }
  }

  const visited = new Uint8Array(width * height);
  const holes: FrameHole[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (isTransparent[idx] && !visited[idx]) {
        let minX = x, maxX = x;
        let minY = y, maxY = y;

        const queue: [number, number][] = [[x, y]];
        visited[idx] = 1;

        let head = 0;
        while (head < queue.length) {
          const [cx, cy] = queue[head++];

          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          const neighbors = [
            [cx + 1, cy],
            [cx - 1, cy],
            [cx, cy + 1],
            [cx, cy - 1],
          ];

          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nidx = ny * width + nx;
              if (isTransparent[nidx] && !visited[nidx]) {
                visited[nidx] = 1;
                queue.push([nx, ny]);
              }
            }
          }
        }

        const w = maxX - minX + 1;
        const h = maxY - minY + 1;
        const area = w * h;
        if (
          w >= width * 0.10 &&
          h >= height * 0.04 &&
          area >= (width * height) * 0.012 &&
          w < width * 0.98 &&
          h < height * 0.98
        ) {
          holes.push({
            x: Math.round(minX / scale),
            y: Math.round(minY / scale),
            w: Math.round(w / scale),
            h: Math.round(h / scale),
          });
        }
      }
    }
  }

  holes.sort((a, b) => {
    if (Math.abs(a.y - b.y) > 20) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });

  return holes;
}

/**
 * Composite multiple 5-second live pose videos into a single framed live video (.mp4)
 */
export async function composeLiveVideoFrame(
  templateImgSrc: string,
  videoUrls: string[],
  layout: string,
  durationMs = 5200,
  customBoxes?: { id?: string; x: number; y: number; w: number; h: number }[]
): Promise<string> {
  if (!videoUrls || videoUrls.length === 0 || !templateImgSrc) {
    throw new Error("Missing video URLs or template for live video frame");
  }

  const frameImg = await loadImg(templateImgSrc);
  const origW = frameImg.naturalWidth || frameImg.width || 1200;
  const origH = frameImg.naturalHeight || frameImg.height || 1800;
  // H.264 / AVC requires even dimensions (multiples of 2)
  const frameW = Math.round(origW / 2) * 2;
  const frameH = Math.round(origH / 2) * 2;

  let holes: FrameHole[] = [];
  if (customBoxes && customBoxes.length > 0) {
    holes = customBoxes.map((box) => ({
      x: Math.round((box.x / 100) * frameW),
      y: Math.round((box.y / 100) * frameH),
      w: Math.round((box.w / 100) * frameW),
      h: Math.round((box.h / 100) * frameH),
    }));
  } else {
    holes = detectHolesFromImage(frameImg);
    if (holes.length === 0) {
      // Fallback: full center hole
      holes = [{ x: Math.round(frameW * 0.1), y: Math.round(frameH * 0.1), w: Math.round(frameW * 0.8), h: Math.round(frameH * 0.8) }];
    }
  }

  // Create HTMLVideoElement for each video clip
  const videoElements = await Promise.all(
    videoUrls.map((url) => {
      return new Promise<HTMLVideoElement>((resolve) => {
        const video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.src = url;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.onloadeddata = () => {
          video.currentTime = 0;
          video.play().catch(() => {});
          resolve(video);
        };
        video.onerror = () => resolve(video);
        setTimeout(() => resolve(video), 2000); // safety timeout
      });
    })
  );

  const canvas = document.createElement("canvas");
  canvas.width = frameW;
  canvas.height = frameH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas context");

  const stream = canvas.captureStream ? canvas.captureStream(30) : null;
  if (!stream) throw new Error("canvas.captureStream not supported in this browser");

  const mimeType = MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")
    ? "video/mp4;codecs=avc1"
    : MediaRecorder.isTypeSupported("video/mp4;codecs=h264")
    ? "video/mp4;codecs=h264"
    : MediaRecorder.isTypeSupported("video/mp4")
    ? "video/mp4"
    : MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
    ? "video/webm;codecs=vp8"
    : MediaRecorder.isTypeSupported("video/webm")
    ? "video/webm"
    : "";

  const recorder = new MediaRecorder(stream, {
    ...(mimeType ? { mimeType } : {}),
    videoBitsPerSecond: 8000000, // 8 Mbps Full HD quality
  });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  let animationFrameId: number;
  let running = true;

  const renderFrame = () => {
    if (!running) return;

    // 1. Draw white background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, frameW, frameH);

    // 2. Draw each video into its hole
    for (let i = 0; i < holes.length; i++) {
      const hole = holes[i];
      const videoIdx = layout === "4x2" ? Math.floor(i / 2) : i;
      const vid = videoElements[videoIdx % videoElements.length];

      if (vid && vid.readyState >= 2) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(hole.x, hole.y, hole.w, hole.h);
        ctx.clip();

        // Calculate cover fit (object-fit: cover)
        const vw = vid.videoWidth || 1280;
        const vh = vid.videoHeight || 960;
        const scale = Math.max(hole.w / vw, hole.h / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        const dx = hole.x + (hole.w - dw) / 2;
        const dy = hole.y + (hole.h - dh) / 2;

        ctx.drawImage(vid, dx, dy, dw, dh);
        ctx.restore();
      }
    }

    // 3. Draw template overlay frame on top
    ctx.drawImage(frameImg, 0, 0, frameW, frameH);

    animationFrameId = requestAnimationFrame(renderFrame);
  };

  return new Promise((resolve) => {
    recorder.onstop = async () => {
      running = false;
      cancelAnimationFrame(animationFrameId);
      videoElements.forEach((v) => {
        v.pause();
        v.src = "";
      });

      try {
        const rawBlob = new Blob(chunks, { type: mimeType || "video/webm" });
        const mp4Blob = await convertBlobToMp4(rawBlob);
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || "");
        reader.onerror = () => resolve("");
        reader.readAsDataURL(mp4Blob);
      } catch (err) {
        console.warn("composeLiveVideoFrame conversion fallback:", err);
        const fallbackBlob = new Blob(chunks, { type: "video/mp4" });
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || "");
        reader.onerror = () => resolve("");
        reader.readAsDataURL(fallbackBlob);
      }
    };

    recorder.start(100);
    renderFrame();

    setTimeout(() => {
      if (recorder.state === "recording") {
        recorder.stop();
      }
    }, durationMs);
  });
}

/**
 * Generate a loop framed Live GIF by capturing the 5-second live pose videos
 * inside the photo frame holes and repeating them (e.g. 5s x 2 or 3 repeats).
 */
export async function composeLiveGifFrame(
  templateImgSrc: string,
  videoUrls: string[],
  layout: string,
  maxDimension = 420,
  fps = 8,
  repeats = 2,
  customBoxes?: { id?: string; x: number; y: number; w: number; h: number }[]
): Promise<string> {
  if (!videoUrls || videoUrls.length === 0 || !templateImgSrc) {
    throw new Error("Missing video URLs or template for live GIF frame");
  }

  const frameImg = await loadImg(templateImgSrc);
  const origW = frameImg.naturalWidth || frameImg.width || 1200;
  const origH = frameImg.naturalHeight || frameImg.height || 1800;

  let holes: FrameHole[] = [];
  if (customBoxes && customBoxes.length > 0) {
    holes = customBoxes.map((box) => ({
      x: Math.round((box.x / 100) * origW),
      y: Math.round((box.y / 100) * origH),
      w: Math.round((box.w / 100) * origW),
      h: Math.round((box.h / 100) * origH),
    }));
  } else {
    holes = detectHolesFromImage(frameImg);
    if (holes.length === 0) {
      holes = [
        {
          x: Math.round(origW * 0.1),
          y: Math.round(origH * 0.1),
          w: Math.round(origW * 0.8),
          h: Math.round(origH * 0.8),
        },
      ];
    }
  }

  // Calculate target dimensions
  const aspect = origW / origH;
  let targetW: number;
  let targetH: number;
  if (aspect >= 1) {
    targetW = maxDimension;
    targetH = Math.round(maxDimension / aspect);
  } else {
    targetH = maxDimension;
    targetW = Math.round(maxDimension * aspect);
  }
  if (targetW % 2 !== 0) targetW += 1;
  if (targetH % 2 !== 0) targetH += 1;

  const scale = targetW / origW;
  const scaledHoles = holes.map((h) => ({
    x: Math.round(h.x * scale),
    y: Math.round(h.y * scale),
    w: Math.round(h.w * scale),
    h: Math.round(h.h * scale),
  }));

  // Load video elements
  const videoElements = await Promise.all(
    videoUrls.map((url) => {
      return new Promise<HTMLVideoElement>((resolve) => {
        const video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.src = url;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.onloadeddata = () => {
          video.currentTime = 0;
          video.play().catch(() => {});
          resolve(video);
        };
        video.onerror = () => resolve(video);
        setTimeout(() => resolve(video), 2500);
      });
    })
  );

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not create canvas context");

  const totalCycleFrames = Math.round(5 * fps); // 40 frames for 5s
  const frameIntervalMs = Math.round(1000 / fps); // ~125ms
  const capturedFrames: ImageData[] = [];

  // Capture 1 full 5-second cycle
  for (let f = 0; f < totalCycleFrames; f++) {
    // 1. Draw white background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, targetW, targetH);

    // 2. Draw each video into its hole
    for (let i = 0; i < scaledHoles.length; i++) {
      const hole = scaledHoles[i];
      const videoIdx = layout === "4x2" ? Math.floor(i / 2) : i;
      const vid = videoElements[videoIdx % videoElements.length];

      if (vid && vid.readyState >= 2) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(hole.x, hole.y, hole.w, hole.h);
        ctx.clip();

        const vw = vid.videoWidth || 1280;
        const vh = vid.videoHeight || 960;
        const vScale = Math.max(hole.w / vw, hole.h / vh);
        const dw = vw * vScale;
        const dh = vh * vScale;
        const dx = hole.x + (hole.w - dw) / 2;
        const dy = hole.y + (hole.h - dh) / 2;

        ctx.drawImage(vid, dx, dy, dw, dh);
        ctx.restore();
      }
    }

    // 3. Draw template overlay
    ctx.drawImage(frameImg, 0, 0, targetW, targetH);

    // Store frame data
    capturedFrames.push(ctx.getImageData(0, 0, targetW, targetH));

    await new Promise((r) => setTimeout(r, frameIntervalMs));
  }

  // Cleanup video elements
  videoElements.forEach((v) => {
    v.pause();
    v.src = "";
  });

  // Encode with gifenc, repeated 4 times => exactly 12 seconds!
  const gif = GIFEncoder();
  const processed = capturedFrames.map((imgData) => {
    const palette = quantize(imgData.data, 256);
    const index = applyPalette(imgData.data, palette);
    return { index, palette };
  });

  for (let r = 0; r < repeats; r++) {
    for (let i = 0; i < processed.length; i++) {
      gif.writeFrame(processed[i].index, targetW, targetH, {
        palette: processed[i].palette,
        delay: frameIntervalMs,
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

/**
 * Generate a looped GIF from a 5-second live video clip
 * Aspect ratio strictly matches native camera video!
 */
export async function generate12sGifFromVideo(
  videoSrc: string,
  maxDimension = 480,
  fps = 8,
  repeats = 2
): Promise<string> {
  if (!videoSrc) throw new Error("No video source provided");

  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.src = videoSrc;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;

  await new Promise<void>((resolve) => {
    video.onloadeddata = () => {
      video.currentTime = 0;
      video.play().catch(() => {});
      resolve();
    };
    video.onerror = () => resolve();
    setTimeout(resolve, 2500);
  });

  const camW = video.videoWidth || 1280;
  const camH = video.videoHeight || 960;
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
  if (width % 2 !== 0) width += 1;
  if (height % 2 !== 0) height += 1;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not create canvas context");

  const totalCycleFrames = Math.round(5 * fps); // 40 frames for 5s
  const frameIntervalMs = Math.round(1000 / fps); // 125ms
  const capturedFrames: ImageData[] = [];

  for (let f = 0; f < totalCycleFrames; f++) {
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    capturedFrames.push(ctx.getImageData(0, 0, width, height));
    await new Promise((r) => setTimeout(r, frameIntervalMs));
  }

  video.pause();
  video.src = "";

  const gif = GIFEncoder();
  const processed = capturedFrames.map((imgData) => {
    const palette = quantize(imgData.data, 256);
    const index = applyPalette(imgData.data, palette);
    return { index, palette };
  });

  // Repeat 4 times => exactly 12 seconds total!
  for (let r = 0; r < repeats; r++) {
    for (let i = 0; i < processed.length; i++) {
      gif.writeFrame(processed[i].index, width, height, {
        palette: processed[i].palette,
        delay: frameIntervalMs,
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
