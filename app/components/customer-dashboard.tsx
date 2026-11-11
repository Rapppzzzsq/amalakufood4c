"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "./brand";
import { Modal, ModalTone } from "./modal";
import { apiJson, apiRequest, ApiRequestError } from "../lib/api";
import { getProductImage } from "../lib/product-assets";
import { PasswordField } from "./password-field";

type Category = string;
type View = "Beranda" | "Katalog" | "Riwayat" | "Keranjang" | "Profil";
type PaymentMethod = "QRIS" | "Transfer Bank" | "Bayar di Toko";
type Product = {
  id: string;
  name: string;
  category: Category;
  price: number;
  stock: number;
  description: string;
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
type CheckoutOrder = { id: string; receipt: string; total: number; paymentMethod: PaymentMethod };
const bankAccounts = [
  { bank: "Bank BCA", number: "1234-567-890" },
  { bank: "Bank Mandiri", number: "111-00-2233445-5" },
];

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

function ProductArtwork({ product }: { product: Product }) {
  const image = getProductImage(product.id, product.name);

  return (
    <div className="product-artwork">
      {image ? <img className="product-photo" src={image} alt={product.name} /> : null}
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
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("QRIS");
  const [checkout, setCheckout] = useState(false);
  const [checkoutOrder, setCheckoutOrder] = useState<CheckoutOrder | null>(null);
  const [copyNotice, setCopyNotice] = useState("");
  const [copyFailed, setCopyFailed] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    address: "",
    phone: "",
    username: "",
    email: "",
  });
  const [profileDraft, setProfileDraft] = useState(profile);
  const [modal, setModal] = useState<{
    title: string;
    description: string;
    tone: ModalTone;
    action?: "logout";
  } | null>(null);

  const reloadData = useCallback(async () => {
    try {
      const [{ user }, { products: productRows }, { orders: orderRows }] = await Promise.all([
        apiRequest<{ user: { role: string; name: string; address?: string; phone: string; username: string; email: string } }>("/api/auth"),
        apiRequest<{ products: Product[] }>("/api/produk"),
        apiRequest<{ orders: { id: string; receipt: string; date: string; total: number; status: string; items: { product: string; quantity: number }[] }[] }>("/api/pesanan"),
      ]);
      setLoadError("");
      if (user.role !== "customer") {
        router.replace("/login?role=customer");
        return;
      }

      const customerProfile = {
        name: user.name,
        address: user.address ?? "",
        phone: user.phone,
        username: user.username,
        email: user.email,
      };
      setProfile(customerProfile);
      setProfileDraft(customerProfile);
      setProducts(productRows);
      setOrders(orderRows.map((order) => ({
        ...order,
        date: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(order.date)),
        items: order.items.map((item) => `${item.product} × ${item.quantity}`),
      })));
    } catch (error) {
      if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
        router.replace("/login?role=customer");
        return;
      }
      setLoadError(error instanceof Error ? error.message : "Data tidak dapat dimuat.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void reloadData(), 0);
    return () => window.clearTimeout(timer);
  }, [reloadData]);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const categoryMatch = category === "Semua" || product.category === category;
        return getProductImage(product.id, product.name) !== null
          && categoryMatch
          && product.name.toLowerCase().includes(search.toLowerCase());
      }),
    [category, products, search],
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

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsSubmitting(true);
    try {
      const { order } = await apiRequest<{ order: { id: string; receipt: string } }>("/api/pesanan", apiJson("POST", {
        items: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
        paymentMethod,
        name: form.get("name"),
        phone: form.get("phone"),
        address: form.get("address"),
      }));
      await reloadData();
      setCart([]);
      setCheckoutOrder({ id: order.id, receipt: order.receipt, total, paymentMethod });
    } catch (error) {
      setModal({ title: "Checkout gagal", description: error instanceof Error ? error.message : "Pesanan tidak dapat disimpan.", tone: "red" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyBankAccount(accountNumber: string) {
    try {
      await navigator.clipboard.writeText(accountNumber.replaceAll("-", ""));
      setCopyFailed(false);
      setCopyNotice("Nomor rekening disalin!");
      window.setTimeout(() => setCopyNotice(""), 2500);
    } catch (error) {
      setCopyFailed(true);
      setCopyNotice(error instanceof Error ? "Nomor rekening gagal disalin. Salin secara manual." : "Nomor rekening gagal disalin.");
    }
  }

  async function confirmPayment() {
    if (!checkoutOrder) return;
    setIsSubmitting(true);
    try {
      await apiRequest("/api/pesanan", apiJson("PATCH", { id: checkoutOrder.id, action: "customer-confirm" }));
      setCheckout(false);
      setCheckoutOrder(null);
      setView("Riwayat");
      setModal({
        title: "Pesanan berhasil!",
        description: `Pesanan #${checkoutOrder.id} sudah dicatat. Pembayaran akan diperiksa Kasir. Nomor nota ${checkoutOrder.receipt}.`,
        tone: "yellow",
      });
    } catch (error) {
      setModal({ title: "Konfirmasi belum tersimpan", description: error instanceof Error ? error.message : "Silakan coba kembali.", tone: "red" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = new FormData(event.currentTarget).get("password");
    try {
      await apiRequest("/api/customer", apiJson("PUT", {
        ...profileDraft,
        ...(typeof password === "string" && password ? { password } : {}),
      }));
      await reloadData();
      setModal({ title: "Profil berhasil diperbarui", description: "Perubahan informasi profilmu sudah tersimpan.", tone: "green" });
    } catch (error) {
      setModal({ title: "Profil tidak dapat diperbarui", description: error instanceof Error ? error.message : "Silakan coba kembali.", tone: "red" });
    }
  }

  async function modalAction() {
    if (modal?.action === "logout") {
      try {
        await apiRequest("/api/auth", apiJson("POST", { action: "logout" }));
        router.push("/pilih-peran");
      } catch (error) {
        setModal({ title: "Tidak dapat keluar", description: error instanceof Error ? error.message : "Silakan coba kembali.", tone: "red" });
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
          <div aria-hidden="true" className="promo-cake"><img src="/logo-amala.png" alt="Logo Amalakufood" /></div>
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
    if (checkoutOrder) {
      return (
        <section className="customer-page-section payment-confirmation">
          <button className="text-link back-to-cart" onClick={() => { setCheckoutOrder(null); setCheckout(false); setView("Riwayat"); }}>← Lihat riwayat pesanan</button>
          <div className="section-heading"><div><span className="eyebrow">Pembayaran pesanan</span><h2>{checkoutOrder.paymentMethod}</h2></div></div>
          <article className="payment-confirmation-card">
            <div className="payment-reference">
              <span>Kode pesanan / referensi</span>
              <strong>#{checkoutOrder.id}</strong>
              <small>No. nota {checkoutOrder.receipt}</small>
            </div>
            {checkoutOrder.paymentMethod === "QRIS" ? (
              <div className="qris-payment">
                <h3>Scan QRIS untuk membayar</h3>
                <img src="/qris-amala.jpg" alt="QRIS Amalakufood" />
                <p>Scan QRIS Toko Kue Amala di atas menggunakan aplikasi m-banking atau e-wallet Anda.</p>
                <strong className="payment-amount">{rupiah(checkoutOrder.total)}</strong>
              </div>
            ) : null}
            {checkoutOrder.paymentMethod === "Transfer Bank" ? (
              <div className="bank-payment">
                <h3>Rekening tujuan</h3>
                <p className="bank-account-owner">a.n. <strong>Toko Kue Amala (Amalakufood)</strong></p>
                {bankAccounts.map((account) => (
                  <div className="bank-account" key={account.bank}>
                    <span>{account.bank}</span>
                    <strong>{account.number}</strong>
                    <button className="button button-outline" onClick={() => void copyBankAccount(account.number)} type="button">Salin No. Rekening</button>
                  </div>
                ))}
                {copyNotice ? <p className={`copy-notice ${copyFailed ? "copy-notice-error" : ""}`} role={copyFailed ? "alert" : "status"}>{copyNotice}</p> : null}
                <p>Transfer sesuai total tagihan dan cantumkan kode pesanan sebagai referensi pembayaran.</p>
                <div className="payment-total-row"><span>Kode referensi</span><strong>{checkoutOrder.id}</strong></div>
                <div className="payment-total-row"><span>Total tagihan</span><strong>{rupiah(checkoutOrder.total)}</strong></div>
              </div>
            ) : null}
            {checkoutOrder.paymentMethod === "Bayar di Toko" ? (
              <div className="store-payment">
                <h3>Pembayaran di Kasir</h3>
                <p>Tunjukkan kode pesanan ini kepada kasir Toko Kue Amala saat mengambil pesanan. Siapkan pembayaran tunai sesuai total tagihan.</p>
                <div className="payment-total-row"><span>Kode pesanan</span><strong>#{checkoutOrder.id}</strong></div>
                <div className="payment-total-row"><span>Total tagihan tunai</span><strong>{rupiah(checkoutOrder.total)}</strong></div>
              </div>
            ) : null}
            <button className="button button-primary full-button" disabled={isSubmitting} onClick={() => void confirmPayment()} type="button">
              {isSubmitting ? "Menyimpan konfirmasi..." : checkoutOrder.paymentMethod === "Bayar di Toko" ? "Konfirmasi Pesanan" : "Saya Sudah Bayar"}
              <span aria-hidden="true">→</span>
            </button>
            <p className="payment-review-note">Status pembayaran akan tetap menunggu verifikasi Kasir.</p>
          </article>
        </section>
      );
    }

    if (checkout) {
      return (
        <section className="customer-page-section">
          <button className="text-link back-to-cart" onClick={() => setCheckout(false)}>← Kembali ke keranjang</button>
          <div className="section-heading"><div><span className="eyebrow">Langkah terakhir</span><h2>Checkout pesanan</h2></div></div>
          <form className="checkout-layout" onSubmit={placeOrder}>
            <div className="checkout-form-card">
              <h3>Alamat pengiriman</h3>
              <label className="form-field"><span>Nama penerima</span><input defaultValue={profile.name} name="name" required /></label>
              <label className="form-field"><span>Nomor handphone</span><input defaultValue={profile.phone} name="phone" required type="tel" /></label>
              <label className="form-field"><span>Alamat lengkap</span><textarea defaultValue={profile.address} maxLength={100} name="address" required rows={3} /></label>
              <h3 className="checkout-subheading">Metode pembayaran</h3>
              <div className="payment-options">
                {(["QRIS", "Transfer Bank", "Bayar di Toko"] as const).map((method) => (
                  <label className="payment-option" key={method}>
                    <input checked={paymentMethod === method} name="payment" onChange={() => setPaymentMethod(method)} type="radio" />
                    <span className="payment-option-mark">{method === "QRIS" ? "▦" : method === "Transfer Bank" ? "↗" : "⌂"}</span><span>{method}</span>
                  </label>
                ))}
              </div>
              <div className="payment-total-row"><span>Total pembayaran</span><strong>{rupiah(total)}</strong></div>
            </div>
            <aside className="order-summary-card">
              <h3>Ringkasan pesanan</h3>
              {cart.map((line) => <div className="summary-line" key={line.product.id}><span>{line.product.name} × {line.quantity}</span><strong>{rupiah(line.product.price * line.quantity)}</strong></div>)}
              <div className="summary-total"><span>Total</span><strong>{rupiah(total)}</strong></div>
              <button className="button button-primary full-button" disabled={isSubmitting} type="submit">{isSubmitting ? "Menyimpan pesanan..." : "Buat Pesanan & Lanjutkan Pembayaran"} <span aria-hidden="true">→</span></button>
              <p className="summary-note">Setelah pesanan dicatat, ikuti instruksi pembayaran dan konfirmasi untuk mengirimnya ke Kasir.</p>
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
              <div className="history-icon" aria-hidden="true"><img src="/logo-amala.png" alt="Logo Amalakufood" /></div>
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
        <div className="customer-greeting"><div><span className="eyebrow">{view === "Beranda" ? `Selamat datang, ${profile.name || "Customer"}` : "Amalakufood"}</span><h1>{view === "Beranda" ? "Ada yang manis hari ini?" : view}</h1></div><span aria-hidden="true" className="greeting-decoration">✦</span></div>
        {isLoading ? <div className="empty-state">Memuat data Amalakufood...</div> : null}
        {loadError ? <div className="empty-state" role="alert">{loadError} <button className="text-link" onClick={() => void reloadData()}>Coba lagi</button></div> : null}
        {!isLoading && !loadError ? <>
          {view === "Beranda" || view === "Katalog" ? renderCatalog() : null}
          {view === "Keranjang" ? renderCart() : null}
          {view === "Riwayat" ? renderHistory() : null}
          {view === "Profil" ? renderProfile() : null}
        </> : null}
      </div>
      <footer className="customer-footer">Amalakufood · Fresh From Our Oven</footer>

      {selectedProduct ? <Modal description={selectedProduct.description} onClose={() => setSelectedProduct(null)} title={selectedProduct.name}>
        <div className="product-detail"><ProductArtwork product={selectedProduct} /><div className="detail-meta"><span className="product-category">{selectedProduct.category}</span><span>{selectedProduct.stock} kue tersedia hari ini</span><strong>{rupiah(selectedProduct.price)}</strong></div></div>
        <div className="modal-actions detail-actions"><div className="quantity-control"><button aria-label="Kurangi jumlah" onClick={() => setDetailQuantity((qty) => Math.max(1, qty - 1))}>−</button><span>{detailQuantity}</span><button aria-label="Tambah jumlah" onClick={() => setDetailQuantity((qty) => Math.min(selectedProduct.stock, qty + 1))}>+</button></div><button className="button button-primary" onClick={() => addToCart(selectedProduct, detailQuantity)}>Tambah ke Keranjang</button></div>
      </Modal> : null}

      {modal ? <Modal description={modal.description} onClose={() => setModal(null)} title={modal.title} tone={modal.tone}>
        {modal.title === "Edit Profil" ? <form className="modal-form" onSubmit={saveProfile}>
          {(Object.entries(profileDraft) as [keyof typeof profileDraft, string][]).map(([field, value]) => <label className="form-field" key={field}><span>{field === "name" ? "Nama Lengkap" : field === "address" ? "Alamat" : field === "phone" ? "No. HP" : field === "username" ? "Username" : "Email"}</span><input onChange={(event) => setProfileDraft((current) => ({ ...current, [field]: event.target.value }))} required type={field === "email" ? "email" : "text"} value={value} /></label>)}
          <label className="form-field"><span>Password baru (opsional)</span><PasswordField autoComplete="new-password" name="password" placeholder="Biarkan kosong jika tidak diubah" /></label>
          <div className="modal-actions"><button className="button button-outline" onClick={() => setModal(null)} type="button">Cancel</button><button className="button button-primary" type="submit">Simpan</button></div>
        </form> : <div className="modal-actions">{modal.action === "logout" ? <><button className="button button-outline" onClick={() => setModal(null)}>Tidak</button><button className="button button-primary" onClick={modalAction}>Ya</button></> : <button className="button button-primary" onClick={modalAction}>Mengerti</button>}</div>}
      </Modal> : null}
    </main>
  );
}
