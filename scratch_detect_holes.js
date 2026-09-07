import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const dir = 'c:/laragon/www/kerja/booth/src/assets/pnc';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));

console.log('Detecting holes in PNC files...');
for (const file of files) {
  const filePath = path.join(dir, file);
  const data = fs.readFileSync(filePath);
  const png = PNG.sync.read(data);
  
  const width = png.width;
  const height = png.height;
  const visited = new Uint8Array(width * height);
  let holeCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x);
      if (visited[idx]) continue;
      
      const pngIdx = idx * 4;
      const alpha = png.data[pngIdx + 3];
      
      if (alpha < 128) {
        const queue = [idx];
        visited[idx] = 1;
        let minX = x, maxX = x, minY = y, maxY = y;
        
        let qIdx = 0;
        while (qIdx < queue.length) {
          const curr = queue[qIdx++];
          const cx = curr % width;
          const cy = Math.floor(curr / width);
          
          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;
          
          const neighbors = [
            curr - 1,
            curr + 1,
            curr - width,
            curr + width
          ];
          
          for (const n of neighbors) {
            if (n >= 0 && n < width * height) {
              const nx = n % width;
              const ny = Math.floor(n / width);
              if (Math.abs(nx - cx) <= 1) {
                if (!visited[n]) {
                  const nAlpha = png.data[n * 4 + 3];
                  if (nAlpha < 128) {
                    visited[n] = 1;
                    queue.push(n);
                  }
                }
              }
            }
          }
        }
        
        const w = maxX - minX + 1;
        const h = maxY - minY + 1;
        if (w >= width * 0.1 && h >= height * 0.05) {
          holeCount++;
        }
      }
    }
  }
  
  console.log(`${file}: ${holeCount} holes`);
}
