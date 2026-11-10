"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { roleHome, roleLabels, UserRole } from "../lib/roles";
import { apiJson, apiRequest } from "../lib/api";

type LoginFormProps = {
  role: UserRole;
};

export default function LoginForm({ role }: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Masukkan username dan password untuk melanjutkan.");
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest("/api/auth", apiJson("POST", {
        username: username.trim(),
        password,
        role,
      }));
      router.push(roleHome(role));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Login gagal. Silakan coba kembali.");
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-card" aria-labelledby="login-title">
      <div className="auth-card-heading">
        <span className="eyebrow">Selamat datang kembali</span>
        <h1 id="login-title">Masuk ke Amalakufood</h1>
        <p>
          Masuk sebagai <strong>{roleLabels[role]}</strong> untuk melanjutkan.
        </p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Username</span>
          <input
            autoComplete="username"
            name="username"
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Masukkan username"
            required
            value={username}
          />
        </label>

        <label className="form-field">
          <span>Password</span>
          <input
            autoComplete="current-password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Masukkan password"
            required
            type="password"
            value={password}
          />
        </label>

        <div className="form-options">
          <span />
          <Link className="text-link recovery-link" href="/lupa-password">
            Lupa Password?
          </Link>
        </div>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <button className="button button-primary form-submit" disabled={isSubmitting}>
          {isSubmitting ? "Memproses..." : `Masuk sebagai ${roleLabels[role]}`}
          <span aria-hidden="true">→</span>
        </button>
      </form>

      {role === "customer" ? (
        <p className="auth-switch">
          Belum punya akun?{" "}
          <Link className="text-link" href="/registrasi">
            Daftar
          </Link>
        </p>
      ) : null}
    </section>
  );
}
