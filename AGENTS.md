<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md - Dokumentasi Konteks & Prompt Pengembangan Sistem Informasi
**Nama Sistem:** Sistem Informasi Jual Beli pada UMKM Toko Kue Amala (Aplikasi: **Amalakufood**)
**Kelompok:** 4C - Departemen Teknik Industri, Universitas Andalas
**Tagline UI:** "Fresh From Our Oven"

---

## 1. Context (Konteks Proyek & Tech Stack)
- **Framework:** Next.js (App Router, direktori `/app` dengan TypeScript `page.tsx` dan `route.ts`).
- **Styling:** Tailwind CSS (Skema warna sesuai Prototype Figma Amalakufood: Latar utama krem lembut `#FDF6E2`, Aksen & Header kuning hangat `#F5C518` / `#FFD233`, Teks & Ikon coklat tua `#5C2C16`, Kartu putih `#FFFFFF`, Tombol Setujui/Simpan hijau `#16A34A`, Tombol Hapus/Tolak merah `#DC2626`).
- **Database:** PostgreSQL (Lokal pada Docker container `apsi_db` port `5432` & Cloud pada Neon Serverless PostgreSQL).
- **ORM:** Prisma ORM (`schema.prisma` dihasilkan melalui introspeksi `npx prisma db pull` dari tabel SQL berdasarkan Finalized ERD Modul 2).
- **Figma Prototype URL:** https://www.figma.com/design/nmnU9qtf6bPXNUU1VRDFf5/Amalakufood-App---Desktop?node-id=78-1212

---

## 2. Feature (Struktur Halaman, Role Pengguna, & Fitur Utama)
Aplikasi memiliki 4 Role Pengguna berdasarkan Permission Matrix dan Use Case Diagram Modul 2 & 3:

### A. Alur Autentikasi & Publik
1. `/` (`app/page.tsx`): Layar Pembuka (Splash Screen) berlatar kuning dengan logo **Amalakufood**, slogan *"Fresh From Our Oven"*, dan tombol **Mulai**.
2. `/pilih-peran` (`app/pilih-peran/page.tsx`): Halaman Pemilihan Peran Pengguna ("Hai! Selamat Datang! Amalakufood - Masuk sebagai: **Customer, Kasir, Admin, Owner**").
3. `/login` (`app/login/page.tsx`): Halaman Login sesuai peran (input `Username` dan `Password`, tautan `Lupa Password?` dan `Belum punya akun? Daftar` khusus Customer).
4. `/registrasi` (`app/registrasi/page.tsx`): Halaman Registrasi Customer baru.

### B. Role 1: Customer (`/customer/...`)
- **Navbar Atas:** Logo Amalakufood, menu `Beranda`, `Katalog`, `Riwayat`, ikon Pencarian, tombol `Keranjang` (dengan badge jumlah item), dan ikon `Profil`.
- **Fitur:**
  - **Beranda & Katalog Produk:** Melihat banner promo ("Kue segar setiap hari"), filter kategori (`Semua`, `Bolu`, `Brownies`), pencarian produk, dan kartu produk (Bolu Tapai, Brownies Kukus, Bolu Pisang, Brownies Pisang, dll.).
  - **Detail Produk:** Melihat deskripsi produk, harga, stok, mengatur kuantitas (`-` / `+`), dan klik **Tambah ke Keranjang**.
  - **Keranjang & Checkout:** Mengubah jumlah/hapus item di keranjang, melihat subtotal & total harga, mengisi alamat pengiriman, dan memilih Metode Pembayaran (`QRIS`, `Transfer Bank`, `Bayar di Toko`).
  - **Pembayaran & Riwayat Pesanan:** Menampilkan halaman Scan QRIS / instruksi bayar, tombol **Saya sudah bayar**, pop-up *"Pesanan berhasil!"*, serta halaman **Riwayat Pesanan** (`#NT-xxx` / `#PS-xxx` beserta status `Diproses` / `Divalidasi` / `Selesai`).
  - **Profil Customer:** Melihat & mengedit profil (Nama Lengkap, Alamat, No. HP, Username, Email, Password) serta konfirmasi **Keluar** (`Ya` / `Tidak`).

### C. Role 2: Admin (`/admin/...`)
- **Sidebar Kiri:** Logo Amalakufood, menu `Data Produk`, `Data Customer`, dan tombol `Admin` (Profil) di kiri bawah.
- **Fitur:**
  - **Beranda Admin:** Menampilkan sapaan *"Selamat bekerja, Admin ADM001"* serta kartu ringkasan jumlah `Produk` dan `Customer`.
  - **Data Produk (CRUD):** Melihat daftar kartu produk beserta stok, tombol **Tambah Produk**, **Ubah** (Nama Produk, Kategori, Harga, Stok, Deskripsi), dan pop-up konfirmasi **Hapus Produk?**.
  - **Data Customer (CRUD & Poin):** Melihat daftar customer, tombol **Ubah** data customer, tombol **Poin** (memperbarui poin customer), dan pop-up konfirmasi **Hapus Customer?**.

### D. Role 3: Kasir (`/kasir/...`)
- **Sidebar Kiri:** Logo Amalakufood, menu `Transaksi Pemesanan`, `Validasi Pembayaran`, `Bukti Pembayaran`, `Laporan Stok`, `Laporan Penjualan`, dan `Kasir` (Profil).
- **Fitur:**
  - **Beranda Kasir:** Menampilkan sapaan *"Selamat bekerja, Kasir KSR001"*, ringkasan `Pesanan hari ini` dan `Stok hari ini`.
  - **Transaksi Pemesanan:** Melihat daftar pesanan masuk (`#PS-001`), tombol **Validasi**, **Ubah** status pesanan (`Diproses` / `Divalidasi` / `Selesai`), dan **Hapus**.
  - **Validasi Pembayaran:** Memeriksa detail pesanan & bukti pembayaran customer dengan tombol **Validasi Pembayaran** (mengubah status menjadi Berhasil/Divalidasi) atau **Tolak Pembayaran** (pop-up merah *"Pembayaran Ditolak"*).
  - **Bukti Pembayaran:** Menampilkan pratinjau **Nota Toko Kue Amala** (`NT-003`) dan tombol **Cetak Nota** (pop-up *"Nota berhasil dicetak"*).
  - **Laporan Stok & Laporan Penjualan (CRUD):** Menambah, melihat, mengubah, dan menghapus Laporan Stok (`RS-001`) serta Laporan Penjualan (`RP-001`).

### E. Role 4: Owner (`/owner/...`)
- **Sidebar Kiri:** Logo Amalakufood, menu `Rekap Laporan Penjualan`, `Rekap Laporan Stok`, `Evaluasi Laporan`, `Data Produk & Stok`, `Data Customer`, dan `Owner` (Profil).
- **Fitur:**
  - **Beranda Owner:** Menampilkan sapaan *"Halo, Owner OWN001"* dan 4 kartu Ringkasan Usaha (`Penjualan`, `Pesanan`, `Stok Menipis`, `Customer`).
  - **Rekap Laporan Penjualan & Rekap Laporan Stok:** Melihat rekap laporan dari kasir, tombol **Ubah/Evaluasi**, tombol **Setujui** (mengubah status menjadi `Disetujui` dengan pop-up *"Rekapan Laporan Disetujui"*), tombol **Hapus**, dan tombol **Cetak** (`Cetak sebagai PDF`).
  - **Evaluasi Laporan (CRUD):** Menambah, mengedit, dan menghapus catatan evaluasi laporan (`EV-001`).
  - **Data Produk & Stok & Data Customer (Read-Only):** Melihat kartu produk beserta status stok dan melihat detail data customer.

---

## 3. Constraint (Batasan & Aturan Teknis)
1. Semua interaksi database wajib melalui **Prisma Client** (`lib/prisma.ts`) yang terhubung ke PostgreSQL melalui Route Handlers di `/app/api/.../route.ts`.
2. Gunakan komponen modal/pop-up berwarna kuning sesuai desain Figma untuk setiap aksi konfirmasi (Hapus, Validasi, Setujui, Cetak Nota/PDF, dan Keluar/Logout).
3. Pastikan kode bebas dari error TypeScript saat menjalankan `prisma generate && next build` untuk kebutuhan deployment di Vercel.

---

## 4. API, Autentikasi, dan Data
- Route Handlers Prisma berada di `app/api/auth`, `app/api/produk`, `app/api/customer`, `app/api/pesanan`, dan `app/api/laporan`. Seluruh akses dan mutasi database dari frontend harus melalui endpoint ini.
- Login, registrasi customer, pemeriksaan sesi, dan logout menggunakan `/api/auth`. Sesi disimpan sebagai cookie bertanda tangan `HttpOnly`, bukan sebagai data sesi yang dipercaya dari `localStorage`.
- Semua endpoint yang memutasi data memeriksa role dari sesi server. Admin mengelola produk/customer, Kasir mengelola pesanan/pembayaran/laporan, Owner mengevaluasi dan menyetujui laporan, dan Customer mengelola profil serta checkout miliknya.
- `/api/pesanan` membuat pesanan, detail, pembayaran, dan nota secara transaksional; stok dicek dan dikurangi dalam transaksi yang sama. Pembatalan pesanan yang memenuhi syarat mengembalikan stok.
- Laporan stok/penjualan disimpan pada `Laporan_Kasir`; evaluasi dan status persetujuan disimpan pada `Laporan_Owner`; persetujuan membuat atau memperbarui rekap `Laporan_Akhir`.
- Dashboard role dan formulir login/registrasi mengambil atau mengubah data melalui `fetch()` endpoint API. Jangan menambah data bisnis tiruan sebagai pengganti respons database.
- Environment wajib mencakup `DATABASE_URL` PostgreSQL dan `AUTH_SECRET` acak dengan panjang minimal 32 karakter. Simpan nilainya hanya di environment lokal/deployment, jangan commit ke repository.
- Perubahan skema maupun migrasi tidak dilakukan otomatis oleh Route Handlers. Validasi lokal: `npx prisma generate`, `npm run lint`, `npx tsc --noEmit`, dan `npm run build`.