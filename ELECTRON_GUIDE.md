# 📸 Panduan Menjalankan Yodha Photobooth Versi Desktop (Electron)

Aplikasi Photobooth Anda sekarang sudah mendukung **Aplikasi Desktop Windows (.exe)** dengan fitur lengkap:
1. **Silent Printing (Cetak Otomatis)**: Foto langsung keluar dari printer fisik tanpa muncul jendela dialog pop-up konfirmasi browser.
2. **True Kiosk Mode**: Layar terkunci fullscreen penuh sehingga pengunjung tidak bisa menutup aplikasi, membuka tab lain, atau mengakses Windows.
3. **Penyimpanan Backup Foto Lokal**: Setiap hasil foto otomatis tersimpan di folder harddisk PC (`C:\Photobooth\Photos\YYYY-MM-DD\`), sehingga foto tetap aman meski koneksi internet lambat/putus.
4. **Pemisahan Beban**: Layar booth kamera & komputasi berat berjalan di PC/Laptop lokal, sementara web cloud (Vercel) murni hanya untuk portal unduh pelanggan di HP.

---

## 🚀 Cara Menjalankan Mode Desktop (Development)

Untuk menjalankan booth dalam mode aplikasi desktop:

```bash
npm run electron:dev
```

Perintah ini akan otomatis:
1. Menjalankan server lokal Vite (`npm run dev`).
2. Menunggu server siap di port 3000.
3. Membuka jendela aplikasi **Yodha Photobooth** versi desktop.

---

## 🖨️ Pengaturan Printer & Mode Kiosk di Panel Admin

1. Masuk ke halaman **Admin** (ikon gerigi di pojok kanan atas) dan masukkan PIN.
2. Buka menu tab **Perangkat & Kamera** (ikon monitor/kamera di sidebar).
3. Anda akan melihat kartu baru: **Aplikasi Desktop & Printer Fisik (Electron)**:
   - **Pilih Printer Cetak Foto**: Dropdown otomatis mendeteksi semua printer Windows yang terhubung (DNP, Epson, Canon Selphy, dsb).
   - **Buka Folder Foto di PC**: Tombol untuk langsung membuka folder `C:\Photobooth\Photos` di Windows Explorer.
   - **Mode Kiosk**: Tombol untuk mengaktifkan / menonaktifkan mode layar penuh terkunci.

---

## ⌨️ Shortcut Keyboard untuk Operator

Saat aplikasi desktop berjalan di PC Booth, operator dapat menggunakan tombol pintas keyboard berikut:
- **`F11`**: Mengaktifkan atau menonaktifkan Mode Kiosk (Layar Penuh / Jendela Biasa).
- **`Ctrl + Shift + I`**: Membuka Developer Tools (Console) untuk inspeksi jika diperlukan.

---

## 📦 Cara Membuat File Installer / Portable (.exe)

Untuk mem-package aplikasi menjadi file `.exe` yang siap di-copy ke laptop/PC booth lain:

```bash
npm run electron:build
```

Hasil file `.exe` (Installer NSIS & Portable) akan tersimpan di dalam folder:
`dist-electron/`

---

## 🌐 Hubungan dengan Web / Vercel

- **Website di Vercel / Cloud**: Tetap berjalan normal untuk portal scan QR Code unduh foto pelanggan di HP (`CustomerDownloadPortal`).
- **Aplikasi Desktop Electron**: Dijalankan di laptop / PC yang terhubung dengan printer foto fisik di lokasi photobooth.
