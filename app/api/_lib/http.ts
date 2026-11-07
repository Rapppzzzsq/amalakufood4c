import { randomInt } from "node:crypto";
import { Prisma } from "../../../app/generated/prisma/client";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new ApiError("Permintaan harus berupa JSON yang valid.", 400);
  }

  if (!isRecord(value)) {
    throw new ApiError("Isi permintaan tidak valid.", 400);
  }
  return value;
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export function handleApiError(error: unknown, operation: string) {
  if (error instanceof ApiError) {
    return jsonError(error.message, error.status);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return jsonError("Data dengan nilai tersebut sudah tersedia.", 409);
    if (error.code === "P2025") return jsonError("Data tidak ditemukan.", 404);
    if (error.code === "P2003" || error.code === "P2014") {
      return jsonError("Data masih digunakan oleh catatan lain dan tidak dapat diubah.", 409);
    }
  }
  console.error(`[api] ${operation} failed`, error);
  return jsonError("Terjadi kesalahan pada server. Silakan coba kembali.", 500);
}

export function createId(prefix: string) {
  const suffix = randomInt(36 ** 6).toString(36).toUpperCase().padStart(6, "0");
  return `${prefix}-${suffix}`;
}

export function requiredString(
  value: unknown,
  name: string,
  maxLength: number,
  minLength = 1,
) {
  if (typeof value !== "string") {
    throw new ApiError(`${name} wajib diisi.`, 400);
  }
  const normalized = value.trim();
  if (normalized.length < minLength || normalized.length > maxLength) {
    throw new ApiError(`${name} harus berisi ${minLength}–${maxLength} karakter.`, 400);
  }
  return normalized;
}

export function optionalString(value: unknown, maxLength: number, name: string) {
  if (value === undefined || value === null || value === "") return undefined;
  return requiredString(value, name, maxLength);
}

export function positiveInteger(value: unknown, name: string, maximum = 1000000) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < 0 || number > maximum) {
    throw new ApiError(`${name} harus berupa bilangan bulat yang valid.`, 400);
  }
  return number;
}

export function parseDate(value: unknown, name: string, fallback = new Date()) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") throw new ApiError(`${name} tidak valid.`, 400);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ApiError(`${name} tidak valid.`, 400);
  return date;
}

export function normalizeEmail(value: unknown) {
  return requiredString(value, "Email", 100).toLowerCase();
}

export function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
