const fs = require('fs');
const path = require('path');

const dir = 'c:/laragon/www/kerja/booth/src/assets/pnc';
const files = fs.readdirSync(dir);

console.log('Filename | Width | Height | Aspect Ratio | Layout Recommendation');
console.log('---|---|---|---|---');

files.forEach(file => {
  if (!file.endsWith('.png')) return;
  const filePath = path.join(dir, file);
  const buffer = fs.readFileSync(filePath);
  
  // PNG IHDR offset is at 12-23
  // Width starts at 16, height at 20
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const ratio = (width / height).toFixed(3);
  
  // Classify layout based on aspect ratio
  // Standard layouts:
  // 1x1 (Tunggal): width ~ height, aspect ratio ~ 1.0 (or ~0.8 for 4:5 if they changed it, wait: "ukuran nya jadi 4:5 semua")
  // Let's print them out first to see the exact dimensions.
  console.log(`${file} | ${width}px | ${height}px | ${ratio} | -`);
});
