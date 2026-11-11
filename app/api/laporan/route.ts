import { prisma } from "../../../lib/prisma";
import { ApiError, createId, handleApiError, parseDate, positiveInteger, readJson, requiredString } from "../_lib/http";
import { isResponse, requireSession } from "../_lib/session";

type ReportType = "Penjualan" | "Stok";

function reportResponse(report: {
  id_laporan_kasir: string;
  jenis_laporan: string;
  bulan_laporan: string | null;
  periode_awal: Date;
  periode_akhir: Date;
  jumlah_produk: number | null;
  total_stok: number | null;
  jumlah_transaksi: number | null;
  total_penjualan: { toString(): string };
  status_penjualan: string;
  id_produk: string | null;
  stok_awal: number | null;
  jumlah_keluar: number | null;
  stok_akhir: number | null;
  status_stok: string | null;
  catatan_kasir: string | null;
  kasir: { nama_kasir: string; id_kasir: string };
  produk: { nama_produk: string } | null;
  laporan_owner: {
    id_laporan_owner: string;
    catatan_evaluasi: string;
    tanggal_periksa: Date;
    status_persetujuan: string;
    owner: { nama_owner: string };
    laporan_akhir: { total_penjualan: { toString(): string }; jumlah_transaksi: number }[];
  }[];
}) {
  return {
    id: report.id_laporan_kasir,
    type: report.jenis_laporan,
    period: report.bulan_laporan ?? "",
    startDate: report.periode_awal,
    endDate: report.periode_akhir,
    productCount: report.jumlah_produk ?? 0,
    totalStock: report.total_stok ?? 0,
    transactionCount: report.jumlah_transaksi ?? 0,
    totalSales: Number(report.total_penjualan),
    amount: report.jenis_laporan === "Stok"
      ? `${report.produk?.nama_produk ?? `${report.jumlah_produk ?? 0} produk`} · sisa ${report.stok_akhir ?? report.total_stok ?? 0} · ${report.status_stok ?? "Stok"}`
      : `${report.jumlah_transaksi ?? 0} transaksi · Rp ${new Intl.NumberFormat("id-ID").format(Number(report.total_penjualan))}`,
    status: report.status_penjualan,
    cashier: report.kasir.nama_kasir,
    cashierId: report.kasir.id_kasir,
    productId: report.id_produk,
    productName: report.produk?.nama_produk ?? "",
    stockOpening: report.stok_awal,
    stockOut: report.jumlah_keluar,
    stockEnding: report.stok_akhir,
    stockStatus: report.status_stok,
    notes: report.catatan_kasir ?? "",
    evaluations: report.laporan_owner.map((evaluation) => ({
      id: evaluation.id_laporan_owner,
      note: evaluation.catatan_evaluasi,
      date: evaluation.tanggal_periksa,
      status: evaluation.status_persetujuan,
      owner: evaluation.owner.nama_owner,
      finalReports: evaluation.laporan_akhir.map((final) => ({
        totalSales: Number(final.total_penjualan),
        transactionCount: final.jumlah_transaksi,
      })),
    })),
  };
}

const reportInclude = {
  kasir: { select: { nama_kasir: true, id_kasir: true } },
  produk: { select: { nama_produk: true } },
  laporan_owner: {
    include: {
      owner: { select: { nama_owner: true } },
      laporan_akhir: { select: { total_penjualan: true, jumlah_transaksi: true } },
    },
    orderBy: { tanggal_periksa: "desc" as const },
  },
};

type ReportInput = {
  date: Date;
  period: string;
  productId?: string;
  stockOpening?: number;
  stockOut?: number;
  stockEnding?: number;
  stockStatus?: "Aman" | "Menipis" | "Habis";
  notes: string;
  orderCount?: number;
  productCount?: number;
  revenue?: number;
};

function parseReportInput(body: Record<string, unknown>, type: ReportType): ReportInput {
  const date = parseDate(body.date, "Tanggal laporan");
  const period = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  if (notes.length > 255) throw new ApiError("Catatan maksimal 255 karakter.", 400);

  if (type === "Stok") {
    const stockOpening = positiveInteger(body.stockOpening, "Stok awal");
    const stockOut = positiveInteger(body.stockOut, "Jumlah terjual/keluar");
    const stockEnding = positiveInteger(body.stockEnding, "Sisa stok akhir");
    if (stockOut > stockOpening || stockOpening - stockOut !== stockEnding) {
      throw new ApiError("Sisa stok akhir harus sama dengan stok awal dikurangi jumlah terjual/keluar.", 400);
    }
    if (typeof body.stockStatus !== "string" || !["Aman", "Menipis", "Habis"].includes(body.stockStatus)) {
      throw new ApiError("Status stok tidak valid.", 400);
    }
    if ((stockEnding === 0) !== (body.stockStatus === "Habis")) {
      throw new ApiError("Status Habis hanya berlaku jika sisa stok 0.", 400);
    }
    return {
      date,
      period,
      productId: requiredString(body.productId, "Produk", 10),
      stockOpening,
      stockOut,
      stockEnding,
      stockStatus: body.stockStatus as ReportInput["stockStatus"],
      notes,
    };
  }

  const revenue = Number(body.revenue);
  if (!Number.isFinite(revenue) || revenue < 0 || revenue > 999999999999.99) {
    throw new ApiError("Total pendapatan harus berupa nilai Rupiah yang valid.", 400);
  }
  return {
    date,
    period,
    orderCount: positiveInteger(body.orderCount, "Total pesanan selesai"),
    productCount: positiveInteger(body.productCount, "Total produk terjual"),
    revenue,
    notes,
  };
}

export async function GET(request: Request) {
  try {
    const session = requireSession(request, ["kasir", "owner"]);
    if (isResponse(session)) return session;
    const reports = await prisma.laporan_kasir.findMany({
      include: reportInclude,
      orderBy: [{ periode_akhir: "desc" }, { id_laporan_kasir: "desc" }],
    });
    const evaluations = reports.flatMap((report) =>
      report.laporan_owner.map((evaluation) => ({
        id: evaluation.id_laporan_owner,
        report: report.id_laporan_kasir,
        note: evaluation.catatan_evaluasi,
        date: evaluation.tanggal_periksa,
        status: evaluation.status_persetujuan,
        owner: evaluation.owner.nama_owner,
      })),
    );
    const finalReports = reports.flatMap((report) =>
      report.laporan_owner.flatMap((evaluation) =>
        evaluation.laporan_akhir.map((final) => ({
          id: `LA-${evaluation.id_laporan_owner.slice(3)}`,
          evaluationId: evaluation.id_laporan_owner,
          reportId: report.id_laporan_kasir,
          totalSales: Number(final.total_penjualan),
          transactionCount: final.jumlah_transaksi,
        })),
      ),
    );
    return Response.json({
      reports: reports.map(reportResponse),
      evaluations,
      finalReports,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "GET /api/laporan");
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    if (body.action === "evaluation") {
      const session = requireSession(request, ["owner"]);
      if (isResponse(session)) return session;
      const reportId = requiredString(body.reportId, "ID laporan", 15);
      const note = requiredString(body.note, "Catatan evaluasi", 255);
      const report = await prisma.laporan_kasir.findUnique({ where: { id_laporan_kasir: reportId }, select: { id_laporan_kasir: true } });
      if (!report) throw new ApiError("Laporan kasir tidak ditemukan.", 404);
      const evaluation = await prisma.laporan_owner.create({
        data: {
          id_laporan_owner: createId("EV"),
          id_owner: session.profileId,
          id_laporan_kasir: reportId,
          catatan_evaluasi: note,
          status_persetujuan: "Menunggu",
        },
        include: { owner: { select: { nama_owner: true } } },
      });
      return Response.json({
        evaluation: {
          id: evaluation.id_laporan_owner,
          report: evaluation.id_laporan_kasir,
          note: evaluation.catatan_evaluasi,
          date: evaluation.tanggal_periksa,
          status: evaluation.status_persetujuan,
          owner: evaluation.owner.nama_owner,
        },
      }, { status: 201 });
    }

    const session = requireSession(request, ["kasir"]);
    if (isResponse(session)) return session;
    if (body.action !== "report") throw new ApiError("Aksi laporan tidak dikenal.", 400);
    if (body.type !== "Stok" && body.type !== "Penjualan") throw new ApiError("Jenis laporan tidak valid.", 400);
    const type: ReportType = body.type;
    const input = parseReportInput(body, type);
    if (input.productId && !(await prisma.produk.findUnique({ where: { id_produk: input.productId }, select: { id_produk: true } }))) {
      throw new ApiError("Produk tidak ditemukan.", 404);
    }
    const report = await prisma.laporan_kasir.create({
      data: {
        id_laporan_kasir: createId(type === "Stok" ? "RS" : "RP"),
        id_kasir: session.profileId,
        periode_awal: input.date,
        periode_akhir: input.date,
        bulan_laporan: input.period,
        jenis_laporan: type,
        jumlah_produk: type === "Stok" ? 1 : input.productCount,
        total_stok: input.stockEnding ?? 0,
        jumlah_transaksi: input.orderCount ?? 0,
        total_penjualan: input.revenue ?? 0,
        id_produk: input.productId ?? null,
        stok_awal: input.stockOpening ?? null,
        jumlah_keluar: input.stockOut ?? null,
        stok_akhir: input.stockEnding ?? null,
        status_stok: input.stockStatus ?? null,
        catatan_kasir: input.notes || null,
        status_penjualan: "Menunggu Pemeriksaan",
      },
      include: reportInclude,
    });
    return Response.json({ report: reportResponse(report) }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "POST /api/laporan");
  }
}

async function updateReport(request: Request) {
  try {
    const body = await readJson(request);
    if (body.action === "approve") {
      const session = requireSession(request, ["owner"]);
      if (isResponse(session)) return session;
      const reportId = requiredString(body.reportId, "ID laporan", 15);
      const result = await prisma.$transaction(async (tx) => {
        const report = await tx.laporan_kasir.findUnique({ where: { id_laporan_kasir: reportId } });
        if (!report) throw new ApiError("Laporan tidak ditemukan.", 404);

        const existingOwnerReport = await tx.laporan_owner.findFirst({
          where: { id_owner: session.profileId, id_laporan_kasir: reportId },
          orderBy: { tanggal_periksa: "desc" },
        });
        const ownerReport = existingOwnerReport
          ? await tx.laporan_owner.update({
              where: { id_laporan_owner: existingOwnerReport.id_laporan_owner },
              data: { status_persetujuan: "Disetujui" },
            })
          : await tx.laporan_owner.create({
              data: {
                id_laporan_owner: createId("EV"),
                id_owner: session.profileId,
                id_laporan_kasir: reportId,
                catatan_evaluasi: "Disetujui oleh Owner.",
                status_persetujuan: "Disetujui",
              },
            });

        await tx.laporan_kasir.update({
          where: { id_laporan_kasir: reportId },
          data: { status_penjualan: "Disetujui" },
        });
        const finalReport = await tx.laporan_akhir.findFirst({
          where: { id_laporan_owner: ownerReport.id_laporan_owner },
        });
        const finalData = {
          total_penjualan: report.total_penjualan,
          jumlah_transaksi: report.jumlah_transaksi ?? 0,
        };
        const final = finalReport
          ? await tx.laporan_akhir.update({ where: { id_laporan_akhir: finalReport.id_laporan_akhir }, data: finalData })
          : await tx.laporan_akhir.create({
              data: {
                id_laporan_akhir: createId("LA"),
                id_laporan_owner: ownerReport.id_laporan_owner,
                ...finalData,
              },
            });
        return { ownerReport, final };
      });
      return Response.json({
        success: true,
        evaluationId: result.ownerReport.id_laporan_owner,
        finalReportId: result.final.id_laporan_akhir,
      });
    }

    if (body.action === "update-evaluation") {
      const session = requireSession(request, ["owner"]);
      if (isResponse(session)) return session;
      const id = requiredString(body.id, "ID evaluasi", 15);
      const note = requiredString(body.note, "Catatan evaluasi", 255);
      const existing = await prisma.laporan_owner.findUnique({ where: { id_laporan_owner: id }, select: { id_owner: true } });
      if (!existing) throw new ApiError("Evaluasi tidak ditemukan.", 404);
      if (existing.id_owner !== session.profileId) throw new ApiError("Evaluasi ini bukan milik Owner yang sedang masuk.", 403);
      const evaluation = await prisma.laporan_owner.update({
        where: { id_laporan_owner: id },
        data: { catatan_evaluasi: note },
      });
      return Response.json({ id: evaluation.id_laporan_owner, note: evaluation.catatan_evaluasi });
    }

    const session = requireSession(request, ["kasir"]);
    if (isResponse(session)) return session;
    if (body.action !== "update-report") throw new ApiError("Aksi laporan tidak dikenal.", 400);
    const id = requiredString(body.id, "ID laporan", 15);
    const existing = await prisma.laporan_kasir.findUnique({ where: { id_laporan_kasir: id } });
    if (!existing) throw new ApiError("Laporan tidak ditemukan.", 404);
    if (existing.id_kasir !== session.profileId) throw new ApiError("Laporan ini bukan milik Kasir yang sedang masuk.", 403);
    const type = existing.jenis_laporan as ReportType;
    const input = parseReportInput(body, type);
    if (input.productId && !(await prisma.produk.findUnique({ where: { id_produk: input.productId }, select: { id_produk: true } }))) {
      throw new ApiError("Produk tidak ditemukan.", 404);
    }
    const report = await prisma.laporan_kasir.update({
      where: { id_laporan_kasir: id },
      data: {
        periode_awal: input.date,
        periode_akhir: input.date,
        bulan_laporan: input.period,
        jumlah_produk: type === "Stok" ? 1 : input.productCount,
        total_stok: input.stockEnding ?? 0,
        jumlah_transaksi: input.orderCount ?? 0,
        total_penjualan: input.revenue ?? 0,
        id_produk: input.productId ?? null,
        stok_awal: input.stockOpening ?? null,
        jumlah_keluar: input.stockOut ?? null,
        stok_akhir: input.stockEnding ?? null,
        status_stok: input.stockStatus ?? null,
        catatan_kasir: input.notes || null,
      },
      include: reportInclude,
    });
    return Response.json({ report: reportResponse(report) });
  } catch (error) {
    return handleApiError(error, "PUT /api/laporan");
  }
}

export const PUT = updateReport;
export const PATCH = updateReport;

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const kind = url.searchParams.get("kind") ?? "report";
    if (!id) throw new ApiError("ID laporan wajib diisi.", 400);

    if (kind === "evaluation") {
      const session = requireSession(request, ["owner"]);
      if (isResponse(session)) return session;
      const evaluation = await prisma.laporan_owner.findUnique({ where: { id_laporan_owner: id }, select: { id_owner: true } });
      if (!evaluation) throw new ApiError("Evaluasi tidak ditemukan.", 404);
      if (evaluation.id_owner !== session.profileId) throw new ApiError("Evaluasi ini bukan milik Owner yang sedang masuk.", 403);
      await prisma.laporan_owner.delete({ where: { id_laporan_owner: id } });
      return Response.json({ success: true });
    }

    const session = requireSession(request, ["kasir", "owner"]);
    if (isResponse(session)) return session;
    const report = await prisma.laporan_kasir.findUnique({ where: { id_laporan_kasir: id }, select: { id_kasir: true } });
    if (!report) throw new ApiError("Laporan tidak ditemukan.", 404);
    if (session.role === "kasir" && report.id_kasir !== session.profileId) {
      throw new ApiError("Kasir hanya dapat menghapus laporan miliknya.", 403);
    }
    await prisma.laporan_kasir.delete({ where: { id_laporan_kasir: id } });
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error, "DELETE /api/laporan");
  }
}
