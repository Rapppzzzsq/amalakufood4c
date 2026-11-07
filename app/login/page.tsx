import { Suspense } from "react";
import Link from "next/link";
import { Brand } from "../components/brand";
import LoginForm from "../components/login-form";
import { parseUserRole } from "../lib/roles";

type LoginPageProps = {
  searchParams: Promise<{ role?: string }>;
};

async function LoginContent({ searchParams }: LoginPageProps) {
  const { role: requestedRole } = await searchParams;
  const role = parseUserRole(requestedRole) ?? "customer";

  return (
    <LoginForm role={role} />
  );
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <main className="auth-page">
      <div className="auth-topbar">
        <Link href="/" aria-label="Kembali ke halaman awal">
          <Brand />
        </Link>
        <Link className="text-link back-link" href="/pilih-peran">
          Ganti peran
        </Link>
      </div>
      <Suspense
        fallback={
          <section aria-busy="true" className="auth-card">
            Memuat formulir login...
          </section>
        }
      >
        <LoginContent searchParams={searchParams} />
      </Suspense>
      <footer className="auth-footer">Fresh From Our Oven · Toko Kue Amala</footer>
    </main>
  );
}
