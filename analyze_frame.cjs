const fs = require('fs');
const PNG = require('pngjs').PNG;

function analyze(filename) {
  return new Promise((resolve) => {
    fs.createReadStream(filename)
      .pipe(new PNG())
      .on('parsed', function() {
        console.log(`\n--- ${filename} ---`);
        console.log(`Dimensions: ${this.width}x${this.height}`);
        
        const w = this.width;
        const h = this.height;
        const visited = new Uint8Array(w * h);
        const regions = [];
        
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = y * w + x;
            if (visited[i]) continue;
            visited[i] = 1;
            
            const alpha = this.data[(i << 2) + 3];
            if (alpha === 0) {
              let minX = x, maxX = x, minY = y, maxY = y;
              const queue = [[x, y]];
              while(queue.length > 0) {
                const [cx, cy] = queue.pop();
                if (cx < minX) minX = cx;
                if (cx > maxX) maxX = cx;
                if (cy < minY) minY = cy;
                if (cy > maxY) maxY = cy;
                
                const neighbors = [[cx+1,cy], [cx-1,cy], [cx,cy+1], [cx,cy-1]];
                for (const [nx, ny] of neighbors) {
                  if (nx>=0 && nx<w && ny>=0 && ny<h) {
                    const ni = ny * w + nx;
                    if (!visited[ni]) {
                      visited[ni] = 1;
                      if (this.data[(ni << 2) + 3] === 0) {
                        queue.push([nx, ny]);
                      }
                    }
                  }
                }
              }
              if ((maxX - minX) > 100 && (maxY - minY) > 100) {
                regions.push({x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1});
              }
            }
          }
        }
        
        console.log(`Found ${regions.length} holes:`);
        regions.sort((a,b) => a.y !== b.y ? a.y - b.y : a.x - b.x);
        for (const r of regions) {
          console.log(`Hole at x:${r.x}, y:${r.y}, w:${r.w}, h:${r.h}`);
        }
        resolve();
      });
  });
}

async function main() {
  for (let i = 1; i <= 6; i++) {
    await analyze(`src/assets/frame2x1/${i}.png`);
  }
}

main();
