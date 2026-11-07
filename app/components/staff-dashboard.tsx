"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "./brand";
import { Modal, ModalTone } from "./modal";
import { UserRole } from "../lib/roles";

type StaffRole = Extract<UserRole, "admin" | "kasir" | "owner">;
type ReportType = "Stok" | "Penjualan";
type Product = { id: string; name: string; category: string; price: number; stock: number; description: string };
type Customer = { id: string; name: string; phone: string; email: string; address: string; points: number };
type Order = { id: string; customer: string; date: string; total: number; status: string; payment: string; paymentStatus: string; items: string[] };
type Report = { id: string; type: ReportType; period: string; amount: string; status: string };
type Evaluation = { id: string; report: string; note: string; date: string };
type Dialog = { title: string; description?: string; tone?: ModalTone; kind?: string; id?: string };

const initialProducts: Product[] = [
  { id: "PRD-001", name: "Bolu Tapai", category: "Bolu", price: 55000, stock: 12, description: "Bolu lembut dengan tapai pilihan." },
  { id: "PRD-002", name: "Brownies Kukus", category: "Brownies", price: 65000, stock: 8, description: "Brownies cokelat kukus yang moist." },
  { id: "PRD-003", name: "Bolu Pisang", category: "Bolu", price: 48000, stock: 15, description: "Bolu pisang rumahan yang lembut." },
  { id: "PRD-004", name: "Brownies Pisang", category: "Brownies", price: 70000, stock: 6, description: "Brownies cokelat dengan pisang pilihan." },
];
const initialCustomers: Customer[] = [
  { id: "CUS-001", name: "Amalia Putri", phone: "0812 3456 7890", email: "amalia@example.com", address: "Padang, Sumatera Barat", points: 120 },
  { id: "CUS-002", name: "Rani Permata", phone: "0813 2222 3400", email: "rani@example.com", address: "Kuranji, Padang", points: 85 },
  { id: "CUS-003", name: "Dinda Aulia", phone: "0821 7612 3000", email: "dinda@example.com", address: "Lubuk Begalung, Padang", points: 45 },
];
const initialOrders: Order[] = [
  { id: "PS-024", customer: "Amalia Putri", date: "7 Nov 2026", total: 120000, status: "Diproses", payment: "QRIS", paymentStatus: "Menunggu", items: ["Bolu Tapai × 1", "Brownies Kukus × 1"] },
  { id: "PS-023", customer: "Rani Permata", date: "7 Nov 2026", total: 65000, status: "Divalidasi", payment: "Transfer Bank", paymentStatus: "Berhasil", items: ["Brownies Kukus × 1"] },
  { id: "PS-022", customer: "Dinda Aulia", date: "6 Nov 2026", total: 96000, status: "Selesai", payment: "Bayar di Toko", paymentStatus: "Berhasil", items: ["Bolu Pisang × 2"] },
];
const initialReports: Report[] = [
  { id: "RS-001", type: "Stok", period: "November 2026", amount: "4 produk · 41 item", status: "Menunggu Pemeriksaan" },
  { id: "RP-001", type: "Penjualan", period: "November 2026", amount: "12 transaksi · Rp 1.245.000", status: "Menunggu Pemeriksaan" },
  { id: "RP-002", type: "Penjualan", period: "Oktober 2026", amount: "38 transaksi · Rp 3.850.000", status: "Disetujui" },
];
const initialEvaluations: Evaluation[] = [
  { id: "EV-001", report: "RP-002", note: "Penjualan bulan ini meningkat. Pertahankan kualitas produk.", date: "1 Nov 2026" },
];

const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

function nextSequence(prefix: string, ids: string[]) {
  let sequence = 1;
  while (ids.includes(`${prefix}-${String(sequence).padStart(3, "0")}`)) sequence += 1;
  return `${prefix}-${String(sequence).padStart(3, "0")}`;
}

function dashboardMenu(role: StaffRole) {
  if (role === "admin") return ["Beranda", "Data Produk", "Data Customer", "Profil Admin"];
  if (role === "kasir") return ["Beranda", "Transaksi Pemesanan", "Validasi Pembayaran", "Bukti Pembayaran", "Laporan Stok", "Laporan Penjualan", "Profil Kasir"];
  return ["Beranda", "Rekap Laporan Penjualan", "Rekap Laporan Stok", "Evaluasi Laporan", "Data Produk & Stok", "Data Customer", "Profil Owner"];
}

function roleName(role: StaffRole) {
  return role === "admin" ? "Admin" : role === "kasir" ? "Kasir" : "Owner";
}

export default function StaffDashboard({ role }: { role: StaffRole }) {
  const router = useRouter();
  const name = roleName(role);
  const employeeId = role === "admin" ? "ADM001" : role === "kasir" ? "KSR001" : "OWN001";
  const [view, setView] = useState("Beranda");
  const [products, setProducts] = useState(initialProducts);
  const [customers, setCustomers] = useState(initialCustomers);
  const [orders, setOrders] = useState(initialOrders);
  const [reports, setReports] = useState(initialReports);
  const [evaluations, setEvaluations] = useState(initialEvaluations);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const profile = { name: `${name} Amalaku`, phone: "0812 3456 7890", email: `${role}@amalakufood.id` };
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [evaluationText, setEvaluationText] = useState("");

  const menu = dashboardMenu(role);
  const todayLabel = role === "admin" ? "Ruang kerja Amalakufood" : "Ringkasan kerja";

  function closeDialog() {
    setDialog(null);
  }

  function openDelete(kind: string, id: string, label: string) {
    setDialog({ title: `Hapus ${label}?`, description: `Data ${label.toLowerCase()} ini akan dihapus dari tampilan demo.`, kind: `delete-${kind}`, id });
  }

  function confirmDelete() {
    if (!dialog?.id) return;
    if (dialog.kind === "delete-product") setProducts((current) => current.filter((product) => product.id !== dialog.id));
    if (dialog.kind === "delete-customer") setCustomers((current) => current.filter((customer) => customer.id !== dialog.id));
    if (dialog.kind === "delete-order") setOrders((current) => current.filter((order) => order.id !== dialog.id));
    if (dialog.kind === "delete-report") setReports((current) => current.filter((report) => report.id !== dialog.id));
    if (dialog.kind === "delete-evaluation") setEvaluations((current) => current.filter((item) => item.id !== dialog.id));
    setDialog({ title: "Data berhasil dihapus", description: "Perubahan tersimpan pada tampilan demo ini.", tone: "green" });
  }

  function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const product: Product = {
      id: dialog?.id ?? nextSequence("PRD", products.map((item) => item.id)),
      name: String(form.get("name") ?? "").trim(),
      category: String(form.get("category") ?? ""),
      price: Number(form.get("price")),
      stock: Number(form.get("stock")),
      description: String(form.get("description") ?? "").trim(),
    };
    if (!product.name || !Number.isFinite(product.price) || !Number.isFinite(product.stock)) return;
    setProducts((current) => dialog?.kind === "edit-product" ? current.map((item) => item.id === product.id ? product : item) : [...current, product]);
    setDialog({ title: dialog?.kind === "edit-product" ? "Produk berhasil diperbarui" : "Produk berhasil ditambahkan", tone: "green" });
  }

  function submitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog?.id) return;
    const form = new FormData(event.currentTarget);
    setCustomers((current) => current.map((customer) => customer.id === dialog.id ? {
      ...customer,
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      address: String(form.get("address") ?? ""),
    } : customer));
    setDialog({ title: "Data customer berhasil diperbarui", tone: "green" });
  }

  function submitPoints(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog?.id) return;
    const points = Number(new FormData(event.currentTarget).get("points"));
    if (!Number.isInteger(points) || points < 0) return;
    setCustomers((current) => current.map((customer) => customer.id === dialog.id ? { ...customer, points } : customer));
    setDialog({ title: "Poin berhasil diperbarui", tone: "green" });
  }

  function submitOrderStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog?.id) return;
    const status = String(new FormData(event.currentTarget).get("status"));
    setOrders((current) => current.map((order) => order.id === dialog.id ? { ...order, status } : order));
    setDialog({ title: "Status pesanan berhasil diubah", tone: "green" });
  }

  function updateOrder(id: string, status: string, paymentStatus?: string) {
    setOrders((current) => current.map((order) => order.id === id ? { ...order, status, paymentStatus: paymentStatus ?? order.paymentStatus } : order));
  }

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const existingReport = reports.find((item) => item.id === dialog?.id);
    const reportType = existingReport?.type ?? (dialog?.kind === "report-stock" ? "Stok" : "Penjualan");
    const report: Report = {
      id: dialog?.id ?? nextSequence(reportType === "Stok" ? "RS" : "RP", reports.map((item) => item.id)),
      type: reportType,
      period: String(form.get("period") ?? ""),
      amount: String(form.get("amount") ?? ""),
      status: "Menunggu Pemeriksaan",
    };
    setReports((current) => dialog?.id ? current.map((item) => item.id === report.id ? report : item) : [...current, report]);
    setDialog({ title: dialog?.id ? "Laporan berhasil diperbarui" : "Laporan berhasil ditambahkan", tone: "green" });
  }

  function submitEvaluation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const note = String(form.get("note") ?? "").trim();
    if (!note) return;
    if (dialog?.kind === "edit-evaluation" && dialog.id) {
      setEvaluations((current) => current.map((item) => item.id === dialog.id ? { ...item, note } : item));
    } else {
      setEvaluations((current) => [...current, {
        id: `EV-${String(current.length + 1).padStart(3, "0")}`,
        report: String(form.get("report") ?? "RP-001"),
        note,
        date: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date()),
      }]);
    }
    setEvaluationText("");
    setDialog({ title: "Evaluasi berhasil disimpan", tone: "green" });
  }

  function approveReport(report: Report) {
    setReports((current) => current.map((item) => item.id === report.id ? { ...item, status: "Disetujui" } : item));
    setDialog({ title: "Rekapan Laporan Disetujui", description: `${report.id} · ${report.period} sudah disetujui.`, tone: "green" });
  }

  function logout() {
    try {
      window.localStorage.removeItem("amalakufood-session");
      router.push("/pilih-peran");
    } catch {
      setDialog({ title: "Tidak dapat keluar", description: "Sesi browser tidak dapat dihapus. Silakan coba kembali.", tone: "red" });
    }
  }

  function printDocument(successTitle: string) {
    window.print();
    setDialog({ title: successTitle, description: "Dokumen demo siap disimpan sebagai PDF atau dicetak dari browser.", tone: "green" });
  }

  function renderOverview() {
    const cards = role === "admin"
      ? [{ label: "Produk aktif", value: String(products.length), icon: "✿" }, { label: "Customer", value: String(customers.length), icon: "♙" }]
      : role === "kasir"
        ? [{ label: "Pesanan hari ini", value: String(orders.length), icon: "▤" }, { label: "Stok hari ini", value: String(products.reduce((sum, item) => sum + item.stock, 0)), icon: "▧" }]
        : [{ label: "Penjualan", value: money(orders.reduce((sum, order) => sum + order.total, 0)), icon: "↗" }, { label: "Pesanan", value: String(orders.length), icon: "▤" }, { label: "Stok Menipis", value: String(products.filter((item) => item.stock < 8).length), icon: "!" }, { label: "Customer", value: String(customers.length), icon: "♙" }];
    return (
      <>
        <section className="staff-welcome">
          <div><span className="eyebrow">{role === "owner" ? "Ringkasan usaha" : "Dashboard Amalakufood"}</span><h2>{role === "owner" ? `Halo, ${name} ${employeeId}` : `Selamat bekerja, ${name} ${employeeId}`}</h2><p>{role === "owner" ? "Pantau perkembangan usaha Toko Kue Amala hari ini." : "Semoga harimu produktif dan penuh hal manis."}</p></div>
          <span aria-hidden="true" className="welcome-cake">🧁</span>
        </section>
        <div className={`summary-grid summary-${role}`}>
          {cards.map((card) => <article className="staff-summary-card" key={card.label}><span className="summary-icon">{card.icon}</span><span>{card.label}</span><strong>{card.value}</strong><small>Data demo saat ini</small></article>)}
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
          {products.map((product, index) => <article className="staff-product-card" key={product.id}>
            <div className={`staff-product-art art-${index % 4}`} aria-hidden="true"><span>{index % 2 ? "🍫" : "🍰"}</span><i>✦</i></div>
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
    return <section className="staff-content-section"><div className="staff-section-heading"><div><span className="eyebrow">Periksa bukti transfer customer</span><h2>Validasi Pembayaran</h2></div><span className="count-badge">{pending.length} menunggu</span></div>{pending.length ? pending.map((order) => <article className="payment-review-card" key={order.id}><div className="payment-review-header"><div><span className="product-category">Pembayaran · {order.payment}</span><h3>Pesanan #{order.id}</h3><p>{order.customer} · {order.date}</p></div><strong>{money(order.total)}</strong></div><div className="payment-proof"><div aria-hidden="true" className="proof-placeholder">▧</div><div><strong>Bukti pembayaran customer</strong><span>Pratinjau bukti transfer · unggahan demo</span><span>Status: <b>Menunggu validasi</b></span></div></div><div className="payment-review-actions"><button className="button button-primary" onClick={() => { updateOrder(order.id, "Divalidasi", "Berhasil"); setDialog({ title: "Pembayaran Berhasil Divalidasi", description: `Pesanan #${order.id} sudah dikonfirmasi.`, tone: "green" }); }}>Validasi Pembayaran</button><button className="button button-danger" onClick={() => setDialog({ title: "Pembayaran Ditolak", description: `Tolak pembayaran untuk pesanan #${order.id}? Customer perlu mengirim ulang bukti pembayaran.`, tone: "red", kind: "reject-payment", id: order.id })}>Tolak Pembayaran</button></div></article>) : <div className="empty-state"><span>✓</span><h3>Semua pembayaran sudah diperiksa</h3><p>Tidak ada pembayaran yang menunggu validasi.</p></div>}</section>;
  }

  function renderReceipt() {
    const order = orders.find((item) => item.paymentStatus === "Berhasil") ?? orders[0];
    return <section className="staff-content-section"><div className="staff-section-heading"><div><span className="eyebrow">Bukti transaksi</span><h2>Bukti Pembayaran</h2></div></div><article className="receipt-card"><div className="receipt-head"><Brand /><span>NOTA PEMBAYARAN</span></div><div className="receipt-title"><span>Toko Kue Amala</span><h3>Nota #{order.id.replace("PS", "NT")}</h3><p>Fresh From Our Oven</p></div><div className="receipt-details"><div><span>ID Kasir</span><strong>KSR001</strong></div><div><span>Customer</span><strong>{order.customer}</strong></div><div><span>Tanggal</span><strong>{order.date}</strong></div></div><div className="receipt-items">{order.items.map((item) => <div key={item}><span>{item}</span><strong>{money(Math.floor(order.total / order.items.length))}</strong></div>)}</div><div className="receipt-total"><span>Total pembayaran</span><strong>{money(order.total)}</strong></div><div className="receipt-details"><div><span>Metode pembayaran</span><strong>{order.payment}</strong></div><div><span>Status</span><strong className="receipt-success">{order.paymentStatus}</strong></div></div><button className="button button-primary full-button" onClick={() => setDialog({ title: "Cetak Nota", description: "Nota siap dicetak sebagai bukti transaksi demo.", kind: "print-receipt" })}>Cetak Nota <span aria-hidden="true">▣</span></button></article></section>;
  }

  function renderReports(type: ReportType, owner = false) {
    const filtered = reports.filter((report) => report.type === type);
    const title = owner ? `Rekap Laporan ${type}` : `Laporan ${type === "Stok" ? "Stok" : "Penjualan"}`;
    return <section className="staff-content-section"><div className="staff-section-heading"><div><span className="eyebrow">{owner ? "Tinjau dan evaluasi laporan kasir" : "Dokumentasi operasional"}</span><h2>{title}</h2></div>{!owner && role === "kasir" ? <button className="button button-primary" onClick={() => setDialog({ title: `Tambah Laporan ${type}`, kind: `report-${type.toLowerCase()}` })}>＋ Tambah</button> : null}</div><div className="report-list">
      {filtered.map((report) => <article className="report-card" key={report.id}><div className="report-icon">{type === "Stok" ? "▧" : "↗"}</div><div className="report-main"><div className="report-title"><h3>{report.id}</h3><span className={`status-pill ${report.status === "Disetujui" ? "status-done" : ""}`}>{report.status}</span></div><p>{report.period}</p><strong>{report.amount}</strong></div><div className="report-actions">{owner ? <><button className="button button-soft" onClick={() => setDialog({ title: "Ubah Rekapan Laporan", description: `Tinjau rekap ${report.id} dan pilih tindakan.`, kind: "owner-report", id: report.id })}>Ubah</button><button className="button button-outline" onClick={() => setDialog({ title: "Cetak sebagai PDF", description: `Cetak rekap ${report.id} untuk arsip.`, kind: "print-report", id: report.id })}>Cetak</button><button className="button button-danger" onClick={() => openDelete("report", report.id, "Laporan")}>Hapus</button></> : role === "kasir" ? <><button className="button button-soft" onClick={() => setDialog({ title: "Ubah Laporan", kind: `edit-report-${type.toLowerCase()}`, id: report.id })}>Ubah</button><button className="button button-danger" onClick={() => openDelete("report", report.id, "Laporan")}>Hapus</button></> : null}</div></article>)}
    </div></section>;
  }

  function renderEvaluations() {
    return <section className="staff-content-section"><div className="staff-section-heading"><div><span className="eyebrow">Catatan dan tindak lanjut</span><h2>Evaluasi Laporan</h2></div></div><form className="evaluation-compose" onSubmit={submitEvaluation}><label className="form-field"><span>Pilih laporan</span><select name="report" defaultValue="RP-001">{reports.map((report) => <option key={report.id} value={report.id}>{report.id} · {report.period}</option>)}</select></label><label className="form-field"><span>Catatan evaluasi</span><textarea name="note" onChange={(event) => setEvaluationText(event.target.value)} placeholder="Tulis catatan atau arahan untuk laporan..." required rows={3} value={evaluationText} /></label><button className="button button-primary">Simpan Evaluasi</button></form><div className="evaluation-list">{evaluations.map((item) => <article className="evaluation-card" key={item.id}><div className="evaluation-card-head"><span className="evaluation-id">{item.id}</span><span>{item.date} · {item.report}</span></div><p>{item.note}</p><div className="staff-card-actions"><button className="button button-soft" onClick={() => setDialog({ title: "Edit Evaluasi", kind: "edit-evaluation", id: item.id })}>Edit</button><button className="button button-danger" onClick={() => openDelete("evaluation", item.id, "Evaluasi")}>Hapus</button></div></article>)}</div></section>;
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
      actions = <div className="modal-actions"><button className="button button-outline" onClick={closeDialog}>Batal</button><button className="button button-primary" onClick={() => { updateOrder(dialog.id ?? "", "Divalidasi"); setDialog({ title: "Pesanan berhasil divalidasi", tone: "green" }); }}>Validasi</button></div>;
    } else if (dialog.kind === "reject-payment") {
      actions = <div className="modal-actions"><button className="button button-outline" onClick={closeDialog}>Kembali</button><button className="button button-danger" onClick={() => { updateOrder(dialog.id ?? "", "Diproses", "Ditolak"); setDialog({ title: "Pembayaran Ditolak", description: "Status pembayaran diperbarui dan customer perlu mengirim bukti baru.", tone: "red" }); }}>Ya, Tolak Pembayaran</button></div>;
    } else if (dialog.kind === "owner-report") {
      actions = <div className="modal-actions modal-actions-wrap"><button className="button button-outline" onClick={() => { const reportId = dialog.id; closeDialog(); setEvaluationText(""); setView("Evaluasi Laporan"); if (reportId) setEvaluationText(`Evaluasi ${reportId}: `); }}>Evaluasi</button><button className="button button-success" onClick={() => { const report = reports.find((item) => item.id === dialog.id); if (report) approveReport(report); }}>Setujui</button></div>;
    } else if (dialog.kind === "print-report" || dialog.kind === "print-receipt") {
      actions = <div className="modal-actions"><button className="button button-outline" onClick={closeDialog}>Batal</button><button className="button button-primary" onClick={() => printDocument(dialog.kind === "print-report" ? "Laporan berhasil dicetak" : "Nota berhasil dicetak")}>Cetak sebagai PDF</button></div>;
    } else if (dialog.kind === "report-stock" || dialog.kind === "report-penjualan" || dialog.kind?.startsWith("edit-report-")) {
      const report = reports.find((item) => item.id === dialog.id);
      const isEdit = Boolean(dialog.id);
      actions = <form className="modal-form" onSubmit={submitReport}>
        <label className="form-field"><span>Periode</span><input defaultValue={report?.period ?? "November 2026"} name="period" required /></label>
        <label className="form-field"><span>Ringkasan</span><input defaultValue={report?.amount ?? ""} name="amount" placeholder="Contoh: 8 transaksi · Rp 850.000" required /></label>
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
        <div className="staff-page-content">{viewContent()}</div>
        <footer className="staff-footer">Amalakufood · Fresh From Our Oven</footer>
      </section>
      {renderDialog()}
    </main>
  );
}
