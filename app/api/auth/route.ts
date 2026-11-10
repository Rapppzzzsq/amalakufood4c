import { prisma } from "../../../lib/prisma";
import { ApiError, createId, handleApiError, normalizeEmail, readJson, requiredString } from "../_lib/http";
import { hashPassword, verifyPassword } from "../_lib/password";
import { assertSessionConfig, clearSessionCookie, createSessionCookie, createSessionToken, isResponse, requireSession } from "../_lib/session";
import { parseUserRole, UserRole } from "../../lib/roles";

type UserProfile = {
  idPengguna: string;
  username: string;
  role: UserRole;
  profileId: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  points?: number;
};

function getUserProfile(user: {
  id_pengguna: string;
  username: string;
  role: string;
  admin: { id_admin: string; nama_admin: string; no_handphone: string; email_admin: string } | null;
  customer: { id_customer: string; nama_customer: string; no_handphone: string; email_customer: string; jalan: string | null; no_jalan: string | null; kelurahan: string | null; kecamatan: string | null; kota: string | null; poin: number } | null;
  kasir: { id_kasir: string; nama_kasir: string; no_handphone: string; email_kasir: string } | null;
  owner: { id_owner: string; nama_owner: string; no_handphone: string; email_owner: string } | null;
}): UserProfile {
  const role = parseUserRole(user.role);
  if (!role) throw new ApiError("Role pengguna tidak dikenal.", 500);

  if (role === "admin" && user.admin) {
    return { idPengguna: user.id_pengguna, username: user.username, role, profileId: user.admin.id_admin, name: user.admin.nama_admin, phone: user.admin.no_handphone, email: user.admin.email_admin };
  }
  if (role === "customer" && user.customer) {
    const profile = user.customer;
    const address = [profile.jalan, profile.no_jalan, profile.kelurahan, profile.kecamatan, profile.kota]
      .filter(Boolean)
      .join(", ");
    return { idPengguna: user.id_pengguna, username: user.username, role, profileId: profile.id_customer, name: profile.nama_customer, phone: profile.no_handphone, email: profile.email_customer, address, points: profile.poin };
  }
  if (role === "kasir" && user.kasir) {
    return { idPengguna: user.id_pengguna, username: user.username, role, profileId: user.kasir.id_kasir, name: user.kasir.nama_kasir, phone: user.kasir.no_handphone, email: user.kasir.email_kasir };
  }
  if (role === "owner" && user.owner) {
    return { idPengguna: user.id_pengguna, username: user.username, role, profileId: user.owner.id_owner, name: user.owner.nama_owner, phone: user.owner.no_handphone, email: user.owner.email_owner };
  }
  throw new ApiError("Profil pengguna tidak lengkap.", 500);
}

function sessionResponse(profile: UserProfile, status = 200) {
  const token = createSessionToken({
    idPengguna: profile.idPengguna,
    username: profile.username,
    role: profile.role,
    profileId: profile.profileId,
    name: profile.name,
  });
  return Response.json({ user: profile }, { status, headers: { "Set-Cookie": createSessionCookie(token), "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  try {
    const session = requireSession(request);
    if (isResponse(session)) return session;

    const user = await prisma.pengguna.findUnique({
      where: { id_pengguna: session.idPengguna },
      include: { admin: true, customer: true, kasir: true, owner: true },
    });
    if (!user) {
      return Response.json({ user: null }, { status: 401, headers: { "Set-Cookie": clearSessionCookie(), "Cache-Control": "no-store" } });
    }

    return Response.json({ user: getUserProfile(user) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "GET /api/auth");
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const action = body.action ?? "login";

    if (action === "logout") {
      return Response.json({ success: true }, { headers: { "Set-Cookie": clearSessionCookie(), "Cache-Control": "no-store" } });
    }

    if (action === "request-password-reset") {
      const username = requiredString(body.username, "Username", 50);
      const user = await prisma.pengguna.findUnique({
        where: { username },
        select: { id_pengguna: true },
      });
      if (!user) throw new ApiError("Username tidak ditemukan.", 404);
      return Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    }

    if (action === "reset-password") {
      const username = requiredString(body.username, "Username", 50);
      const otp = requiredString(body.otp, "Kode OTP", 6);
      if (otp !== "123456") throw new ApiError("Kode OTP tidak valid.", 400);
      const password = requiredString(body.password, "Password baru", 100, 8);
      await prisma.pengguna.update({
        where: { username },
        data: { password: await hashPassword(password) },
        select: { id_pengguna: true },
      });
      return Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    }

    assertSessionConfig();

    if (action === "register") {
      const username = requiredString(body.username, "Username", 50);
      const password = requiredString(body.password, "Password", 100, 8);
      const name = requiredString(body.name, "Nama lengkap", 100);
      const phone = requiredString(body.phone, "Nomor handphone", 15);
      const email = normalizeEmail(body.email);
      const address = requiredString(body.address, "Alamat", 100);
      const passwordHash = await hashPassword(password);
      const result = await prisma.$transaction(async (tx) => {
        const ids = { pengguna: createId("USR"), customer: createId("CUS"), registrasi: createId("REG") };
        const user = await tx.pengguna.create({
          data: { id_pengguna: ids.pengguna, username, password: passwordHash, role: "Customer" },
          select: { id_pengguna: true, username: true },
        });
        const customer = await tx.customer.create({
          data: {
            id_customer: ids.customer,
            id_pengguna: user.id_pengguna,
            nama_customer: name,
            no_handphone: phone,
            jalan: address,
            kota: "Padang",
            email_customer: email,
          },
        });
        await tx.registrasi.create({ data: { id_registrasi: ids.registrasi, id_customer: customer.id_customer } });
        return { user, customer };
      });

      const profile: UserProfile = {
        idPengguna: result.user.id_pengguna,
        username: result.user.username,
        role: "customer",
        profileId: result.customer.id_customer,
        name: result.customer.nama_customer,
        phone: result.customer.no_handphone,
        email: result.customer.email_customer,
        address,
        points: result.customer.poin,
      };
      return sessionResponse(profile, 201);
    }

    if (action !== "login") throw new ApiError("Aksi autentikasi tidak dikenal.", 400);
    const username = requiredString(body.username, "Username", 50);
    const password = requiredString(body.password, "Password", 100);
    const requestedRole = parseUserRole(typeof body.role === "string" ? body.role : undefined);
    if (!requestedRole) throw new ApiError("Role pengguna tidak valid.", 400);

    const user = await prisma.pengguna.findUnique({
      where: { username },
      include: { admin: true, customer: true, kasir: true, owner: true },
    });
    if (!user || parseUserRole(user.role) !== requestedRole || !(await verifyPassword(password, user.password))) {
      throw new ApiError("Username, password, atau role tidak sesuai.", 401);
    }

    if (!user.password.startsWith("scrypt$")) {
      await prisma.pengguna.update({
        where: { id_pengguna: user.id_pengguna },
        data: { password: await hashPassword(password) },
      });
    }

    return sessionResponse(getUserProfile(user));
  } catch (error) {
    return handleApiError(error, "POST /api/auth");
  }
}
