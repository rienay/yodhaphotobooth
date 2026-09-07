const fs = require('fs');
const PNG = require('pngjs').PNG;
const path = require('path');

const dir = path.join(__dirname, 'src', 'assets', 'frame2x1');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
files.forEach(file => {
  const data = fs.readFileSync(path.join(dir, file));
  const png = PNG.sync.read(data);
  console.log(`${file}: ${png.width}x${png.height}`);
});
