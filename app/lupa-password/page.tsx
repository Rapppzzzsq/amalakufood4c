"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Brand } from "../components/brand";
import { apiJson, apiRequest } from "../lib/api";

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);
    try {
      await apiRequest("/api/auth", apiJson("POST", {
        action: "request-password-reset",
        username: username.trim(),
      }));
      setCodeSent(true);
      setNotice("Kode pemulihan telah dikirim ke kontak Anda. (Mode Demo: Gunakan kode 123456)");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Kode pemulihan tidak dapat dikirim. Silakan coba kembali.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");
    if (password !== confirmation) {
      setError("Password baru dan konfirmasi password harus sama.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest("/api/auth", apiJson("POST", {
        action: "reset-password",
        username,
        otp: formData.get("otp"),
        password,
      }));
      setCompleted(true);
      setNotice("Password berhasil diperbarui. Silakan masuk dengan password baru.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Password tidak dapat diperbarui. Silakan coba kembali.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-topbar">
        <Link href="/" aria-label="Kembali ke halaman awal"><Brand /></Link>
        <Link className="text-link back-link" href="/login">Kembali ke Login</Link>
      </div>

      <section className="auth-card" aria-labelledby="recovery-title">
        <div className="auth-card-heading">
          <span className="eyebrow">Pemulihan akun</span>
          <h1 id="recovery-title">Lupa Password?</h1>
          <p>Verifikasi username dan buat password baru untuk akun Amalakufood.</p>
        </div>

        {!codeSent ? (
          <form className="auth-form" onSubmit={requestCode}>
            <label className="form-field">
              <span>Username</span>
              <input autoComplete="username" onChange={(event) => setUsername(event.target.value)} placeholder="Masukkan username" required value={username} />
            </label>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className="button button-primary form-submit" disabled={isSubmitting}>
              {isSubmitting ? "Memeriksa..." : "Kirim Kode"}
              <span aria-hidden="true">→</span>
            </button>
          </form>
        ) : completed ? (
          <Link className="button button-primary form-submit" href="/login">Kembali ke Login <span aria-hidden="true">→</span></Link>
        ) : (
          <form className="auth-form" onSubmit={resetPassword}>
            <label className="form-field">
              <span>Username</span>
              <input autoComplete="username" readOnly value={username} />
            </label>
            <label className="form-field">
              <span>Kode OTP</span>
              <input autoComplete="one-time-code" inputMode="numeric" maxLength={6} name="otp" placeholder="Masukkan 6 digit kode" required />
            </label>
            <label className="form-field">
              <span>Password Baru</span>
              <input autoComplete="new-password" minLength={8} name="password" placeholder="Minimal 8 karakter" required type="password" />
            </label>
            <label className="form-field">
              <span>Konfirmasi Password</span>
              <input autoComplete="new-password" minLength={8} name="confirmation" placeholder="Masukkan kembali password" required type="password" />
            </label>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className="button button-primary form-submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Atur Ulang Password"}
              <span aria-hidden="true">→</span>
            </button>
            <button className="text-link recovery-link" onClick={() => { setCodeSent(false); setNotice(""); setError(""); }} type="button">Gunakan username lain</button>
          </form>
        )}

        {notice ? <p className="form-notice" role="status">{notice}</p> : null}
      </section>

      <footer className="auth-footer">Fresh From Our Oven · Toko Kue Amala</footer>
    </main>
  );
}
