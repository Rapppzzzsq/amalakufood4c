"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "../components/brand";
import { PasswordField } from "../components/password-field";
import { apiJson, apiRequest } from "../lib/api";

export default function RegistrationPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    if (formData.get("password") !== formData.get("confirmPassword")) {
      setMessage("Password dan ulangi password harus sama.");
      return;
    }

    setMessage("");
    setIsSubmitting(true);
    try {
      await apiRequest("/api/auth", apiJson("POST", {
        action: "register",
        name: formData.get("name"),
        username: formData.get("username"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        address: formData.get("address"),
        password: formData.get("password"),
      }));
      router.push("/customer");
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Pendaftaran gagal. Silakan coba kembali.");
      setIsSubmitting(false);
    }
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
            <span>Alamat</span>
            <input autoComplete="street-address" maxLength={100} name="address" placeholder="Alamat lengkap" required />
          </label>
          <label className="form-field">
            <span>Password</span>
            <PasswordField
              autoComplete="new-password"
              minLength={8}
              name="password"
              placeholder="Minimal 8 karakter"
              required
            />
          </label>
          <label className="form-field">
            <span>Ulangi password</span>
            <PasswordField
              autoComplete="new-password"
              minLength={8}
              name="confirmPassword"
              placeholder="Masukkan kembali password"
              required
            />
          </label>

          {message ? (
            <p className="form-error" role="alert">
              {message}
            </p>
          ) : null}

          <button className="button button-primary form-submit" disabled={isSubmitting}>
            {isSubmitting ? "Memproses..." : "Daftar sebagai Customer"}
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
