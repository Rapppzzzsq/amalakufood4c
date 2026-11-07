"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { roleHome, roleLabels, UserRole } from "../lib/roles";

type LoginFormProps = {
  role: UserRole;
};

type LoginSession = {
  username: string;
  role: UserRole;
  loggedInAt: string;
};

export default function LoginForm({ role }: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Masukkan username dan password untuk melanjutkan.");
      return;
    }

    setIsSubmitting(true);

    try {
      const session: LoginSession = {
        username: username.trim(),
        role,
        loggedInAt: new Date().toISOString(),
      };
      window.localStorage.setItem("amalakufood-session", JSON.stringify(session));
      router.push(roleHome(role));
    } catch {
      setError("Sesi tidak dapat disimpan di browser ini. Periksa pengaturan penyimpanan.");
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
          <button
            className="text-link recovery-link"
            onClick={() => setError("Fitur pemulihan password belum tersedia.")}
            type="button"
          >
            Lupa Password?
          </button>
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
      <p className="prototype-notice">
        Mode pratinjau: login frontend belum memvalidasi akun ke server.
      </p>
    </section>
  );
}
