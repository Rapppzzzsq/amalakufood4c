"use client";

import { ReactNode } from "react";
import { useEffect } from "react";

export type ModalTone = "yellow" | "red" | "green";

type ModalProps = {
  title: string;
  description?: string;
  tone?: ModalTone;
  children?: ReactNode;
  onClose: () => void;
};

export function Modal({
  title,
  description,
  tone = "yellow",
  children,
  onClose,
}: ModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="modal-title"
        aria-modal="true"
        className={`modal-card modal-${tone}`}
        role="dialog"
      >
        <button
          aria-label="Tutup dialog"
          className="modal-close"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
        <span className="modal-emblem" aria-hidden="true">
          {tone === "red" ? "!" : tone === "green" ? "✓" : "✦"}
        </span>
        <h2 id="modal-title">{title}</h2>
        {description ? <p className="modal-description">{description}</p> : null}
        {children}
      </section>
    </div>
  );
}
