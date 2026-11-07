DROP TABLE IF EXISTS laporan_akhir CASCADE;
DROP TABLE IF EXISTS laporan_owner CASCADE;
DROP TABLE IF EXISTS laporan_kasir CASCADE;
DROP TABLE IF EXISTS nota CASCADE;
DROP TABLE IF EXISTS pembayaran CASCADE;
DROP TABLE IF EXISTS detail_pesanan CASCADE;
DROP TABLE IF EXISTS pesanan CASCADE;
DROP TABLE IF EXISTS produk CASCADE;
DROP TABLE IF EXISTS registrasi CASCADE;
DROP TABLE IF EXISTS owner CASCADE;
DROP TABLE IF EXISTS kasir CASCADE;
DROP TABLE IF EXISTS customer CASCADE;
DROP TABLE IF EXISTS admin CASCADE;
DROP TABLE IF EXISTS alamat CASCADE;
DROP TABLE IF EXISTS pengguna CASCADE;

CREATE TABLE pengguna (
    id_pengguna VARCHAR(10) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Kasir', 'Customer', 'Owner'))
);

CREATE TABLE alamat (
    kode_pos VARCHAR(10) PRIMARY KEY,
    jalan VARCHAR(100) NOT NULL,
    no_jalan VARCHAR(10) NOT NULL,
    kelurahan VARCHAR(50) NOT NULL,
    kecamatan VARCHAR(50) NOT NULL,
    kota VARCHAR(50) NOT NULL
);

CREATE TABLE admin (
    id_admin VARCHAR(10) PRIMARY KEY,
    id_pengguna VARCHAR(10) NOT NULL UNIQUE REFERENCES pengguna(id_pengguna)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    nama_admin VARCHAR(100) NOT NULL,
    no_handphone VARCHAR(15) NOT NULL,
    email_admin VARCHAR(100) NOT NULL
);

CREATE TABLE customer (
    id_customer VARCHAR(10) PRIMARY KEY,
    id_pengguna VARCHAR(10) NOT NULL UNIQUE REFERENCES pengguna(id_pengguna)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    nama_customer VARCHAR(100) NOT NULL,
    no_handphone VARCHAR(15) NOT NULL,
    jalan VARCHAR(100),
    no_jalan VARCHAR(10),
    kelurahan VARCHAR(50),
    kecamatan VARCHAR(50),
    kota VARCHAR(50) DEFAULT 'Padang',
    kode_pos VARCHAR(10) REFERENCES alamat(kode_pos)
        ON UPDATE CASCADE ON DELETE SET NULL,
    email_customer VARCHAR(100) NOT NULL,
    poin INTEGER NOT NULL DEFAULT 0 CHECK (poin >= 0)
);

CREATE TABLE kasir (
    id_kasir VARCHAR(10) PRIMARY KEY,
    id_pengguna VARCHAR(10) NOT NULL UNIQUE REFERENCES pengguna(id_pengguna)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    nama_kasir VARCHAR(100) NOT NULL,
    no_handphone VARCHAR(15) NOT NULL,
    email_kasir VARCHAR(100) NOT NULL
);

CREATE TABLE owner (
    id_owner VARCHAR(10) PRIMARY KEY,
    id_pengguna VARCHAR(10) NOT NULL UNIQUE REFERENCES pengguna(id_pengguna)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    nama_owner VARCHAR(100) NOT NULL,
    no_handphone VARCHAR(15) NOT NULL,
    email_owner VARCHAR(100) NOT NULL
);

CREATE TABLE registrasi (
    id_registrasi VARCHAR(10) PRIMARY KEY,
    id_customer VARCHAR(10) NOT NULL UNIQUE REFERENCES customer(id_customer)
        ON UPDATE CASCADE ON DELETE CASCADE,
    tanggal_registrasi DATE NOT NULL DEFAULT CURRENT_DATE,
    status_registrasi VARCHAR(20) NOT NULL DEFAULT 'Aktif'
);

CREATE TABLE produk (
    id_produk VARCHAR(10) PRIMARY KEY,
    id_admin VARCHAR(10) NOT NULL REFERENCES admin(id_admin)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    nama_produk VARCHAR(100) NOT NULL,
    kategori VARCHAR(50) NOT NULL,
    harga NUMERIC(12, 2) NOT NULL CHECK (harga > 0),
    stok INTEGER NOT NULL DEFAULT 0 CHECK (stok >= 0),
    deskripsi TEXT
);

CREATE TABLE pesanan (
    id_pesanan VARCHAR(10) PRIMARY KEY,
    id_customer VARCHAR(10) NOT NULL REFERENCES customer(id_customer)
        ON UPDATE CASCADE ON DELETE CASCADE,
    id_kasir VARCHAR(10) REFERENCES kasir(id_kasir)
        ON UPDATE CASCADE ON DELETE SET NULL,
    tanggal_pesanan DATE NOT NULL DEFAULT CURRENT_DATE,
    status_pesanan VARCHAR(30) NOT NULL DEFAULT 'Diproses'
        CHECK (status_pesanan IN ('Menunggu', 'Diproses', 'Divalidasi', 'Selesai', 'Dibatalkan')),
    total_tagihan NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_tagihan >= 0)
);

CREATE TABLE detail_pesanan (
    id_detail_pesanan VARCHAR(10) PRIMARY KEY,
    id_pesanan VARCHAR(10) NOT NULL REFERENCES pesanan(id_pesanan)
        ON UPDATE CASCADE ON DELETE CASCADE,
    id_produk VARCHAR(10) NOT NULL REFERENCES produk(id_produk)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    jumlah INTEGER NOT NULL CHECK (jumlah > 0),
    harga_satuan NUMERIC(12, 2) NOT NULL CHECK (harga_satuan > 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0)
);

CREATE TABLE pembayaran (
    id_pembayaran VARCHAR(10) PRIMARY KEY,
    id_pesanan VARCHAR(10) NOT NULL UNIQUE REFERENCES pesanan(id_pesanan)
        ON UPDATE CASCADE ON DELETE CASCADE,
    metode_pembayaran VARCHAR(30) NOT NULL
        CHECK (metode_pembayaran IN ('QRIS', 'Transfer Bank', 'Bayar di Toko')),
    nominal_pembayaran NUMERIC(12, 2) NOT NULL CHECK (nominal_pembayaran >= 0),
    tanggal_bayar DATE NOT NULL DEFAULT CURRENT_DATE,
    status_pembayaran VARCHAR(30) NOT NULL DEFAULT 'Menunggu'
        CHECK (status_pembayaran IN ('Menunggu', 'Berhasil', 'Ditolak'))
);

CREATE TABLE nota (
    id_nota VARCHAR(10) PRIMARY KEY,
    id_pembayaran VARCHAR(10) NOT NULL UNIQUE REFERENCES pembayaran(id_pembayaran)
        ON UPDATE CASCADE ON DELETE CASCADE,
    no_nota VARCHAR(20) NOT NULL UNIQUE,
    tanggal_cetak DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE laporan_kasir (
    id_laporan_kasir VARCHAR(15) PRIMARY KEY,
    id_kasir VARCHAR(10) NOT NULL REFERENCES kasir(id_kasir)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    periode_awal DATE NOT NULL DEFAULT CURRENT_DATE,
    periode_akhir DATE NOT NULL DEFAULT CURRENT_DATE,
    bulan_laporan VARCHAR(30) DEFAULT 'Oktober 2026',
    jenis_laporan VARCHAR(20) NOT NULL CHECK (jenis_laporan IN ('Penjualan', 'Stok')),
    jumlah_produk INTEGER DEFAULT 0,
    total_stok INTEGER DEFAULT 0,
    jumlah_transaksi INTEGER DEFAULT 0,
    total_penjualan NUMERIC(14, 2) NOT NULL DEFAULT 0,
    status_penjualan VARCHAR(30) NOT NULL DEFAULT 'Menunggu Pemeriksaan'
);

CREATE TABLE laporan_owner (
    id_laporan_owner VARCHAR(15) PRIMARY KEY,
    id_owner VARCHAR(10) NOT NULL REFERENCES owner(id_owner)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    id_laporan_kasir VARCHAR(15) NOT NULL REFERENCES laporan_kasir(id_laporan_kasir)
        ON UPDATE CASCADE ON DELETE CASCADE,
    tanggal_periksa DATE NOT NULL DEFAULT CURRENT_DATE,
    catatan_evaluasi VARCHAR(255) NOT NULL,
    status_persetujuan VARCHAR(20) NOT NULL DEFAULT 'Disetujui'
        CHECK (status_persetujuan IN ('Menunggu', 'Disetujui', 'Direvisi'))
);

CREATE TABLE laporan_akhir (
    id_laporan_akhir VARCHAR(15) PRIMARY KEY,
    id_laporan_owner VARCHAR(15) NOT NULL REFERENCES laporan_owner(id_laporan_owner)
        ON UPDATE CASCADE ON DELETE CASCADE,
    tanggal_final DATE NOT NULL DEFAULT CURRENT_DATE,
    total_penjualan NUMERIC(14, 2) NOT NULL DEFAULT 0,
    jumlah_transaksi INTEGER NOT NULL DEFAULT 0
);
 
INSERT INTO pengguna (id_pengguna, username, password, role) VALUES
('PG001', 'admin', 'Amala123!', 'Admin'),
('PG002', 'kasir', 'Amala123!', 'Kasir'),
('PG003', 'nurul', 'Amala123!', 'Customer'),
('PG004', 'rafli', 'Amala123!', 'Customer'),
('PG005', 'zahra', 'Amala123!', 'Customer'),
('PG006', 'zizou', 'Amala123!', 'Customer'),
('PG007', 'dika', 'Amala123!', 'Customer'),
('PG008', 'owner', 'Amala123!', 'Owner');

INSERT INTO alamat (kode_pos, jalan, no_jalan, kelurahan, kecamatan, kota) VALUES
('25119', 'Jl. Niaga', '12', 'Kampung Pondok', 'Padang Barat', 'Padang'),
('25129', 'Jl. Jati Adabiah', '15', 'Jati', 'Padang Timur', 'Padang'),
('25132', 'Jl. Gajah Mada', '21', 'Air Tawar Barat', 'Padang Utara', 'Padang'),
('25173', 'Jl. Adinegoro', '30', 'Lubuk Buaya', 'Koto Tangah', 'Padang'),
('25137', 'Jl. Gajah Mada', '18', 'Gunung Pangilun', 'Padang Utara', 'Padang');

INSERT INTO admin (id_admin, id_pengguna, nama_admin, no_handphone, email_admin) VALUES
('ADM001', 'PG001', 'Admin Amala', '081234567801', 'adminboluamala@gmail.com');

INSERT INTO customer (id_customer, id_pengguna, nama_customer, no_handphone, jalan, no_jalan, kelurahan, kecamatan, kota, kode_pos, email_customer, poin) VALUES
('C001', 'PG003', 'Nurul Janatul Taqwa', '083191246035', 'Jl. Niaga', '12', 'Kampung Pondok', 'Padang Barat', 'Padang', '25119', 'nuruljanatultaqwa214@gmail.com', 10),
('C002', 'PG004', 'Rafli Raf Sanjani', '082182062598', 'Jl. Jati Adabiah', '15', 'Jati', 'Padang Timur', 'Padang', '25129', 'raflirafsanjani991@gmail.com', 15),
('C003', 'PG005', 'Azzahra Sifa Ahmad', '082174291590', 'Jl. Gajah Mada', '21', 'Air Tawar Barat', 'Padang Utara', 'Padang', '25132', 'azzara.sipaamad312@gmail.com', 5),
('C004', 'PG006', 'Zizou Azizi', '082432642590', 'Jl. Adinegoro', '30', 'Lubuk Buaya', 'Koto Tangah', 'Padang', '25173', 'zouazizi24@gmail.com', 0),
('C005', 'PG007', 'Muhammad Handika Pratama', '082169158989', 'Jl. Gajah Mada', '18', 'Gunung Pangilun', 'Padang Utara', 'Padang', '25137', 'mdika.21@gmail.com', 5);

INSERT INTO kasir (id_kasir, id_pengguna, nama_kasir, no_handphone, email_kasir) VALUES
('KSR001', 'PG002', 'Kasir Amala', '0812343287802', 'kasirboluamala@gmail.com');
 
INSERT INTO owner (id_owner, id_pengguna, nama_owner, no_handphone, email_owner) VALUES
('OWN001', 'PG008', 'Owner Amala', '081234967803', 'owner@boluamala.com');

 
INSERT INTO registrasi (id_registrasi, id_customer, tanggal_registrasi, status_registrasi) VALUES
('REG001', 'C001', '2026-10-01', 'Aktif'),
('REG002', 'C002', '2026-10-01', 'Aktif'),
('REG003', 'C003', '2026-10-01', 'Aktif'),
('REG004', 'C004', '2026-10-01', 'Aktif'),
('REG005', 'C005', '2026-10-01', 'Aktif');
 
INSERT INTO produk (id_produk, id_admin, nama_produk, kategori, harga, stok, deskripsi) VALUES
('P001', 'ADM001', 'Bolu Tapai', 'Bolu', 45000, 12, 'Bolu tapai khas Minang dengan tekstur lembut dan rasa manis alami, dibuat segar setiap hari.'),
('P002', 'ADM001', 'Brownies Kukus', 'Brownies', 55000, 3, 'Brownies kukus cokelat pekat dengan tekstur lembut dan lumer di mulut.'),
('P003', 'ADM001', 'Bolu Pisang', 'Bolu', 45000, 8, 'Bolu pisang panggang beraroma harum dengan potongan pisang asli pilihan.'),
('P004', 'ADM001', 'Brownies Pisang', 'Brownies', 55000, 12, 'Perpaduan brownies cokelat dan manisnya pisang segar khas Toko Kue Amala.'),
('P005', 'ADM001', 'Bolu Cokelat', 'Bolu', 50000, 20, 'Bolu cokelat klasik favorit keluarga dengan taburan choco chips.'),
('P006', 'ADM001', 'Bolu Keju', 'Bolu', 40000, 15, 'Bolu lembut dengan parutan keju cheddar melimpah di bagian atas.'),
('P007', 'ADM001', 'Bolu Pandan', 'Bolu', 45000, 18, 'Bolu pandan wangi dengan warna hijau alami dan rasa gurih santan.'),
('P008', 'ADM001', 'Bolu Karamel', 'Bolu', 55000, 12, 'Bolu sarang semut karamel dengan cita rasa manis legit yang khas.');
 
INSERT INTO pesanan (id_pesanan, id_customer, id_kasir, tanggal_pesanan, status_pesanan, total_tagihan) VALUES
('PS001', 'C001', 'KSR001', '2026-10-17', 'Diproses', 90000),
('PS002', 'C002', 'KSR001', '2026-10-17', 'Diproses', 45000),
('PS003', 'C003', 'KSR001', '2026-10-17', 'Selesai', 35000),
('PS004', 'C004', 'KSR001', '2026-10-18', 'Diproses', 55000),
('PS005', 'C005', 'KSR001', '2026-10-18', 'Selesai', 50000);
 
INSERT INTO detail_pesanan (id_detail_pesanan, id_pesanan, id_produk, jumlah, harga_satuan, subtotal) VALUES
('DP001', 'PS001', 'P005', 1, 50000, 50000),
('DP002', 'PS001', 'P006', 1, 40000, 40000),
('DP003', 'PS002', 'P001', 1, 45000, 45000),
('DP004', 'PS003', 'P003', 1, 35000, 35000),
('DP005', 'PS004', 'P002', 1, 55000, 55000),
('DP006', 'PS005', 'P005', 1, 50000, 50000);

INSERT INTO pembayaran (id_pembayaran, id_pesanan, metode_pembayaran, nominal_pembayaran, tanggal_bayar, status_pembayaran) VALUES
('BY001', 'PS001', 'QRIS', 90000, '2026-10-17', 'Berhasil'),
('BY002', 'PS002', 'Transfer Bank', 45000, '2026-10-17', 'Berhasil'),
('BY003', 'PS003', 'Bayar di Toko', 35000, '2026-10-17', 'Berhasil'),
('BY004', 'PS004', 'QRIS', 55000, '2026-10-18', 'Menunggu'),
('BY005', 'PS005', 'Transfer Bank', 50000, '2026-10-18', 'Berhasil');
 
INSERT INTO nota (id_nota, id_pembayaran, no_nota, tanggal_cetak) VALUES
('NT001', 'BY001', 'NOTA001', '2026-10-17'),
('NT002', 'BY002', 'NOTA002', '2026-10-17'),
('NT003', 'BY003', 'NOTA003', '2026-10-17'),
('NT004', 'BY004', 'NOTA004', '2026-10-18'),
('NT005', 'BY005', 'NOTA005', '2026-10-18');
 
INSERT INTO laporan_kasir (id_laporan_kasir, id_kasir, periode_awal, periode_akhir, bulan_laporan, jenis_laporan, jumlah_produk, total_stok, jumlah_transaksi, total_penjualan, status_penjualan) VALUES
('LK001', 'KSR001', '2026-10-17', '2026-10-18', 'Oktober 2026', 'Penjualan', 8, 100, 5, 275000, 'Menunggu Pemeriksaan'),
('RP-001', 'KSR001', '2026-10-01', '2026-10-31', 'Oktober 2026', 'Penjualan', 4, 35, 70, 3150000, 'Disetujui'),
('RS-001', 'KSR001', '2026-10-01', '2026-10-31', 'Oktober 2026', 'Stok', 4, 23, 0, 0, 'Disetujui');

INSERT INTO laporan_owner (id_laporan_owner, id_owner, id_laporan_kasir, tanggal_periksa, catatan_evaluasi, status_persetujuan) VALUES
('LO001', 'OWN001', 'LK001', '2026-10-19', 'Pemeriksaan laporan penjualan periode 17-18 Oktober 2026', 'Disetujui'),
('EV-001', 'OWN001', 'RP-001', '2026-10-31', 'Penjualan Brownies Naik, Tambah Produk Brownies', 'Disetujui'),
('EV-002', 'OWN001', 'RS-001', '2026-10-31', 'Penjualan Brownies Naik, Tambah Produk Brownies', 'Disetujui');
 
INSERT INTO laporan_akhir (id_laporan_akhir, id_laporan_owner, tanggal_final, total_penjualan, jumlah_transaksi) VALUES
('LA001', 'LO001', '2026-10-19', 275000, 5);

SELECT id_produk, nama_produk, kategori, harga, stok
FROM produk
WHERE stok > 0
ORDER BY harga ASC;

SELECT 
    p.id_pesanan,
    p.tanggal_pesanan,
    c.nama_customer,
    p.total_tagihan,
    byr.metode_pembayaran,
    byr.status_pembayaran,
    p.status_pesanan
FROM pesanan p
JOIN customer c ON p.id_customer = c.id_customer
LEFT JOIN pembayaran byr ON p.id_pesanan = byr.id_pesanan
ORDER BY p.id_pesanan ASC;

SELECT 
    COUNT(id_pesanan) AS jumlah_transaksi_pesanan,
    SUM(total_tagihan) AS total_nilai_penjualan
FROM pesanan;

SELECT 
    pr.nama_produk,
    SUM(dp.jumlah) AS total_terjual,
    ROUND(SUM(dp.jumlah * dp.harga_satuan), 2) AS total_pendapatan_produk
FROM produk pr
JOIN detail_pesanan dp ON pr.id_produk = dp.id_produk
GROUP BY pr.nama_produk
ORDER BY total_pendapatan_produk DESC;

