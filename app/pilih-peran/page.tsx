import Link from "next/link";
import { Brand } from "../components/brand";
import { roleLabels, userRoles } from "../lib/roles";

export default function ChooseRolePage() {
  return (
    <main className="auth-page role-page">
      <div className="auth-topbar">
        <Link href="/" aria-label="Kembali ke halaman awal">
          <Brand />
        </Link>
        <span className="topbar-caption">Fresh From Our Oven</span>
      </div>

      <section className="role-content" aria-labelledby="role-title">
        <div className="role-heading">
          <span className="eyebrow">Selamat datang di</span>
          <h1 id="role-title">Hai! Selamat Datang!</h1>
          <p>Senang bertemu denganmu. Yuk, lanjutkan ke Amalakufood.</p>
        </div>

        <div className="role-panel">
          <span className="role-badge">Masuk sebagai</span>
          <div className="role-options">
            {userRoles.map((role, index) => (
              <Link
                className="role-option"
                href={`/login?role=${role}`}
                key={role}
              >
                <span className="role-option-icon" aria-hidden="true">
                  {index === 0 ? "01" : `0${index + 1}`}
                </span>
                <span>{roleLabels[role]}</span>
                <span className="role-option-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
          <p className="role-help">
            Pilih peran untuk masuk ke akun Amalakufood kamu.
          </p>
        </div>
      </section>

      <footer className="auth-footer">Dibuat dengan hangat oleh Toko Kue Amala</footer>
    </main>
  );
}
