const fs = require('fs');
const path = require('path');

const baseDir = 'c:/laragon/www/kerja/booth/src/assets/pnc';

console.log('Filename | Width | Height | Aspect Ratio');
console.log('---|---|---|---');

function walk(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walk(filePath);
    } else if (file.endsWith('.png')) {
      const buffer = fs.readFileSync(filePath);
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      const ratio = (width / height).toFixed(3);
      const relPath = path.relative(baseDir, filePath).replace(/\\/g, '/');
      console.log(`${relPath} | ${width}px | ${height}px | ${ratio}`);
    }
  });
}

walk(baseDir);
