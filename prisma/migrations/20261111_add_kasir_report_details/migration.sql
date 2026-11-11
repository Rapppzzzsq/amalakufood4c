ALTER TABLE laporan_kasir
    ADD COLUMN id_produk VARCHAR(10),
    ADD COLUMN stok_awal INTEGER,
    ADD COLUMN jumlah_keluar INTEGER,
    ADD COLUMN stok_akhir INTEGER,
    ADD COLUMN status_stok VARCHAR(20),
    ADD COLUMN catatan_kasir VARCHAR(255);

ALTER TABLE laporan_kasir
    ADD CONSTRAINT laporan_kasir_id_produk_fkey
        FOREIGN KEY (id_produk) REFERENCES produk(id_produk)
        ON UPDATE CASCADE ON DELETE SET NULL,
    ADD CONSTRAINT laporan_kasir_status_stok_check
        CHECK (status_stok IS NULL OR status_stok IN ('Aman', 'Menipis', 'Habis')),
    ADD CONSTRAINT laporan_kasir_stok_awal_check
        CHECK (stok_awal IS NULL OR stok_awal >= 0),
    ADD CONSTRAINT laporan_kasir_jumlah_keluar_check
        CHECK (jumlah_keluar IS NULL OR jumlah_keluar >= 0),
    ADD CONSTRAINT laporan_kasir_stok_akhir_check
        CHECK (stok_akhir IS NULL OR stok_akhir >= 0);

ALTER TABLE pembayaran
    ADD COLUMN konfirmasi_customer BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE pembayaran
SET konfirmasi_customer = TRUE
WHERE status_pembayaran = 'Menunggu';
