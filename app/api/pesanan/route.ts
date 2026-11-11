import { prisma } from "../../../lib/prisma";
import { ApiError, createId, handleApiError, isRecord, positiveInteger, readJson, requiredString } from "../_lib/http";
import { isResponse, requireSession } from "../_lib/session";

const paymentMethods = ["QRIS", "Transfer Bank", "Bayar di Toko"] as const;
const orderStatuses = ["Diproses", "Divalidasi", "Selesai"] as const;

function orderResponse(order: {
  id_pesanan: string;
  tanggal_pesanan: Date;
  status_pesanan: string;
  total_tagihan: { toString(): string };
  customer: { id_customer: string; nama_customer: string };
  detail_pesanan: { jumlah: number; subtotal: { toString(): string }; produk: { id_produk: string; nama_produk: string } }[];
  pembayaran: {
    metode_pembayaran: string;
    status_pembayaran: string;
    konfirmasi_customer: boolean;
    nota: { no_nota: string; tanggal_cetak: Date } | null;
  } | null;
}) {
  return {
    id: order.id_pesanan,
    date: order.tanggal_pesanan,
    status: order.status_pesanan,
    total: Number(order.total_tagihan),
    customerId: order.customer.id_customer,
    customer: order.customer.nama_customer,
    items: order.detail_pesanan.map((detail) => ({
      productId: detail.produk.id_produk,
      product: detail.produk.nama_produk,
      quantity: detail.jumlah,
      subtotal: Number(detail.subtotal),
    })),
    payment: order.pembayaran?.metode_pembayaran ?? "",
    paymentStatus: order.pembayaran?.status_pembayaran ?? "",
    customerConfirmed: order.pembayaran?.konfirmasi_customer ?? false,
    receipt: order.pembayaran?.nota?.no_nota ?? "",
    receiptDate: order.pembayaran?.nota?.tanggal_cetak ?? null,
  };
}

const orderInclude = {
  customer: { select: { id_customer: true, nama_customer: true } },
  detail_pesanan: { include: { produk: { select: { id_produk: true, nama_produk: true } } } },
  pembayaran: { include: { nota: { select: { no_nota: true, tanggal_cetak: true } } } },
};

export async function GET(request: Request) {
  try {
    const session = requireSession(request, ["customer", "kasir", "owner"]);
    if (isResponse(session)) return session;

    const where = session.role === "customer" ? { id_customer: session.profileId } : {};
    const orders = await prisma.pesanan.findMany({
      where,
      include: orderInclude,
      orderBy: [{ tanggal_pesanan: "desc" }, { id_pesanan: "desc" }],
    });
    const successfulSales = orders.reduce(
      (total, order) => total + (order.pembayaran?.status_pembayaran === "Berhasil" ? Number(order.total_tagihan) : 0),
      0,
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayOrders = orders.filter((order) => order.tanggal_pesanan >= today && order.tanggal_pesanan < tomorrow);
    return Response.json({
      orders: orders.map(orderResponse),
      summary: {
        transactionCount: orders.length,
        totalSales: successfulSales,
        todayTransactionCount: todayOrders.length,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "GET /api/pesanan");
  }
}

export async function POST(request: Request) {
  try {
    const session = requireSession(request, ["customer"]);
    if (isResponse(session)) return session;
    const body = await readJson(request);
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30) {
      throw new ApiError("Pesanan harus memiliki antara 1 dan 30 item.", 400);
    }

    const quantities = new Map<string, number>();
    for (const rawItem of body.items) {
      if (!isRecord(rawItem)) throw new ApiError("Format item pesanan tidak valid.", 400);
      const productId = requiredString(rawItem.productId, "ID produk", 10);
      const quantity = positiveInteger(rawItem.quantity, "Jumlah", 100);
      if (quantity < 1) throw new ApiError("Jumlah item minimal 1.", 400);
      quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
    }
    const method = body.paymentMethod;
    if (typeof method !== "string" || !paymentMethods.includes(method as (typeof paymentMethods)[number])) {
      throw new ApiError("Metode pembayaran tidak valid.", 400);
    }
    const deliveryAddress = requiredString(body.address, "Alamat pengiriman", 100);
    const recipientName = requiredString(body.name, "Nama penerima", 100);
    const phone = requiredString(body.phone, "Nomor handphone", 15);

    const created = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id_customer: session.profileId } });
      if (!customer) throw new ApiError("Profil Customer tidak ditemukan.", 404);
      const requestedIds = [...quantities.keys()];
      const productRows = await tx.produk.findMany({ where: { id_produk: { in: requestedIds } } });
      if (productRows.length !== requestedIds.length) throw new ApiError("Satu atau beberapa produk tidak ditemukan.", 404);

      const productById = new Map(productRows.map((product) => [product.id_produk, product]));
      let total = 0;
      const details: { id_produk: string; jumlah: number; harga: number; subtotal: number }[] = [];
      for (const [productId, quantity] of quantities) {
        const product = productById.get(productId);
        if (!product) throw new ApiError("Produk tidak ditemukan.", 404);
        if (quantity > product.stok) throw new ApiError(`Stok ${product.nama_produk} tidak mencukupi.`, 409);
        const price = Number(product.harga);
        total += price * quantity;
        details.push({ id_produk: productId, jumlah: quantity, harga: price, subtotal: price * quantity });
      }

      const orderId = createId("PS");
      const paymentId = createId("PAY");
      const receiptId = createId("NOT");
      await tx.pesanan.create({
        data: {
          id_pesanan: orderId,
          id_customer: customer.id_customer,
          status_pesanan: "Diproses",
          total_tagihan: total,
        },
      });

      for (const detail of details) {
        const update = await tx.produk.updateMany({
          where: { id_produk: detail.id_produk, stok: { gte: detail.jumlah } },
          data: { stok: { decrement: detail.jumlah } },
        });
        if (update.count !== 1) throw new ApiError("Stok produk berubah. Periksa keranjang dan coba kembali.", 409);
        await tx.detail_pesanan.create({
          data: {
            id_detail_pesanan: createId("DTL"),
            id_pesanan: orderId,
            id_produk: detail.id_produk,
            jumlah: detail.jumlah,
            harga_satuan: detail.harga,
            subtotal: detail.subtotal,
          },
        });
      }

      await tx.pembayaran.create({
        data: {
          id_pembayaran: paymentId,
          id_pesanan: orderId,
          metode_pembayaran: method,
          nominal_pembayaran: total,
          status_pembayaran: "Menunggu",
        },
      });
      await tx.nota.create({
        data: {
          id_nota: receiptId,
          id_pembayaran: paymentId,
          no_nota: `NT-${orderId.slice(3)}`,
        },
      });

      if (deliveryAddress || recipientName || phone) {
        await tx.customer.update({
          where: { id_customer: customer.id_customer },
          data: {
            ...(deliveryAddress ? { jalan: deliveryAddress } : {}),
            ...(recipientName ? { nama_customer: recipientName } : {}),
            ...(phone ? { no_handphone: phone } : {}),
          },
        });
      }

      return tx.pesanan.findUniqueOrThrow({ where: { id_pesanan: orderId }, include: orderInclude });
    }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 15000 });

    return Response.json({ order: orderResponse(created) }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "POST /api/pesanan");
  }
}

async function updateOrder(request: Request) {
  try {
    const session = requireSession(request, ["kasir", "customer"]);
    if (isResponse(session)) return session;
    const body = await readJson(request);
    const id = requiredString(body.id, "ID pesanan", 10);
    const action = body.action;

    if (session.role === "customer") {
      if (action !== "customer-confirm") throw new ApiError("Aksi ini hanya tersedia untuk Kasir.", 403);
      const order = await prisma.pesanan.findUnique({
        where: { id_pesanan: id },
        select: {
          id_customer: true,
          pembayaran: { select: { status_pembayaran: true } },
        },
      });
      if (!order) throw new ApiError("Pesanan tidak ditemukan.", 404);
      if (order.id_customer !== session.profileId) throw new ApiError("Pesanan ini bukan milik Customer yang sedang masuk.", 403);
      if (!order.pembayaran || order.pembayaran.status_pembayaran !== "Menunggu") {
        throw new ApiError("Pesanan ini tidak sedang menunggu konfirmasi pembayaran.", 409);
      }
      const updated = await prisma.pembayaran.update({
        where: { id_pesanan: id },
        data: { konfirmasi_customer: true },
      });
      return Response.json({ success: true, customerConfirmed: updated.konfirmasi_customer });
    }

    if (action === "print") {
      await prisma.$transaction(async (tx) => {
        const order = await tx.pesanan.findUnique({
          where: { id_pesanan: id },
          select: { pembayaran: { select: { id_pembayaran: true } } },
        });
        if (!order) throw new ApiError("Pesanan tidak ditemukan.", 404);
        if (!order.pembayaran) throw new ApiError("Pembayaran untuk pesanan ini tidak ditemukan.", 409);
        await tx.nota.update({
          where: { id_pembayaran: order.pembayaran.id_pembayaran },
          data: { tanggal_cetak: new Date() },
        });
      });
      return Response.json({ success: true });
    }

    if (action === "payment") {
      if (body.status !== "Berhasil" && body.status !== "Ditolak") {
        throw new ApiError("Status pembayaran tidak valid.", 400);
      }
      const paymentStatus = body.status;
      const result = await prisma.$transaction(async (tx) => {
        const order = await tx.pesanan.findUnique({
          where: { id_pesanan: id },
          select: { id_kasir: true, pembayaran: { select: { konfirmasi_customer: true } } },
        });
        if (!order) throw new ApiError("Pesanan tidak ditemukan.", 404);
        if (!order.pembayaran?.konfirmasi_customer) throw new ApiError("Customer belum mengonfirmasi pembayaran pesanan ini.", 409);
        await tx.pembayaran.update({
          where: { id_pesanan: id },
          data: { status_pembayaran: paymentStatus },
        });
        await tx.pesanan.update({
          where: { id_pesanan: id },
          data: {
            ...(paymentStatus === "Berhasil" ? { status_pesanan: "Divalidasi", id_kasir: session.profileId } : {}),
          },
        });
        return tx.pesanan.findUniqueOrThrow({ where: { id_pesanan: id }, include: orderInclude });
      });
      return Response.json({ order: orderResponse(result) });
    }

    const status = body.status ?? (action === "validate" ? "Divalidasi" : undefined);
    if (typeof status !== "string" || !orderStatuses.includes(status as (typeof orderStatuses)[number])) {
      throw new ApiError("Status pesanan tidak valid.", 400);
    }
    const result = await prisma.pesanan.update({
      where: { id_pesanan: id },
      data: { status_pesanan: status, id_kasir: session.profileId },
      include: orderInclude,
    });
    return Response.json({ order: orderResponse(result) });
  } catch (error) {
    return handleApiError(error, "PUT /api/pesanan");
  }
}

export const PUT = updateOrder;
export const PATCH = updateOrder;

export async function DELETE(request: Request) {
  try {
    const session = requireSession(request, ["kasir", "customer"]);
    if (isResponse(session)) return session;
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw new ApiError("ID pesanan wajib diisi.", 400);
    await prisma.$transaction(async (tx) => {
      const order = await tx.pesanan.findUnique({
        where: { id_pesanan: id },
        include: { detail_pesanan: true, pembayaran: true },
      });
      if (!order) throw new ApiError("Pesanan tidak ditemukan.", 404);
      if (session.role === "customer" && order.id_customer !== session.profileId) {
        throw new ApiError("Kamu tidak dapat menghapus pesanan milik customer lain.", 403);
      }
      if (session.role === "customer" && (order.status_pesanan === "Selesai" || order.pembayaran?.status_pembayaran === "Berhasil")) {
        throw new ApiError("Pesanan yang sudah dibayar atau selesai tidak dapat dibatalkan.", 409);
      }
      if (order.status_pesanan !== "Selesai" && order.pembayaran?.status_pembayaran !== "Berhasil") {
        for (const detail of order.detail_pesanan) {
          await tx.produk.update({
            where: { id_produk: detail.id_produk },
            data: { stok: { increment: detail.jumlah } },
          });
        }
      }
      await tx.pesanan.delete({ where: { id_pesanan: id } });
    });
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error, "DELETE /api/pesanan");
  }
}
