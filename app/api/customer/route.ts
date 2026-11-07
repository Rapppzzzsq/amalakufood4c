import { prisma } from "../../../lib/prisma";
import { hashPassword } from "../_lib/password";
import { ApiError, handleApiError, normalizeEmail, positiveInteger, readJson, requiredString } from "../_lib/http";
import { isResponse, requireSession } from "../_lib/session";

function customerResponse(customer: {
  id_customer: string;
  id_pengguna: string;
  nama_customer: string;
  no_handphone: string;
  jalan: string | null;
  no_jalan: string | null;
  kelurahan: string | null;
  kecamatan: string | null;
  kota: string | null;
  email_customer: string;
  poin: number;
  pengguna: { username: string };
}) {
  return {
    id: customer.id_customer,
    userId: customer.id_pengguna,
    name: customer.nama_customer,
    phone: customer.no_handphone,
    email: customer.email_customer,
    username: customer.pengguna.username,
    address: [customer.jalan, customer.no_jalan, customer.kelurahan, customer.kecamatan, customer.kota].filter(Boolean).join(", "),
    points: customer.poin,
  };
}

export async function GET(request: Request) {
  try {
    const session = requireSession(request, ["admin", "owner", "customer"]);
    if (isResponse(session)) return session;
    const customers = await prisma.customer.findMany({
      where: session.role === "customer" ? { id_customer: session.profileId } : undefined,
      include: { pengguna: { select: { username: true } } },
      orderBy: { nama_customer: "asc" },
    });
    return Response.json({ customers: customers.map(customerResponse) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "GET /api/customer");
  }
}

export async function PUT(request: Request) {
  try {
    const session = requireSession(request, ["admin", "customer"]);
    if (isResponse(session)) return session;
    const body = await readJson(request);
    const customerId = session.role === "customer"
      ? session.profileId
      : requiredString(body.id, "ID customer", 10);
    const action = body.action;

    if (action === "points") {
      if (session.role !== "admin") throw new ApiError("Hanya Admin yang dapat mengubah poin.", 403);
      const points = positiveInteger(body.points, "Poin", 2147483647);
      const customer = await prisma.customer.update({
        where: { id_customer: customerId },
        data: { poin: points },
        include: { pengguna: { select: { username: true } } },
      });
      return Response.json({ customer: customerResponse(customer) });
    }

    const current = await prisma.customer.findUnique({ where: { id_customer: customerId }, select: { id_pengguna: true } });
    if (!current) throw new ApiError("Customer tidak ditemukan.", 404);
    const customerData: {
      nama_customer?: string;
      no_handphone?: string;
      email_customer?: string;
      jalan?: string | null;
    } = {};
    const userData: { username?: string; password?: string } = {};
    if (body.name !== undefined) customerData.nama_customer = requiredString(body.name, "Nama lengkap", 100);
    if (body.phone !== undefined) customerData.no_handphone = requiredString(body.phone, "Nomor handphone", 15);
    if (body.email !== undefined) customerData.email_customer = normalizeEmail(body.email);
    if (body.address !== undefined) {
      if (typeof body.address !== "string") throw new ApiError("Alamat tidak valid.", 400);
      customerData.jalan = body.address.trim() ? requiredString(body.address, "Alamat", 100) : null;
    }
    if (body.username !== undefined) userData.username = requiredString(body.username, "Username", 50);
    if (body.password !== undefined && body.password !== "") {
      userData.password = await hashPassword(requiredString(body.password, "Password", 100, 8));
    }
    if (!Object.keys(customerData).length && !Object.keys(userData).length) {
      throw new ApiError("Tidak ada data profil untuk diubah.", 400);
    }

    const customer = await prisma.$transaction(async (tx) => {
      if (Object.keys(userData).length) {
        await tx.pengguna.update({ where: { id_pengguna: current.id_pengguna }, data: userData });
      }
      return tx.customer.findUniqueOrThrow({
        where: { id_customer: customerId },
        include: { pengguna: { select: { username: true } } },
      }).then(async (existing) => {
        if (Object.keys(customerData).length) {
          return tx.customer.update({
            where: { id_customer: customerId },
            data: customerData,
            include: { pengguna: { select: { username: true } } },
          });
        }
        return existing;
      });
    });
    return Response.json({ customer: customerResponse(customer) });
  } catch (error) {
    return handleApiError(error, "PUT /api/customer");
  }
}

export const PATCH = PUT;

export async function DELETE(request: Request) {
  try {
    const session = requireSession(request, ["admin"]);
    if (isResponse(session)) return session;
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw new ApiError("ID customer wajib diisi.", 400);
    const customer = await prisma.customer.findUnique({ where: { id_customer: id }, select: { id_pengguna: true } });
    if (!customer) throw new ApiError("Customer tidak ditemukan.", 404);
    await prisma.$transaction(async (tx) => {
      await tx.customer.delete({ where: { id_customer: id } });
      await tx.pengguna.delete({ where: { id_pengguna: customer.id_pengguna } });
    });
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error, "DELETE /api/customer");
  }
}
