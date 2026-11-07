import { prisma } from "../../../lib/prisma";
import { ApiError, createId, handleApiError, positiveInteger, readJson, requiredString } from "../_lib/http";
import { isResponse, requireSession } from "../_lib/session";

const productResponse = (product: {
  id_produk: string;
  nama_produk: string;
  kategori: string;
  harga: { toString(): string };
  stok: number;
  deskripsi: string | null;
}) => ({
  id: product.id_produk,
  name: product.nama_produk,
  category: product.kategori,
  price: Number(product.harga),
  stock: product.stok,
  description: product.deskripsi ?? "",
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get("category")?.trim();
    const search = url.searchParams.get("search")?.trim();
    const products = await prisma.produk.findMany({
      where: {
        ...(category && category !== "Semua" ? { kategori: { equals: category, mode: "insensitive" as const } } : {}),
        ...(search ? { nama_produk: { contains: search, mode: "insensitive" as const } } : {}),
      },
      orderBy: { nama_produk: "asc" },
    });
    return Response.json({ products: products.map(productResponse) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "GET /api/produk");
  }
}

export async function POST(request: Request) {
  try {
    const session = requireSession(request, ["admin"]);
    if (isResponse(session)) return session;

    const body = await readJson(request);
    const name = requiredString(body.name, "Nama produk", 100);
    const category = requiredString(body.category, "Kategori", 50);
    const price = Number(body.price);
    if (!Number.isFinite(price) || price <= 0 || price > 9999999999) {
      throw new ApiError("Harga harus lebih besar dari 0 dan tidak melebihi batas.", 400);
    }
    const stock = positiveInteger(body.stock, "Stok");
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const admin = await prisma.admin.findUnique({ where: { id_admin: session.profileId }, select: { id_admin: true } });
    if (!admin) throw new ApiError("Profil Admin tidak ditemukan.", 403);

    const product = await prisma.produk.create({
      data: {
        id_produk: createId("PRD"),
        id_admin: admin.id_admin,
        nama_produk: name,
        kategori: category,
        harga: price,
        stok: stock,
        deskripsi: description || null,
      },
    });
    return Response.json({ product: productResponse(product) }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "POST /api/produk");
  }
}

async function updateProduct(request: Request) {
  try {
    const session = requireSession(request, ["admin"]);
    if (isResponse(session)) return session;
    const body = await readJson(request);
    const id = requiredString(body.id, "ID produk", 10);
    const data: {
      nama_produk?: string;
      kategori?: string;
      harga?: number;
      stok?: number;
      deskripsi?: string | null;
    } = {};
    if (body.name !== undefined) data.nama_produk = requiredString(body.name, "Nama produk", 100);
    if (body.category !== undefined) data.kategori = requiredString(body.category, "Kategori", 50);
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price <= 0 || price > 9999999999) {
        throw new ApiError("Harga harus lebih besar dari 0 dan tidak melebihi batas.", 400);
      }
      data.harga = price;
    }
    if (body.stock !== undefined) data.stok = positiveInteger(body.stock, "Stok");
    if (body.description !== undefined) {
      if (typeof body.description !== "string") throw new ApiError("Deskripsi tidak valid.", 400);
      data.deskripsi = body.description.trim() || null;
    }
    if (!Object.keys(data).length) throw new ApiError("Tidak ada data produk untuk diubah.", 400);

    const product = await prisma.produk.update({ where: { id_produk: id }, data });
    return Response.json({ product: productResponse(product) });
  } catch (error) {
    return handleApiError(error, "PUT /api/produk");
  }
}

export const PUT = updateProduct;
export const PATCH = updateProduct;

export async function DELETE(request: Request) {
  try {
    const session = requireSession(request, ["admin"]);
    if (isResponse(session)) return session;
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw new ApiError("ID produk wajib diisi.", 400);
    await prisma.produk.delete({ where: { id_produk: id } });
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error, "DELETE /api/produk");
  }
}
