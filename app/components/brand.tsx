type BrandProps = {
  variant?: "default" | "splash";
};

export function Brand({ variant = "default" }: BrandProps) {
  return (
    <div className={`brand brand-${variant}`}>
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none">
          <path
            d="M10 27.5c0-7.7 6.3-14 14-14s14 6.3 14 14v8H10v-8Z"
            fill="currentColor"
          />
          <path
            d="M8 36h32M18 20.5c1.4-1.6 3.4-2.5 6-2.5s4.6.9 6 2.5M20 28h.1M28 28h.1"
            stroke="var(--background)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          />
          <path
            d="M24 7v2M14 11l1.5 1.5M34 11l-1.5 1.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2.5"
          />
        </svg>
      </span>
      <span className="brand-name">Amalakufood</span>
    </div>
  );
}
