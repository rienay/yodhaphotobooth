# 🚀 Panduan Setup Database & Deployment Vercel - Yodha Photobooth

Aplikasi **Yodha Photobooth** ini sekarang telah dilengkapi dengan:
1. **Cloud Database (Supabase PostgreSQL)**: Menyimpan custom templates, status aktif/nonaktif template, riwayat sesi foto (strip & GIF), dan pengaturan kamera.
2. **Cloud Storage (Supabase Storage)**: Menyimpan file frame transparan dan hasil foto/GIF strip berkualitas tinggi. Pengunjung yang scan QR Code akan langsung diarahkan untuk membuka/mengunduh fotonya.
3. **Offline Fallback Resilience**: Jika koneksi terputus atau kunci database belum diisi, aplikasi **tetap berjalan 100% normal** menggunakan IndexedDB dan LocalStorage browser.

---

## 🛠️ Langkah 1: Setup Supabase Database & Storage (Gratis)

1. Buat akun atau login di [Supabase](https://supabase.com).
2. Klik **New Project**, beri nama misalnya `yodha-photobooth`, buat password database, dan pilih region terdekat (misal: *Singapore*).
3. Setelah project siap, buka menu **SQL Editor** di sidebar kiri.
4. Buka file [`supabase_schema.sql`](./supabase_schema.sql) pada project ini, lalu salin (copy) seluruh isinya dan tempel (paste) ke SQL Editor Supabase.
5. Klik **Run** (tombol hijau).
   - Skrip ini otomatis membuat tabel `photobooth_templates`, `photobooth_sessions`, `photobooth_settings`.
   - Skrip ini juga otomatis membuat bucket storage publik bernama `photobooth` beserta seluruh permission/policy-nya.
6. Buka menu **Project Settings** (ikon gerigi) -> **API**.
   - Salin **Project URL** (contoh: `https://xyzcompany.supabase.co`).
   - Salin **anon / public key** (contoh: `eyJhbGciOi...`).

---

## 💻 Langkah 2: Menjalankan di Lokal (Pengujian)

1. Buka file `.env.local` (atau buat file `.env` baru).
2. Isi kredensial Supabase Anda:
   ```env
   VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-public-key"
   ```
3. Jalankan development server:
   ```bash
   npm run dev
   ```
4. Buka browser di URL yang muncul (biasanya `http://localhost:5173` atau `http://localhost:3000`).
5. Masuk ke halaman **Admin** (tombol gear di kanan atas) -> Anda akan melihat indikator status:
   `🟢 DATABASE CLOUD: TERHUBUNG KE SUPABASE`.
   Klik tombol **🔍 Tes Koneksi DB** untuk memastikan tabel dan koneksi siap digunakan.

---

## ☁️ Langkah 3: Deploy ke Vercel

### Opsi A: Menggunakan Vercel Dashboard (GitHub / Git)
1. Push repository/folder proyek ini ke GitHub / GitLab Anda.
2. Buka dashboard [Vercel](https://vercel.com) dan klik **Add New... -> Project**.
3. Pilih repository proyek `yodhabooth`.
4. Pada bagian **Environment Variables**, tambahkan 2 variabel berikut:
   - Name: `VITE_SUPABASE_URL`, Value: `https://your-project-ref.supabase.co`
   - Name: `VITE_SUPABASE_ANON_KEY`, Value: `your-anon-public-key`
5. Klik **Deploy**.
6. Selesai! Aplikasi Photobooth Anda sekarang live di Vercel dengan database cloud aktif.

### Opsi B: Menggunakan Vercel CLI (Terminal)
Jika Anda menginstal Vercel CLI di komputer:
```bash
npx vercel
```
Ikuti petunjuk di terminal, lalu tambahkan environment variables di dashboard Vercel setelah selesai.

---

## 📸 Fitur-Fitur Database yang Tersedia

- **Kelola Template**: Tambah frame baru (format PNG transparan), aktifkan atau matikan frame kapan saja. Semua tersinkronisasi ke seluruh perangkat yang mengakses link booth Anda.
- **Riwayat Sesi Foto**: Di panel Admin terdapat tab **📸 RIWAYAT FOTO BOOTH** yang menampilkan seluruh foto hasil jepretan pengunjung beserta link unduh gambar dan animasi GIF.
- **Pengaturan Kamera**: Pilihan kamera webcam eksternal otomatis tersimpan.
