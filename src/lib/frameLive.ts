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
 * Record a 3-second live video clip from camera MediaStream
 */
export function recordLiveClip(stream: MediaStream, durationMs = 3000): Promise<string> {
  return new Promise((resolve) => {
    try {
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
        ? "video/webm;codecs=vp8"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : MediaRecorder.isTypeSupported("video/mp4")
        ? "video/mp4"
        : "";

      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const actualMime = mimeType || "video/webm";
        const blob = new Blob(chunks, { type: actualMime });
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || "");
        reader.onerror = () => resolve("");
        reader.readAsDataURL(blob);
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
 * Composite multiple 3-second live pose videos into a single framed live video (.webm)
 */
export async function composeLiveVideoFrame(
  templateImgSrc: string,
  videoUrls: string[],
  layout: string,
  durationMs = 3200
): Promise<string> {
  if (!videoUrls || videoUrls.length === 0 || !templateImgSrc) {
    throw new Error("Missing video URLs or template for live video frame");
  }

  const frameImg = await loadImg(templateImgSrc);
  const frameW = frameImg.naturalWidth || frameImg.width || 1200;
  const frameH = frameImg.naturalHeight || frameImg.height || 1800;

  let holes = detectHolesFromImage(frameImg);
  if (holes.length === 0) {
    // Fallback: full center hole
    holes = [{ x: Math.round(frameW * 0.1), y: Math.round(frameH * 0.1), w: Math.round(frameW * 0.8), h: Math.round(frameH * 0.8) }];
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

  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
    ? "video/webm;codecs=vp8"
    : MediaRecorder.isTypeSupported("video/webm")
    ? "video/webm"
    : MediaRecorder.isTypeSupported("video/mp4")
    ? "video/mp4"
    : "";

  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
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
    recorder.onstop = () => {
      running = false;
      cancelAnimationFrame(animationFrameId);
      videoElements.forEach((v) => {
        v.pause();
        v.src = "";
      });

      const actualMime = mimeType || "video/webm";
      const blob = new Blob(chunks, { type: actualMime });
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
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
