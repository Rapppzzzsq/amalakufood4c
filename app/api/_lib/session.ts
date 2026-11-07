import { createHmac, timingSafeEqual } from "node:crypto";
import { ApiError, jsonError } from "./http";
import { UserRole, userRoles } from "../../lib/roles";

export const SESSION_COOKIE = "amalakufood_session";
const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 7;

export type Session = {
  idPengguna: string;
  username: string;
  role: UserRole;
  profileId: string;
  name: string;
  expiresAt: number;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new ApiError("AUTH_SECRET wajib diatur dan memiliki minimal 32 karakter.", 500);
  }
  return value;
}

export function assertSessionConfig() {
  secret();
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(
  input: Omit<Session, "expiresAt">,
) {
  const session: Session = {
    ...input,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function createSessionCookie(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_LIFETIME_SECONDS}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function readSession(request: Request): Session | null {
  const cookie = request.headers.get("cookie");
  const token = cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (!token) return null;

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;

  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (
    typeof value !== "object" ||
    value === null ||
    !("idPengguna" in value) ||
    !("username" in value) ||
    !("role" in value) ||
    !("profileId" in value) ||
    !("name" in value) ||
    !("expiresAt" in value) ||
    typeof value.idPengguna !== "string" ||
    typeof value.username !== "string" ||
    typeof value.role !== "string" ||
    !userRoles.includes(value.role as UserRole) ||
    typeof value.profileId !== "string" ||
    typeof value.name !== "string" ||
    typeof value.expiresAt !== "number" ||
    value.expiresAt <= Math.floor(Date.now() / 1000)
  ) {
    return null;
  }

  return value as Session;
}

export function requireSession(request: Request, roles?: UserRole[]) {
  const session = readSession(request);
  if (!session) return jsonError("Silakan masuk untuk melanjutkan.", 401);
  if (roles && !roles.includes(session.role)) {
    return jsonError("Kamu tidak memiliki izin untuk melakukan tindakan ini.", 403);
  }
  return session;
}

export function isResponse(value: Session | Response): value is Response {
  return value instanceof Response;
}
