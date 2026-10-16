# Kasir-E POS (Next.js PWA)

Aplikasi Point of Sale (POS) modern, cepat, dan sederhana yang dirancang khusus untuk rumah makan, warung makan, dan UMKM. Dioptimalkan untuk pengguna lansia dengan tombol sentuh berukuran besar (min. 48px), navigasi intuitif, kontras tinggi, serta dukungan printer thermal Bluetooth 57/58mm.

---

## 🌟 Fitur Utama & Peningkatan dari Versi Android

1. **Next.js PWA (Web, Desktop & Mobile)**
   - Dapat diinstal langsung ke layar utama Android / iOS / Desktop (PWA Standalone).
   - Registrasi Service Worker otomatis dengan dukungan offline.

2. **Koneksi Cloud (Firebase) + Offline First**
   - **Firestore IndexedDB Persistence**: Transaksi dan katalog menu tersimpan lokal di perangkat dan tersinkronisasi otomatis saat terhubung internet.
   - **Multi-Tenant / Akun Pengguna**: Data menu dan riwayat transaksi terikat pada akun pengguna masing-masing.
   - **Mode Demo Mandiri**: Aplikasi dapat langsung digunakan secara lokal tanpa konfigurasi awal yang rumit. Kunci Firebase dapat dimasukkan langsung lewat menu *Pengaturan*.

3. **Katalog Menu Multi-Kategori & Pengurutan (CRUD)**
   - Kategori menu bawaan: **Makanan**, **Minuman**, **Cemilan**, serta penambahan **Kategori Kustom**.
   - Fitur reordering: Tombol **Geser ke Atas** dan **Geser ke Bawah**.
   - Dilindungi modal **PIN Pemilik 6-Digit** (Default: `123456`, dapat diubah di Pengaturan).

4. **Riwayat Transaksi & Pelaporan Thermal Khusus**
   - **Format 5-Digit**: Nomor transaksi `#00001` hingga `#99999`.
   - **Collapsible Date Groups**: Dikelompokkan per tanggal (`EEEE, dd MMMM yyyy`), hari ini otomatis terbuka (*expanded*), tanggal sebelumnya tertutup (*collapsed*).
   - **Multi-Select & Rekap Khusus**:
     - **Print Kawul**: Otomatis memfilter transaksi yang memuat menu "Bakso", menghitung total porsi dan subtotalnya.
     - **Print Mamah**: Rekap menyeluruh seluruh item terjual, jumlah, dan grand total.
     - **Cetak Struk Per Transaksi**: Cetak ulang struk pelanggan kapan saja.
   - **Reset Transaksi**: Reset total riwayat transaksi dan pengembalian nomor urut ke `#00001` yang dilindungi PIN Pemilik.

5. **Hardware Printing Thermal 57/58mm (Hybrid Architecture)**
   - **Web Bluetooth ESC/POS Direct**: Kirim *raw byte stream* langsung ke printer Bluetooth (Putian POS, GOOJPRT, Zjiang, dll) dengan format 32 karakter per baris dan jeda pemotong kertas.
   - **Browser Print Fallback (58mm)**: Dukungan cetak universal untuk iOS Safari, Mac, dan Windows Desktop.
   - **Print Ulang Persisten**: Modal konfirmasi cetak mempertahankan tombol *Print Ulang* untuk mencetak ulang segera jika kertas printer habis di tengah jalan.

6. **Bilingual (Multi-Bahasa)**
   - Bahasa bawaan: **Bahasa Indonesia** (`id`).
   - Tersedia tombol ganti cepat ke **English** (`en`).

7. **Desain Ramah Lansia (Senior-Friendly UI)**
   - Stepper jumlah item `[-] [qty] [+]` dengan area sentuh besar.
   - Pintasan nominal uang tunai cepat (Uang Pas, 20rb, 50rb, 100rb) dan kalkulasi kembalian otomatis dengan teks besar yang mudah dibaca.
   - Keypad angka besar saat verifikasi PIN pemilik.

---

## 🚀 Cara Menjalankan Proyek

### 1. Instal Dependensi
```bash
npm install
```

### 2. Jalankan Server Pengembangan
```bash
npm run dev
```
Buka browser di [http://localhost:3000](http://localhost:3000).

### 3. Build Produksi
```bash
npm run build
npm run start
```

---

## ⚙️ Konfigurasi Firebase (Opsional)

Aplikasi memiliki fallback penyimpanan lokal otomatis sehingga Anda dapat mengujinya langsung. Untuk menghubungkan ke Firebase:

1. Buat proyek di [Firebase Console](https://console.firebase.google.com/).
2. Aktifkan **Authentication** (Email/Password) dan **Cloud Firestore**.
3. Masukkan konfigurasi Anda:
   - **Opsi A**: Buat file `.env.local` sesuai dengan `.env.example`.
   - **Opsi B**: Buka aplikasi, masuk ke tab **Pengaturan** -> **Atur Kunci Firebase**, lalu masukkan API Key & Project ID Anda.

---

## 🔒 Keamanan & PIN Pemilik

- Default Owner PIN: `123456`
- PIN Pemilik dapat diubah kapan saja di menu **Pengaturan** -> **Ganti PIN Pemilik**.
