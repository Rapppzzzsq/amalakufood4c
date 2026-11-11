"use client";

import { InputHTMLAttributes, useState } from "react";

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="password-input">
      <input {...props} type={visible ? "text" : "password"} />
      <button
        aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
        aria-pressed={visible}
        className="password-toggle"
        onClick={() => setVisible((current) => !current)}
        type="button"
      >
        {visible ? (
          <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
            <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            <path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c5.2 0 8.6 4.2 9.5 6-.4.8-1.3 2-2.7 3.4M6.2 6.2C4.2 7.4 2.9 9.3 2.5 11c.9 1.8 4.3 6 9.5 6 1 0 1.9-.2 2.7-.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          </svg>
        ) : (
          <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
            <path d="M2.5 12s3.4-7 9.5-7 9.5 7 9.5 7-3.4 7-9.5 7-9.5-7-9.5-7Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        )}
      </button>
    </span>
  );
}
