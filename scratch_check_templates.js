import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let url = 'https://jsbyuegfpbqnaasaqhto.supabase.co';
let key = '';

try {
  const env = fs.readFileSync('.env.local', 'utf-8');
  const urlMatch = env.match(/VITE_SUPABASE_URL=["']?([^"'\r\n]+)/);
  const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=["']?([^"'\r\n]+)/);
  if (urlMatch && urlMatch[1]) url = urlMatch[1];
  if (keyMatch && keyMatch[1]) key = keyMatch[1];
} catch (e) {}

// Fallback to hardcoded supabase if empty in env
if (!key) {
  // Read from vite.config.ts define
  try {
    const vc = fs.readFileSync('vite.config.ts', 'utf-8');
    const anonMatch = vc.match(/VITE_SUPABASE_ANON_KEY.*?["']([^"']{20,})["']/);
    if (anonMatch) key = anonMatch[1];
  } catch (e) {}
}

const sb = createClient(url, key);

async function check() {
  const { data, error } = await sb.from('photobooth_templates').select('id, name, layout, img, enabled');
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  console.log('Total templates in Supabase:', data.length);
  for (const t of data) {
    const isBase64 = t.img?.startsWith('data:');
    console.log(`- ${t.name} (${t.layout}): ${isBase64 ? 'BASE64 (size: ' + (t.img.length / 1024).toFixed(1) + ' KB)' : t.img}`);
  }
}

check();
