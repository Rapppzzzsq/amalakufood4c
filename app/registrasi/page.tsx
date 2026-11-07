"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Brand } from "../components/brand";

export default function RegistrationPage() {
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    if (formData.get("password") !== formData.get("confirmPassword")) {
      setMessage("Password dan ulangi password harus sama.");
      return;
    }

    setMessage(
      "Formulir sudah lengkap. Pendaftaran akun akan tersedia setelah layanan server dihubungkan.",
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-topbar">
        <Link href="/" aria-label="Kembali ke halaman awal">
          <Brand />
        </Link>
        <Link className="text-link back-link" href="/login?role=customer">
          Sudah punya akun?
        </Link>
      </div>

      <section className="auth-card registration-card" aria-labelledby="registration-title">
        <div className="auth-card-heading">
          <span className="eyebrow">Gabung bersama kami</span>
          <h1 id="registration-title">Buat akun Customer</h1>
          <p>Isi data diri untuk menikmati kue segar dari Toko Kue Amala.</p>
        </div>

        <form className="auth-form registration-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Nama lengkap</span>
            <input autoComplete="name" name="name" placeholder="Nama lengkap" required />
          </label>
          <label className="form-field">
            <span>Username</span>
            <input
              autoComplete="username"
              name="username"
              placeholder="Buat username"
              required
            />
          </label>
          <label className="form-field">
            <span>Email</span>
            <input
              autoComplete="email"
              name="email"
              placeholder="nama@email.com"
              required
              type="email"
            />
          </label>
          <label className="form-field">
            <span>Nomor handphone</span>
            <input
              autoComplete="tel"
              name="phone"
              placeholder="08xxxxxxxxxx"
              required
              type="tel"
            />
          </label>
          <label className="form-field">
            <span>Password</span>
            <input
              autoComplete="new-password"
              minLength={8}
              name="password"
              placeholder="Minimal 8 karakter"
              required
              type="password"
            />
          </label>
          <label className="form-field">
            <span>Ulangi password</span>
            <input
              autoComplete="new-password"
              minLength={8}
              name="confirmPassword"
              placeholder="Masukkan kembali password"
              required
              type="password"
            />
          </label>

          {message ? (
            <p className="form-notice" role="status">
              {message}
            </p>
          ) : null}

          <button className="button button-primary form-submit">
            Daftar sebagai Customer
            <span aria-hidden="true">→</span>
          </button>
        </form>

        <p className="auth-switch">
          Sudah punya akun?{" "}
          <Link className="text-link" href="/login?role=customer">
            Masuk
          </Link>
        </p>
      </section>
      <footer className="auth-footer">Fresh From Our Oven · Toko Kue Amala</footer>
    </main>
  );
}
