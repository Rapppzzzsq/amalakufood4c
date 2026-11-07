"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "./brand";
import { Modal, ModalTone } from "./modal";

type Category = "Bolu" | "Brownies";
type View = "Beranda" | "Katalog" | "Riwayat" | "Keranjang" | "Profil";
type PaymentMethod = "QRIS" | "Transfer Bank" | "Bayar di Toko";
type Product = {
  id: string;
  name: string;
  category: Category;
  price: number;
  stock: number;
  description: string;
  visual: string;
  art: string;
};
type CartLine = { product: Product; quantity: number };
type Order = {
  id: string;
  receipt: string;
  date: string;
  total: number;
  status: string;
  items: string[];
};

const products: Product[] = [
  { id: "PRD-001", name: "Bolu Tapai", category: "Bolu", price: 55000, stock: 12, description: "Bolu lembut dengan tapai pilihan, harum, manis, dan dipanggang segar setiap hari.", visual: "🍰", art: "gold" },
  { id: "PRD-002", name: "Brownies Kukus", category: "Brownies", price: 65000, stock: 8, description: "Brownies cokelat kukus yang moist dengan rasa cokelat pekat di setiap gigitan.", visual: "🍫", art: "chocolate" },
  { id: "PRD-003", name: "Bolu Pisang", category: "Bolu", price: 48000, stock: 15, description: "Bolu pisang rumahan yang lembut dengan aroma pisang matang yang menggoda.", visual: "🍌", art: "banana" },
  { id: "PRD-004", name: "Brownies Pisang", category: "Brownies", price: 70000, stock: 6, description: "Perpaduan brownies cokelat kaya rasa dengan pisang pilihan.", visual: "🍫", art: "berry" },
  { id: "PRD-005", name: "Bolu Pandan", category: "Bolu", price: 52000, stock: 10, description: "Bolu pandan harum bertekstur ringan, cocok untuk menemani waktu santai.", visual: "🍰", art: "pandan" },
  { id: "PRD-006", name: "Brownies Panggang", category: "Brownies", price: 68000, stock: 9, description: "Brownies panggang dengan lapisan atas renyah dan bagian dalam yang fudgy.", visual: "🍫", art: "brown" },
];

const initialOrders: Order[] = [
  { id: "PS-024", receipt: "NT-024", date: "7 November 2026", total: 120000, status: "Selesai", items: ["Bolu Tapai", "Brownies Kukus"] },
  { id: "PS-018", receipt: "NT-018", date: "2 November 2026", total: 55000, status: "Diproses", items: ["Bolu Tapai"] },
];

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

function ProductArtwork({ product }: { product: Product }) {
  return (
    <div className={`product-artwork cake-${product.art}`} aria-hidden="true">
      <span className="artwork-spark artwork-spark-one">✦</span>
      <span className="artwork-spark artwork-spark-two">✧</span>
      <span className="artwork-cake">{product.visual}</span>
      <span className="artwork-label">Fresh baked</span>
    </div>
  );
}

export default function CustomerDashboard() {
  const router = useRouter();
  const [view, setView] = useState<View>("Beranda");
  const [category, setCategory] = useState("Semua");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orders, setOrders] = useState(initialOrders);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("QRIS");
  const [checkout, setCheckout] = useState(false);
  const [profile, setProfile] = useState({
    name: "Amalia Putri",
    address: "Jl. Kue Amala No. 12, Padang",
    phone: "0812 3456 7890",
    username: "amalia.putri",
    email: "amalia@example.com",
  });
  const [profileDraft, setProfileDraft] = useState(profile);
  const [modal, setModal] = useState<{
    title: string;
    description: string;
    tone: ModalTone;
    action?: "logout";
  } | null>(null);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const categoryMatch = category === "Semua" || product.category === category;
        return categoryMatch && product.name.toLowerCase().includes(search.toLowerCase());
      }),
    [category, search],
  );
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const total = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

  function addToCart(product: Product, quantity: number) {
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.product.id === product.id
            ? { ...line, quantity: Math.min(product.stock, line.quantity + quantity) }
            : line,
        );
      }
      return [...current, { product, quantity: Math.min(product.stock, quantity) }];
    });
    setSelectedProduct(null);
  }

  function changeCartQuantity(id: string, delta: number) {
    setCart((current) =>
      current
        .map((line) =>
          line.product.id === id
            ? { ...line, quantity: Math.min(line.product.stock, line.quantity + delta) }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const number = String(25 + orders.length).padStart(3, "0");
    const order: Order = {
      id: `PS-${number}`,
      receipt: `NT-${number}`,
      date: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date()),
      total,
      status: paymentMethod === "Bayar di Toko" ? "Diproses" : "Menunggu Validasi",
      items: cart.map((line) => `${line.product.name} × ${line.quantity}`),
    };
    setOrders((current) => [order, ...current]);
    setCart([]);
    setCheckout(false);
    setView("Riwayat");
    setModal({
      title: "Pesanan berhasil!",
      description: `Pesanan #${order.id} sudah dicatat. Simpan nomor nota ${order.receipt} untuk melihat pesananmu.`,
      tone: "yellow",
    });
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfile(profileDraft);
    setModal({ title: "Profil berhasil diperbarui", description: "Perubahan informasi profilmu sudah tersimpan.", tone: "green" });
  }

  function modalAction() {
    if (modal?.action === "logout") {
      try {
        window.localStorage.removeItem("amalakufood-session");
        router.push("/pilih-peran");
      } catch {
        setModal({ title: "Tidak dapat keluar", description: "Sesi browser tidak dapat dihapus. Silakan coba kembali.", tone: "red" });
        return;
      }
    }
    setModal(null);
  }

  function renderCatalog() {
    return (
      <>
        <section className="customer-promo">
          <div className="promo-copy">
            <span className="promo-kicker">Dibuat fresh setiap hari</span>
            <h2>Kue segar setiap hari</h2>
            <p>Temukan rasa rumahan yang selalu bikin ingin kembali.</p>
            <button className="button button-dark promo-button" onClick={() => setView("Katalog")}>
              Jelajahi katalog <span aria-hidden="true">→</span>
            </button>
          </div>
          <div aria-hidden="true" className="promo-cake"><span>🍰</span><i>✦</i><b>♥</b></div>
          <div className="promo-stamp">Fresh<br />daily</div>
        </section>
        <section className="catalog-section">
          <div className="section-heading">
            <div><span className="eyebrow">Pilihan dari oven kami</span><h2>{view === "Katalog" ? "Semua kue favoritmu" : "Menu favorit"}</h2></div>
            <button className="text-link catalog-more" onClick={() => setView("Katalog")}>Lihat semua <span aria-hidden="true">→</span></button>
          </div>
          <div className="catalog-controls">
            <div aria-label="Filter kategori" className="category-filters">
              {["Semua", "Bolu", "Brownies"].map((item) => (
                <button aria-pressed={category === item} className={`category-chip ${category === item ? "is-selected" : ""}`} key={item} onClick={() => setCategory(item)}>{item}</button>
              ))}
            </div>
            <label className="catalog-search"><span aria-hidden="true">⌕</span><input aria-label="Cari produk" onChange={(event) => setSearch(event.target.value)} placeholder="Cari kue favorit..." value={search} /></label>
          </div>
          {filteredProducts.length ? (
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <button className="product-card" key={product.id} onClick={() => { setDetailQuantity(1); setSelectedProduct(product); }}>
                  <ProductArtwork product={product} />
                  <span className="product-meta"><span className="product-category">{product.category}</span><span className="stock-caption">{product.stock} tersedia</span></span>
                  <span className="product-name">{product.name}</span>
                  <span className="product-price">{rupiah(product.price)}</span>
                  <span className="product-open">Lihat detail <span aria-hidden="true">↗</span></span>
                </button>
              ))}
            </div>
          ) : <div className="empty-state">Tidak ada produk yang cocok dengan pencarianmu.</div>}
        </section>
      </>
    );
  }

  function renderCart() {
    if (checkout) {
      return (
        <section className="customer-page-section">
          <button className="text-link back-to-cart" onClick={() => setCheckout(false)}>← Kembali ke keranjang</button>
          <div className="section-heading"><div><span className="eyebrow">Langkah terakhir</span><h2>Checkout pesanan</h2></div></div>
          <form className="checkout-layout" onSubmit={placeOrder}>
            <div className="checkout-form-card">
              <h3>Alamat pengiriman</h3>
              <label className="form-field"><span>Nama penerima</span><input defaultValue={profile.name} required /></label>
              <label className="form-field"><span>Nomor handphone</span><input defaultValue={profile.phone} required type="tel" /></label>
              <label className="form-field"><span>Alamat lengkap</span><textarea defaultValue={profile.address} required rows={3} /></label>
              <h3 className="checkout-subheading">Metode pembayaran</h3>
              <div className="payment-options">
                {(["QRIS", "Transfer Bank", "Bayar di Toko"] as const).map((method) => (
                  <label className="payment-option" key={method}>
                    <input checked={paymentMethod === method} name="payment" onChange={() => setPaymentMethod(method)} type="radio" />
                    <span className="payment-option-mark">{method === "QRIS" ? "▦" : method === "Transfer Bank" ? "↗" : "⌂"}</span><span>{method}</span>
                  </label>
                ))}
              </div>
              {paymentMethod === "QRIS" ? <div className="qris-placeholder"><div aria-hidden="true" className="qris-symbol">▦</div><div><strong>Scan QRIS untuk membayar</strong><span>QR pembayaran demo · Total {rupiah(total)}</span></div></div> : null}
              {paymentMethod === "Transfer Bank" ? <div className="payment-instructions"><strong>Transfer ke Bank Amala</strong><span>Nomor rekening demo: 1234 5678 9012</span></div> : null}
            </div>
            <aside className="order-summary-card">
              <h3>Ringkasan pesanan</h3>
              {cart.map((line) => <div className="summary-line" key={line.product.id}><span>{line.product.name} × {line.quantity}</span><strong>{rupiah(line.product.price * line.quantity)}</strong></div>)}
              <div className="summary-total"><span>Total</span><strong>{rupiah(total)}</strong></div>
              <button className="button button-primary full-button" type="submit">Saya sudah bayar <span aria-hidden="true">→</span></button>
              <p className="summary-note">Pesanan akan dicatat untuk diperiksa oleh kasir.</p>
            </aside>
          </form>
        </section>
      );
    }
    return (
      <section className="customer-page-section">
        <div className="section-heading"><div><span className="eyebrow">Simpan kue pilihanmu</span><h2>Keranjang belanja</h2></div><span className="cart-count-label">{cartCount} item</span></div>
        {!cart.length ? (
          <div className="empty-state empty-cart"><span aria-hidden="true">🧺</span><h3>Keranjangmu masih kosong</h3><p>Yuk, pilih kue fresh dari oven kami.</p><button className="button button-primary" onClick={() => setView("Katalog")}>Lihat katalog</button></div>
        ) : (
          <div className="cart-layout">
            <div className="cart-lines">
              {cart.map((line) => (
                <article className="cart-line" key={line.product.id}>
                  <ProductArtwork product={line.product} />
                  <div className="cart-line-info"><span className="product-category">{line.product.category}</span><h3>{line.product.name}</h3><strong>{rupiah(line.product.price)}</strong></div>
                  <div className="quantity-control"><button aria-label={`Kurangi ${line.product.name}`} onClick={() => changeCartQuantity(line.product.id, -1)}>-</button><span>{line.quantity}</span><button aria-label={`Tambah ${line.product.name}`} onClick={() => changeCartQuantity(line.product.id, 1)}>+</button></div>
                  <button aria-label={`Hapus ${line.product.name} dari keranjang`} className="icon-button delete-icon" onClick={() => setCart((current) => current.filter((entry) => entry.product.id !== line.product.id))}>♲</button>
                </article>
              ))}
            </div>
            <aside className="order-summary-card"><h3>Ringkasan pesanan</h3><div className="summary-line"><span>Subtotal ({cartCount} item)</span><strong>{rupiah(total)}</strong></div><div className="summary-line"><span>Pengiriman</span><strong>Dihitung saat checkout</strong></div><div className="summary-total"><span>Total</span><strong>{rupiah(total)}</strong></div><button className="button button-primary full-button" onClick={() => setCheckout(true)}>Checkout <span aria-hidden="true">→</span></button></aside>
          </div>
        )}
      </section>
    );
  }

  function renderHistory() {
    return (
      <section className="customer-page-section">
        <div className="section-heading"><div><span className="eyebrow">Pesanan manis yang pernah dibuat</span><h2>Riwayat pesanan</h2></div></div>
        <div className="order-history-list">
          {orders.map((order) => (
            <article className="history-card" key={order.id}>
              <div className="history-icon" aria-hidden="true">🧁</div>
              <div className="history-main"><div className="history-title"><h3>#{order.id}</h3><span className={`status-pill ${order.status === "Selesai" ? "status-done" : ""}`}>{order.status}</span></div><p>{order.receipt} · {order.date}</p><span>{order.items.join(", ")}</span></div>
              <strong className="history-total">{rupiah(order.total)}</strong>
            </article>
          ))}
        </div>
      </section>
    );
  }

  function renderProfile() {
    return (
      <section className="customer-page-section">
        <div className="section-heading"><div><span className="eyebrow">Akun Amalakufood</span><h2>Profil saya</h2></div></div>
        <div className="profile-layout">
          <aside className="profile-summary"><div className="profile-avatar">{profile.name.split(" ").map((word) => word[0]).slice(0, 2).join("")}</div><h3>{profile.name}</h3><span>@{profile.username}</span><span className="profile-role">Customer</span>
            <button className="button button-primary full-button" onClick={() => { setProfileDraft(profile); setModal({ title: "Edit Profil", description: "Perbarui informasi profil customer kamu.", tone: "yellow" }); }}>Edit Profil</button>
            <button className="button button-outline full-button" onClick={() => setModal({ title: "Ingin Keluar?", description: "Kamu akan keluar dari akun Amalakufood di perangkat ini.", tone: "yellow", action: "logout" })}>Keluar</button>
          </aside>
          <div className="profile-details"><h3>Informasi pribadi</h3>{[["Nama lengkap", profile.name], ["Alamat", profile.address], ["No. handphone", profile.phone], ["Username", profile.username], ["Email", profile.email]].map(([label, value]) => <div className="profile-field" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
        </div>
      </section>
    );
  }

  const navItems: View[] = ["Beranda", "Katalog", "Riwayat"];
  return (
    <main className="customer-app">
      <header className="customer-navbar">
        <Link aria-label="Amalakufood, beranda" className="customer-logo" href="/customer"><Brand /></Link>
        <nav aria-label="Navigasi customer" className="customer-nav">
          {navItems.map((item) => <button aria-current={view === item ? "page" : undefined} className={`customer-nav-link ${view === item ? "is-active" : ""}`} key={item} onClick={() => { setCheckout(false); setView(item); }}>{item}</button>)}
        </nav>
        <div className="customer-actions">
          <label className="navbar-search"><span aria-hidden="true">⌕</span><input aria-label="Cari produk" onChange={(event) => setSearch(event.target.value)} placeholder="Cari..." value={search} /></label>
          <button className={`button cart-nav-button ${view === "Keranjang" ? "is-active" : ""}`} onClick={() => setView("Keranjang")}><span aria-hidden="true">▱</span> Keranjang <b>{cartCount}</b></button>
          <button aria-label="Profil" className="profile-nav-button" onClick={() => setView("Profil")}><span aria-hidden="true">A</span></button>
        </div>
      </header>
      <div className="customer-main">
        <div className="customer-greeting"><div><span className="eyebrow">{view === "Beranda" ? "Selamat datang, Amalia" : "Amalakufood"}</span><h1>{view === "Beranda" ? "Ada yang manis hari ini?" : view}</h1></div><span aria-hidden="true" className="greeting-decoration">✦</span></div>
        {view === "Beranda" || view === "Katalog" ? renderCatalog() : null}
        {view === "Keranjang" ? renderCart() : null}
        {view === "Riwayat" ? renderHistory() : null}
        {view === "Profil" ? renderProfile() : null}
      </div>
      <footer className="customer-footer">Amalakufood · Fresh From Our Oven</footer>

      {selectedProduct ? <Modal description={selectedProduct.description} onClose={() => setSelectedProduct(null)} title={selectedProduct.name}>
        <div className="product-detail"><ProductArtwork product={selectedProduct} /><div className="detail-meta"><span className="product-category">{selectedProduct.category}</span><span>{selectedProduct.stock} kue tersedia hari ini</span><strong>{rupiah(selectedProduct.price)}</strong></div></div>
        <div className="modal-actions detail-actions"><div className="quantity-control"><button aria-label="Kurangi jumlah" onClick={() => setDetailQuantity((qty) => Math.max(1, qty - 1))}>−</button><span>{detailQuantity}</span><button aria-label="Tambah jumlah" onClick={() => setDetailQuantity((qty) => Math.min(selectedProduct.stock, qty + 1))}>+</button></div><button className="button button-primary" onClick={() => addToCart(selectedProduct, detailQuantity)}>Tambah ke Keranjang</button></div>
      </Modal> : null}

      {modal ? <Modal description={modal.description} onClose={() => setModal(null)} title={modal.title} tone={modal.tone}>
        {modal.title === "Edit Profil" ? <form className="modal-form" onSubmit={saveProfile}>
          {(Object.entries(profileDraft) as [keyof typeof profileDraft, string][]).map(([field, value]) => <label className="form-field" key={field}><span>{field === "name" ? "Nama Lengkap" : field === "address" ? "Alamat" : field === "phone" ? "No. HP" : field === "username" ? "Username" : "Email"}</span><input onChange={(event) => setProfileDraft((current) => ({ ...current, [field]: event.target.value }))} required type={field === "email" ? "email" : "text"} value={value} /></label>)}
          <label className="form-field"><span>Password baru (opsional)</span><input autoComplete="new-password" placeholder="Biarkan kosong jika tidak diubah" type="password" /></label>
          <div className="modal-actions"><button className="button button-outline" onClick={() => setModal(null)} type="button">Cancel</button><button className="button button-primary" type="submit">Simpan</button></div>
        </form> : <div className="modal-actions">{modal.action === "logout" ? <><button className="button button-outline" onClick={() => setModal(null)}>Tidak</button><button className="button button-primary" onClick={modalAction}>Ya</button></> : <button className="button button-primary" onClick={modalAction}>Mengerti</button>}</div>}
      </Modal> : null}
    </main>
  );
}
