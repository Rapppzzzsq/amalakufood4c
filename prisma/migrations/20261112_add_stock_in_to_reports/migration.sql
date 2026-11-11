ALTER TABLE laporan_kasir
    ADD COLUMN stok_masuk INTEGER,
    ADD CONSTRAINT laporan_kasir_stok_masuk_check
        CHECK (stok_masuk IS NULL OR stok_masuk >= 0),
    ADD CONSTRAINT laporan_kasir_stock_balance_check
        CHECK (
            stok_awal IS NULL
            OR stok_masuk IS NULL
            OR jumlah_keluar IS NULL
            OR stok_akhir IS NULL
            OR stok_akhir = stok_awal + stok_masuk - jumlah_keluar
        );
