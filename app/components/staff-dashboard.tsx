"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "./brand";
import { Modal, ModalTone } from "./modal";
import { UserRole } from "../lib/roles";
import { apiJson, apiRequest, ApiRequestError } from "../lib/api";
import { getProductImage } from "../lib/product-assets";

type StaffRole = Extract<UserRole, "admin" | "kasir" | "owner">;
type ReportType = "Stok" | "Penjualan";
type Product = { id: string; name: string; category: string; price: number; stock: number; description: string };
type Customer = { id: string; name: string; phone: string; email: string; address: string; points: number };
type Order = { id: string; receipt: string; customer: string; date: string; total: number; status: string; payment: string; paymentStatus: string; items: string[]; itemDetails?: { product: string; quantity: number; subtotal: number }[] };
type Report = { id: string; type: ReportType; period: string; amount: string; status: string; startDate?: string; endDate?: string };
type Evaluation = { id: string; report: string; note: string; date: string };
type Dialog = { title: string; description?: string; tone?: ModalTone; kind?: string; id?: string };

const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

function dashboardMenu(role: StaffRole) {
  if (role === "admin") return ["Beranda", "Data Produk", "Data Customer", "Profil Admin"];
  if (role === "kasir") return ["Beranda", "Transaksi Pemesanan", "Validasi Pembayaran", "Bukti Pembayaran", "Laporan Stok", "Laporan Penjualan", "Profil Kasir"];
  return ["Beranda", "Rekap Laporan Penjualan", "Rekap Laporan Stok", "Evaluasi Laporan", "Data Produk & Stok", "Data Customer", "Profil Owner"];
}

function roleName(role: StaffRole) {
  return role === "admin" ? "Admin" : role === "kasir" ? "Kasir" : "Owner";
}

function StaffProductImage({ product }: { product: Product }) {
  const image = getProductImage(product.id, product.name);

  return (
    <div className="staff-product-art">
      {image ? <img src={image} alt={product.name} /> : null}
    </div>
  );
}

export default function StaffDashboard({ role }: { role: StaffRole }) {
  const router = useRouter();
  const name = roleName(role);
  const [employeeId, setEmployeeId] = useState("");
  const [view, setView] = useState("Beranda");
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [orderSummary, setOrderSummary] = useState({ transactionCount: 0, totalSales: 0, todayTransactionCount: 0 });
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [profile, setProfile] = useState({ name: "", phone: "", email: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [evaluationText, setEvaluationText] = useState("");

  const menu = dashboardMenu(role);
  const todayLabel = role === "admin" ? "Ruang kerja Amalakufood" : "Ringkasan kerja";

  const loadData = useCallback(async () => {
    try {
      const { user } = await apiRequest<{ user: { role: string; profileId: string; name: string; phone: string; email: string } }>("/api/auth");
      if (user.role !== role) {
        router.replace(`/login?role=${role}`);
        return;
      }
      setEmployeeId(user.profileId);
      setProfile({ name: user.name, phone: user.phone, email: user.email });

      const [productData, customerData, orderData, reportData] = await Promise.all([
        apiRequest<{ products: Product[] }>("/api/produk"),
        role === "admin" || role === "owner"
          ? apiRequest<{ customers: Customer[] }>("/api/customer")
          : Promise.resolve({ customers: [] as Customer[] }),
        role === "kasir" || role === "owner"
          ? apiRequest<{ orders: { id: string; receipt: string; customer: string; date: string; total: number; status: string; payment: string; paymentStatus: string; items: { product: string; quantity: number; subtotal: number }[] }[]; summary: { transactionCount: number; totalSales: number; todayTransactionCount: number } }>("/api/pesanan")
          : Promise.resolve({ orders: [] as { id: string; receipt: string; customer: string; date: string; total: number; status: string; payment: string; paymentStatus: string; items: { product: string; quantity: number; subtotal: number }[] }[], summary: { transactionCount: 0, totalSales: 0, todayTransactionCount: 0 } }),
        role === "kasir" || role === "owner"
          ? apiRequest<{ reports: Report[]; evaluations: { id: string; report: string; note: string; date: string }[] }>("/api/laporan")
          : Promise.resolve({ reports: [] as Report[], evaluations: [] as { id: string; report: string; note: string; date: string }[] }),
      ]);
      setProducts(productData.products);
      setCustomers(customerData.customers);
      setLoadError("");
      setOrderSummary(orderData.summary);
      setOrders(orderData.orders.map((order) => ({
        ...order,
        date: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(order.date)),
        items: order.items.map((item) => `${item.product} × ${item.quantity}`),
        itemDetails: order.items,
      })));
      setReports(reportData.reports.map((report) => ({ ...report, type: report.type as ReportType })));
      setEvaluations(reportData.evaluations.map((item) => ({
        ...item,
        date: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(item.date)),
      })));
    } catch (error) {
      if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
        router.replace(`/login?role=${role}`);
        return;
      }
      setLoadError(error instanceof Error ? error.message : "Data tidak dapat dimuat.");
    } finally {
      setIsLoading(false);
    }
  }, [role, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  function closeDialog() {
    setDialog(null);
  }

  function openDelete(kind: string, id: string, label: string) {
    setDialog({ title: `Hapus ${label}?`, description: `Data ${label.toLowerCase()} ini akan dihapus secara permanen.`, kind: `delete-${kind}`, id });
  }

  async function confirmDelete() {
    if (!dialog?.id) return;
    const config = {
      "delete-product": ["/api/produk?id=", "report"] as const,
      "delete-customer": ["/api/customer?id=", "report"] as const,
      "delete-order": ["/api/pesanan?id=", "report"] as const,
      "delete-report": ["/api/laporan?id=", "report"] as const,
      "delete-evaluation": ["/api/laporan?kind=evaluation&id=", "report"] as const,
    }[dialog.kind as "delete-product" | "delete-customer" | "delete-order" | "delete-report" | "delete-evaluation"];
    if (!config) return;
    try {
      await apiRequest(`${config[0]}${encodeURIComponent(dialog.id)}`, { method: "DELETE" });
      await loadData();
      setDialog({ title: "Data berhasil dihapus", description: "Perubahan sudah tersimpan.", tone: "green" });
    } catch (error) {
      setDialog({ title: "Data tidak dapat dihapus", description: error instanceof Error ? error.message : "Silakan coba kembali.", tone: "red" });
    }
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const product = {
      name: String(form.get("name") ?? "").trim(),
      category: String(form.get("category") ?? ""),
      price: Number(form.get("price")),
      stock: Number(form.get("stock")),
      description: String(form.get("description") ?? "").trim(),
    };
    if (!product.name || !Number.isFinite(product.price) || !Number.isFinite(product.stock)) return;
    const editing = dialog?.kind === "edit-product";
    try {
      await apiRequest("/api/produk", apiJson(editing ? "PUT" : "POST", editing ? { id: dialog.id, ...product } : product));
      await loadData();
      setDialog({ title: editing ? "Produk berhasil diperbarui" : "Produk berhasil ditambahkan", tone: "green" });
    } catch (error) {
      setDialog({ title: "Produk tidak dapat disimpan", description: error instanceof Error ? error.message : "Silakan coba kembali.", tone: "red" });
    }
  }

  async function submitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog?.id) return;
    const form = new FormData(event.currentTarget);
    const changes = {
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      address: String(form.get("address") ?? ""),
    };
    try {
      await apiRequest("/api/customer", apiJson("PUT", { id: dialog.id, ...changes }));
      await loadData();
      setDialog({ title: "Data customer berhasil diperbarui", tone: "green" });
    } catch (error) {
      setDialog({ title: "Data customer tidak dapat disimpan", description: error instanceof Error ? error.message : "Silakan coba kembali.", tone: "red" });
    }
  }

  async function submitPoints(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog?.id) return;
    const points = Number(new FormData(event.currentTarget).get("points"));
    if (!Number.isInteger(points) || points < 0) return;
    try {
      await apiRequest("/api/customer", apiJson("PUT", { action: "points", id: dialog.id, points }));
      await loadData();
      setDialog({ title: "Poin berhasil diperbarui", tone: "green" });
    } catch (error) {
      setDialog({ title: "Poin tidak dapat diperbarui", description: error instanceof Error ? error.message : "Silakan coba kembali.", tone: "red" });
    }
  }

  async function submitOrderStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog?.id) return;
    const status = String(new FormData(event.currentTarget).get("status"));
    try {
      await apiRequest("/api/pesanan", apiJson("PUT", { id: dialog.id, action: "status", status }));
      await loadData();
      setDialog({ title: "Status pesanan berhasil diubah", tone: "green" });
    } catch (error) {
      setDialog({ title: "Status pesanan tidak dapat diubah", description: error instanceof Error ? error.message : "Silakan coba kembali.", tone: "red" });
    }
  }

  async function updateOrder(id: string, status: string, paymentStatus?: string) {
    try {
      const body = paymentStatus
        ? { id, action: "payment", status: paymentStatus }
        : { id, action: "validate", status };
      await apiRequest("/api/pesanan", apiJson("PUT", body));
      await loadData();
      setDialog({ title: paymentStatus === "Ditolak" ? "Pembayaran Ditolak" : paymentStatus ? "Pembayaran berhasil divalidasi" : "Pesanan berhasil divalidasi", tone: paymentStatus === "Ditolak" ? "red" : "green" });
    } catch (error) {
      setDialog({ title: "Pesanan tidak dapat diperbarui", description: error instanceof Error ? error.message : "Silakan coba kembali.", tone: "red" });
    }
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const existingReport = reports.find((item) => item.id === dialog?.id);
    const reportType = existingReport?.type ?? (dialog?.kind === "report-stock" ? "Stok" : "Penjualan");
    const payload = {
      type: reportType,
      period: String(form.get("period") ?? ""),
      startDate: String(form.get("startDate") ?? ""),
      endDate: String(form.get("endDate") ?? ""),
    };
    try {
      await apiRequest("/api/laporan", apiJson(dialog?.id ? "PUT" : "POST", dialog?.id
        ? { action: "update-report", id: dialog.id, ...payload }
        : { action: "report", ...payload }));
      await loadData();
      setDialog({ title: dialog?.id ? "Laporan berhasil diperbarui" : "Laporan berhasil ditambahkan", tone: "green" });
    } catch (error) {
      setDialog({ title: "Laporan tidak dapat disimpan", description: error instanceof Error ? error.message : "Silakan coba kembali.", tone: "red" });
    }
  }

  async function submitEvaluation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const note = String(form.get("note") ?? "").trim();
    if (!note) return;
    const editing = dialog?.kind === "edit-evaluation" && dialog.id;
    const reportId = String(form.get("report") ?? "");
    try {
      await apiRequest("/api/laporan", apiJson(editing ? "PUT" : "POST", editing
        ? { action: "update-evaluation", id: dialog.id, note }
        : { action: "evaluation", reportId, note }));
      await loadData();
      setEvaluationText("");
      setDialog({ title: "Evaluasi berhasil disimpan", tone: "green" });
    } catch (error) {
      setDialog({ title: "Evaluasi tidak dapat disimpan", description: error instanceof Error ? error.message : "Silakan coba kembali.", tone: "red" });
    }
  }

  async function approveReport(report: Report) {
    try {
      await apiRequest("/api/laporan", apiJson("PUT", { action: "approve", reportId: report.id }));
      await loadData();
      setDialog({ title: "Rekapan Laporan Disetujui", description: `${report.id} · ${report.period} sudah disetujui.`, tone: "green" });
    } catch (error) {
      setDialog({ title: "Laporan tidak dapat disetujui", description: error instanceof Error ? error.message : "Silakan coba kembali.", tone: "red" });
    }
  }

  async function logout() {
    try {
      await apiRequest("/api/auth", apiJson("POST", { action: "logout" }));
      router.push("/pilih-peran");
    } catch (error) {
      setDialog({ title: "Tidak dapat keluar", description: error instanceof Error ? error.message : "Silakan coba kembali.", tone: "red" });
    }
  }

  function printDocument(successTitle: string) {
    window.print();
    setDialog({ title: successTitle, description: "Dokumen siap disimpan sebagai PDF atau dicetak dari dialog cetak browser.", tone: "green" });
  }

  async function printReceipt(orderId: string) {
    try {
      await apiRequest("/api/pesanan", apiJson("PUT", { id: orderId, action: "print" }));
      window.print();
      await loadData();
      setDialog({ title: "Nota berhasil dicetak", description: "Tanggal cetak nota sudah disimpan.", tone: "green" });
    } catch (error) {
      setDialog({ title: "Nota tidak dapat dicetak", description: error instanceof Error ? error.message : "Silakan coba kembali.", tone: "red" });
    }
  }

  function renderOverview() {
    const cards = role === "admin"
      ? [{ label: "Produk aktif", value: String(products.length), icon: "✿" }, { label: "Customer", value: String(customers.length), icon: "♙" }]
      : role === "kasir"
        ? [{ label: "Pesanan hari ini", value: String(orderSummary.todayTransactionCount), icon: "▤" }, { label: "Stok hari ini", value: String(products.reduce((sum, item) => sum + item.stock, 0)), icon: "▧" }]
        : [{ label: "Penjualan", value: money(orderSummary.totalSales), icon: "↗" }, { label: "Pesanan", value: String(orderSummary.transactionCount), icon: "▤" }, { label: "Stok Menipis", value: String(products.filter((item) => item.stock < 8).length), icon: "!" }, { label: "Customer", value: String(customers.length), icon: "♙" }];
    return (
      <>
        <section className="staff-welcome">
          <div><span className="eyebrow">{role === "owner" ? "Ringkasan usaha" : "Dashboard Amalakufood"}</span><h2>{role === "owner" ? `Halo, ${name} ${employeeId}` : `Selamat bekerja, ${name} ${employeeId}`}</h2><p>{role === "owner" ? "Pantau perkembangan usaha Toko Kue Amala hari ini." : "Semoga harimu produktif dan penuh hal manis."}</p></div>
          <span aria-hidden="true" className="welcome-cake"><img src="/logo-amala.png" alt="Logo Amalakufood" /></span>
        </section>
        <div className={`summary-grid summary-${role}`}>
          {cards.map((card) => <article className="staff-summary-card" key={card.label}><span className="summary-icon">{card.icon}</span><span>{card.label}</span><strong>{card.value}</strong><small>Data terkini</small></article>)}
        </div>
        <section className="staff-recent"><div className="staff-section-heading"><div><span className="eyebrow">Aktivitas terbaru</span><h3>Pesanan terakhir</h3></div>{role === "kasir" ? <button className="text-link" onClick={() => setView("Transaksi Pemesanan")}>Lihat semua →</button> : null}</div>
          {orders.slice(0, 3).map((order) => <div className="recent-row" key={order.id}><span className="recent-order-mark">PS</span><span><strong>#{order.id}</strong><small>{order.customer} · {order.date}</small></span><strong>{money(order.total)}</strong><span className="status-pill">{order.status}</span></div>)}
        </section>
      </>
    );
  }

  function renderProducts(readOnly = false) {
    return (
      <section className="staff-content-section">
        <div className="staff-section-heading"><div><span className="eyebrow">{readOnly ? "Inventaris Toko Kue Amala" : "Kelola katalog"}</span><h2>{readOnly ? "Data Produk & Stok" : "Data Produk"}</h2></div>{!readOnly && role === "admin" ? <button className="button button-primary" onClick={() => setDialog({ title: "Tambah Produk", kind: "new-product" })}>＋ Tambah Produk</button> : null}</div>
        <div className="staff-product-grid">
          {products.map((product) => <article className="staff-product-card" key={product.id}>
            <StaffProductImage product={product} />
            <div className="staff-product-info"><div className="staff-card-meta"><span className="product-category">{product.category}</span><span className={`stock-badge ${product.stock < 8 ? "stock-low" : ""}`}>{product.stock < 8 ? "Stok menipis" : `${product.stock} stok`}</span></div><h3>{product.name}</h3><p>{product.description}</p><strong>{money(product.price)}</strong>
              {!readOnly && role === "admin" ? <div className="staff-card-actions"><button className="button button-soft" onClick={() => setDialog({ title: "Ubah Produk", kind: "edit-product", id: product.id })}>Ubah</button><button className="button button-danger" onClick={() => openDelete("product", product.id, "Produk")}>Hapus</button></div> : null}
            </div>
          </article>)}
        </div>
      </section>
    );
  }

  function renderCustomers(readOnly = false) {
    return <section className="staff-content-section"><div className="staff-section-heading"><div><span className="eyebrow">Kenali pelanggan setia</span><h2>Data Customer</h2></div></div><div className="staff-customer-grid">
      {customers.map((customer) => <article className="staff-customer-card" key={customer.id}><div className="customer-card-top"><div className="profile-avatar">{customer.name.split(" ").map((word) => word[0]).slice(0, 2).join("")}</div><span className="points-badge">✦ {customer.points} poin</span></div><h3>{customer.name}</h3><p>{customer.email}</p><span className="customer-location">⌖ {customer.address}</span>{readOnly ? <button className="button button-outline full-button" onClick={() => { setSelectedCustomer(customer); setDialog({ title: "Detail Customer", description: "Informasi customer Amalakufood." }); }}>Lihat detail</button> : role === "admin" ? <div className="staff-card-actions customer-actions"><button className="button button-soft" onClick={() => setDialog({ title: "Ubah Data Customer", kind: "edit-customer", id: customer.id })}>Ubah</button><button className="button button-outline" onClick={() => setDialog({ title: "Perbarui Poin Customer", kind: "points", id: customer.id })}>Poin</button><button className="button button-danger" onClick={() => openDelete("customer", customer.id, "Customer")}>Hapus</button></div> : null}</article>)}
    </div></section>;
  }

  function renderOrders() {
    return <section className="staff-content-section"><div className="staff-section-heading"><div><span className="eyebrow">Pesanan masuk</span><h2>Transaksi Pemesanan</h2></div><span className="count-badge">{orders.length} pesanan</span></div><div className="table-card"><table className="staff-table"><thead><tr><th>No. Pesanan</th><th>Customer</th><th>Tanggal</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>#{order.id}</strong></td><td>{order.customer}<small className="table-subtext">{order.items.join(", ")}</small></td><td>{order.date}</td><td>{money(order.total)}</td><td><span className="status-pill">{order.status}</span></td><td><div className="table-actions"><button className="button button-soft" onClick={() => setDialog({ title: "Validasi Pesanan?", description: `Pastikan pesanan #${order.id} sudah diperiksa.`, kind: "validate-order", id: order.id })}>Validasi</button><button className="button button-outline" onClick={() => setDialog({ title: "Ubah Status Pesanan", kind: "order-status", id: order.id })}>Ubah</button><button aria-label={`Hapus ${order.id}`} className="button button-danger" onClick={() => openDelete("order", order.id, "Pesanan")}>Hapus</button></div></td></tr>)}</tbody></table></div></section>;
  }

  function renderPaymentValidation() {
    const pending = orders.filter((order) => order.paymentStatus === "Menunggu");
    return <section className="staff-content-section"><div className="staff-section-heading"><div><span className="eyebrow">Periksa status pembayaran customer</span><h2>Validasi Pembayaran</h2></div><span className="count-badge">{pending.length} menunggu</span></div>{pending.length ? pending.map((order) => <article className="payment-review-card" key={order.id}><div className="payment-review-header"><div><span className="product-category">Pembayaran · {order.payment}</span><h3>Pesanan #{order.id}</h3><p>{order.customer} · {order.date}</p></div><strong>{money(order.total)}</strong></div><div className="payment-proof"><div aria-hidden="true" className="proof-placeholder">▧</div><div><strong>Status pembayaran</strong><span>{order.payment === "Bayar di Toko" ? "Pembayaran dilakukan di toko." : "Bukti pembayaran belum dilampirkan."}</span><span>Status: <b>Menunggu validasi</b></span></div></div><div className="payment-review-actions"><button className="button button-primary" onClick={() => void updateOrder(order.id, "Divalidasi", "Berhasil")}>Validasi Pembayaran</button><button className="button button-danger" onClick={() => setDialog({ title: "Pembayaran Ditolak", description: `Tolak pembayaran untuk pesanan #${order.id}? Customer perlu mengirim ulang bukti pembayaran.`, tone: "red", kind: "reject-payment", id: order.id })}>Tolak Pembayaran</button></div></article>) : <div className="empty-state"><span>✓</span><h3>Semua pembayaran sudah diperiksa</h3><p>Tidak ada pembayaran yang menunggu validasi.</p></div>}</section>;
  }

  function renderReceipt() {
    const order = orders.find((item) => item.paymentStatus === "Berhasil") ?? orders[0];
    if (!order) {
      return <section className="staff-content-section"><div className="staff-section-heading"><div><span className="eyebrow">Bukti transaksi</span><h2>Bukti Pembayaran</h2></div></div><div className="empty-state"><span>▤</span><h3>Belum ada transaksi</h3><p>Nota akan tersedia setelah customer membuat pesanan.</p></div></section>;
    }
    return <section className="staff-content-section"><div className="staff-section-heading"><div><span className="eyebrow">Bukti transaksi</span><h2>Bukti Pembayaran</h2></div></div><article className="receipt-card"><div className="receipt-head"><Brand /><span>NOTA PEMBAYARAN</span></div><div className="receipt-title"><span>Toko Kue Amala</span><h3>Nota #{order.receipt || order.id.replace("PS", "NT")}</h3><p>Fresh From Our Oven</p></div><div className="receipt-details"><div><span>ID Kasir</span><strong>{employeeId}</strong></div><div><span>Customer</span><strong>{order.customer}</strong></div><div><span>Tanggal</span><strong>{order.date}</strong></div></div><div className="receipt-items">{order.itemDetails?.map((item) => <div key={item.product}><span>{item.product} × {item.quantity}</span><strong>{money(item.subtotal)}</strong></div>)}</div><div className="receipt-total"><span>Total pembayaran</span><strong>{money(order.total)}</strong></div><div className="receipt-details"><div><span>Metode pembayaran</span><strong>{order.payment}</strong></div><div><span>Status</span><strong className="receipt-success">{order.paymentStatus}</strong></div></div><button className="button button-primary full-button" onClick={() => setDialog({ title: "Cetak Nota", description: "Nota siap dicetak sebagai bukti transaksi.", kind: "print-receipt", id: order.id })}>Cetak Nota <span aria-hidden="true">▣</span></button></article></section>;
  }

  function renderReports(type: ReportType, owner = false) {
    const filtered = reports.filter((report) => report.type === type);
    const title = owner ? `Rekap Laporan ${type}` : `Laporan ${type === "Stok" ? "Stok" : "Penjualan"}`;
    return <section className="staff-content-section"><div className="staff-section-heading"><div><span className="eyebrow">{owner ? "Tinjau dan evaluasi laporan kasir" : "Dokumentasi operasional"}</span><h2>{title}</h2></div>{!owner && role === "kasir" ? <button className="button button-primary" onClick={() => setDialog({ title: `Tambah Laporan ${type}`, kind: `report-${type.toLowerCase()}` })}>＋ Tambah</button> : null}</div><div className="report-list">
      {filtered.map((report) => <article className="report-card" key={report.id}><div className="report-icon">{type === "Stok" ? "▧" : "↗"}</div><div className="report-main"><div className="report-title"><h3>{report.id}</h3><span className={`status-pill ${report.status === "Disetujui" ? "status-done" : ""}`}>{report.status}</span></div><p>{report.period}</p><strong>{report.amount}</strong></div><div className="report-actions">{owner ? <><button className="button button-soft" onClick={() => setDialog({ title: "Ubah Rekapan Laporan", description: `Tinjau rekap ${report.id} dan pilih tindakan.`, kind: "owner-report", id: report.id })}>Ubah</button><button className="button button-outline" onClick={() => setDialog({ title: "Cetak sebagai PDF", description: `Cetak rekap ${report.id} untuk arsip.`, kind: "print-report", id: report.id })}>Cetak</button><button className="button button-danger" onClick={() => openDelete("report", report.id, "Laporan")}>Hapus</button></> : role === "kasir" ? <><button className="button button-soft" onClick={() => setDialog({ title: "Ubah Laporan", kind: `edit-report-${type.toLowerCase()}`, id: report.id })}>Ubah</button><button className="button button-danger" onClick={() => openDelete("report", report.id, "Laporan")}>Hapus</button></> : null}</div></article>)}
    </div></section>;
  }

  function renderEvaluations() {
    return <section className="staff-content-section"><div className="staff-section-heading"><div><span className="eyebrow">Catatan dan tindak lanjut</span><h2>Evaluasi Laporan</h2></div></div><form className="evaluation-compose" onSubmit={submitEvaluation}><label className="form-field"><span>Pilih laporan</span><select name="report" defaultValue={reports[0]?.id ?? ""} required>{reports.length ? reports.map((report) => <option key={report.id} value={report.id}>{report.id} · {report.period}</option>) : <option disabled value="">Belum ada laporan untuk dievaluasi</option>}</select></label><label className="form-field"><span>Catatan evaluasi</span><textarea name="note" onChange={(event) => setEvaluationText(event.target.value)} placeholder="Tulis catatan atau arahan untuk laporan..." required rows={3} value={evaluationText} /></label><button className="button button-primary" disabled={!reports.length}>Simpan Evaluasi</button></form><div className="evaluation-list">{evaluations.map((item) => <article className="evaluation-card" key={item.id}><div className="evaluation-card-head"><span className="evaluation-id">{item.id}</span><span>{item.date} · {item.report}</span></div><p>{item.note}</p><div className="staff-card-actions"><button className="button button-soft" onClick={() => setDialog({ title: "Edit Evaluasi", kind: "edit-evaluation", id: item.id })}>Edit</button><button className="button button-danger" onClick={() => openDelete("evaluation", item.id, "Evaluasi")}>Hapus</button></div></article>)}</div></section>;
  }

  function renderProfile() {
    return <section className="staff-content-section"><div className="staff-section-heading"><div><span className="eyebrow">Informasi akun</span><h2>Profil {name}</h2></div></div><article className="staff-profile-card"><div className="profile-avatar">{name.slice(0, 1)}</div><h3>{profile.name}</h3><span className="profile-role">{name} · {employeeId}</span><div className="staff-profile-details"><span>Email<strong>{profile.email}</strong></span><span>No. handphone<strong>{profile.phone}</strong></span><span>ID Pengguna<strong>{employeeId}</strong></span></div><button className="button button-outline" onClick={() => setDialog({ title: "Ingin Keluar?", description: "Kamu akan keluar dari akun Amalakufood di perangkat ini.", kind: "logout" })}>Keluar</button></article></section>;
  }

  function renderDialog() {
    if (!dialog) return null;
    const product = products.find((item) => item.id === dialog.id);
    const customer = customers.find((item) => item.id === dialog.id);
    const evaluation = evaluations.find((item) => item.id === dialog.id);
    let actions;
    if (dialog.kind?.startsWith("delete-")) {
      actions = <div className="modal-actions"><button className="button button-outline" onClick={closeDialog}>Batal</button><button className="button button-danger" onClick={confirmDelete}>Ya, Hapus</button></div>;
    } else if (dialog.kind === "new-product" || dialog.kind === "edit-product") {
      actions = <form className="modal-form" onSubmit={submitProduct}><label className="form-field"><span>Nama Produk</span><input defaultValue={product?.name} name="name" required /></label><label className="form-field"><span>Kategori</span><select defaultValue={product?.category ?? "Bolu"} name="category"><option>Bolu</option><option>Brownies</option></select></label><label className="form-field"><span>Harga (Rp)</span><input defaultValue={product?.price} min="0" name="price" required type="number" /></label><label className="form-field"><span>Stok</span><input defaultValue={product?.stock} min="0" name="stock" required type="number" /></label><label className="form-field"><span>Deskripsi</span><textarea defaultValue={product?.description} name="description" rows={3} /></label><div className="modal-actions"><button className="button button-outline" onClick={closeDialog} type="button">Batal</button><button className="button button-primary" type="submit">Simpan</button></div></form>;
    } else if (dialog.kind === "edit-customer" && customer) {
      actions = <form className="modal-form" onSubmit={submitCustomer}><label className="form-field"><span>Nama Customer</span><input defaultValue={customer.name} name="name" required /></label><label className="form-field"><span>No. Handphone</span><input defaultValue={customer.phone} name="phone" required /></label><label className="form-field"><span>Email</span><input defaultValue={customer.email} name="email" required type="email" /></label><label className="form-field"><span>Alamat</span><textarea defaultValue={customer.address} name="address" required rows={2} /></label><div className="modal-actions"><button className="button button-outline" onClick={closeDialog} type="button">Batal</button><button className="button button-primary" type="submit">Simpan</button></div></form>;
    } else if (dialog.kind === "points" && customer) {
      actions = <form className="modal-form" onSubmit={submitPoints}><label className="form-field"><span>Poin saat ini: {customer.points}</span><input defaultValue={customer.points} min="0" name="points" required type="number" /></label><div className="modal-actions"><button className="button button-outline" onClick={closeDialog} type="button">Batal</button><button className="button button-primary" type="submit">Simpan Poin</button></div></form>;
    } else if (dialog.kind === "order-status") {
      const order = orders.find((item) => item.id === dialog.id);
      actions = <form className="modal-form" onSubmit={submitOrderStatus}><div className="radio-status-list">{["Diproses", "Divalidasi", "Selesai"].map((status) => <label key={status}><input defaultChecked={order?.status === status} name="status" type="radio" value={status} /><span>{status}</span></label>)}</div><div className="modal-actions"><button className="button button-outline" onClick={closeDialog} type="button">Batal</button><button className="button button-primary" type="submit">Simpan Status</button></div></form>;
    } else if (dialog.kind === "validate-order") {
      actions = <div className="modal-actions"><button className="button button-outline" onClick={closeDialog}>Batal</button><button className="button button-primary" onClick={() => void updateOrder(dialog.id ?? "", "Divalidasi")}>Validasi</button></div>;
    } else if (dialog.kind === "reject-payment") {
      actions = <div className="modal-actions"><button className="button button-outline" onClick={closeDialog}>Kembali</button><button className="button button-danger" onClick={() => void updateOrder(dialog.id ?? "", "Diproses", "Ditolak")}>Ya, Tolak Pembayaran</button></div>;
    } else if (dialog.kind === "owner-report") {
      actions = <div className="modal-actions modal-actions-wrap"><button className="button button-outline" onClick={() => { const reportId = dialog.id; closeDialog(); setEvaluationText(""); setView("Evaluasi Laporan"); if (reportId) setEvaluationText(`Evaluasi ${reportId}: `); }}>Evaluasi</button><button className="button button-success" onClick={() => { const report = reports.find((item) => item.id === dialog.id); if (report) approveReport(report); }}>Setujui</button></div>;
    } else if (dialog.kind === "print-report" || dialog.kind === "print-receipt") {
      actions = <div className="modal-actions"><button className="button button-outline" onClick={closeDialog}>Batal</button><button className="button button-primary" onClick={() => dialog.kind === "print-report" ? printDocument("Laporan berhasil dicetak") : void printReceipt(dialog.id ?? "")}>Cetak sebagai PDF</button></div>;
    } else if (dialog.kind === "report-stock" || dialog.kind === "report-penjualan" || dialog.kind?.startsWith("edit-report-")) {
      const report = reports.find((item) => item.id === dialog.id);
      const isEdit = Boolean(dialog.id);
      actions = <form className="modal-form" onSubmit={submitReport}>
        <label className="form-field"><span>Periode</span><input defaultValue={report?.period ?? new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date())} name="period" required /></label>
        <label className="form-field"><span>Tanggal awal</span><input defaultValue={report?.startDate?.slice(0, 10) ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`} name="startDate" required type="date" /></label>
        <label className="form-field"><span>Tanggal akhir</span><input defaultValue={report?.endDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)} name="endDate" required type="date" /></label>
        <div className="modal-actions"><button className="button button-outline" onClick={closeDialog} type="button">Batal</button><button className="button button-primary" type="submit">{isEdit ? "Simpan Perubahan" : "Tambah Laporan"}</button></div>
      </form>;
    } else if (dialog.kind === "edit-evaluation" && evaluation) {
      actions = <form className="modal-form" onSubmit={submitEvaluation}><label className="form-field"><span>Catatan evaluasi</span><textarea defaultValue={evaluation.note} name="note" required rows={4} /></label><div className="modal-actions"><button className="button button-outline" onClick={closeDialog} type="button">Batal</button><button className="button button-primary" type="submit">Simpan</button></div></form>;
    } else if (dialog.kind === "logout") {
      actions = <div className="modal-actions"><button className="button button-outline" onClick={closeDialog}>Tidak</button><button className="button button-primary" onClick={logout}>Ya</button></div>;
    } else if (dialog.title === "Detail Customer" && selectedCustomer) {
      actions = <div className="customer-detail-list"><span>Nama<strong>{selectedCustomer.name}</strong></span><span>Email<strong>{selectedCustomer.email}</strong></span><span>No. Handphone<strong>{selectedCustomer.phone}</strong></span><span>Alamat<strong>{selectedCustomer.address}</strong></span><span>Poin<strong>{selectedCustomer.points}</strong></span><div className="modal-actions"><button className="button button-primary" onClick={closeDialog}>Tutup</button></div></div>;
    } else {
      actions = <div className="modal-actions"><button className="button button-primary" onClick={closeDialog}>Mengerti</button></div>;
    }
    return <Modal description={dialog.description} onClose={closeDialog} title={dialog.title} tone={dialog.tone ?? (dialog.kind === "reject-payment" ? "red" : "yellow")}>{actions}</Modal>;
  }

  function viewContent() {
    if (view === "Beranda") return renderOverview();
    if (role === "admin" && view === "Data Produk") return renderProducts();
    if (role === "admin" && view === "Data Customer") return renderCustomers();
    if (role === "kasir" && view === "Transaksi Pemesanan") return renderOrders();
    if (role === "kasir" && view === "Validasi Pembayaran") return renderPaymentValidation();
    if (role === "kasir" && view === "Bukti Pembayaran") return renderReceipt();
    if (role === "kasir" && view === "Laporan Stok") return renderReports("Stok");
    if (role === "kasir" && view === "Laporan Penjualan") return renderReports("Penjualan");
    if (role === "owner" && view === "Rekap Laporan Penjualan") return renderReports("Penjualan", true);
    if (role === "owner" && view === "Rekap Laporan Stok") return renderReports("Stok", true);
    if (role === "owner" && view === "Evaluasi Laporan") return renderEvaluations();
    if (role === "owner" && view === "Data Produk & Stok") return renderProducts(true);
    if (role === "owner" && view === "Data Customer") return renderCustomers(true);
    return renderProfile();
  }

  return (
    <main className="staff-app">
      <aside className="staff-sidebar">
        <Link aria-label="Amalakufood, beranda" className="staff-brand" href={`/${role}`}><Brand /></Link>
        <span className="sidebar-label">MENU UTAMA</span>
        <nav aria-label={`Navigasi ${name}`} className="staff-nav">{menu.slice(0, -1).map((item, index) => <button aria-current={view === item ? "page" : undefined} className={`staff-nav-item ${view === item ? "is-active" : ""}`} key={item} onClick={() => setView(item)}><span aria-hidden="true">{item === "Beranda" ? "⌂" : role === "admin" ? index === 1 ? "▧" : "♙" : role === "kasir" ? ["⌂", "▤", "◉", "▣", "▧", "↗"][index] : ["⌂", "↗", "▧", "✎", "▤", "♙"][index]}</span>{item}</button>)}</nav>
        <button className={`staff-nav-item mobile-profile-nav-item ${view === menu.at(-1) ? "is-active" : ""}`} onClick={() => setView(menu.at(-1) ?? `Profil ${name}`)}><span className="sidebar-avatar">{name.slice(0, 1)}</span>Profil {name}</button>
        <div className="sidebar-bottom"><button className={`staff-nav-item profile-menu ${view === menu.at(-1) ? "is-active" : ""}`} onClick={() => setView(menu.at(-1) ?? `Profil ${name}`)}><span className="sidebar-avatar">{name.slice(0, 1)}</span><span className="sidebar-profile-text"><strong>{name}</strong><small>{employeeId}</small></span><span aria-hidden="true">⋯</span></button><Link className="sidebar-home-link" href="/">← Kembali ke awal</Link></div>
      </aside>
      <section className="staff-main">
        <header className="staff-topbar"><div className="staff-breadcrumb">Amalakufood <span>/</span> <strong>{view}</strong></div><div className="staff-topbar-actions"><span className="staff-date">{todayLabel}</span><span className="staff-top-avatar">{name.slice(0, 1)}</span></div></header>
        <div className="staff-page-content">
          {isLoading ? <div className="empty-state">Memuat data Amalakufood...</div> : null}
          {loadError ? <div className="empty-state" role="alert">{loadError} <button className="text-link" onClick={() => void loadData()}>Coba lagi</button></div> : null}
          {!isLoading && !loadError ? viewContent() : null}
        </div>
        <footer className="staff-footer">Amalakufood · Fresh From Our Oven</footer>
      </section>
      {renderDialog()}
    </main>
  );
}
