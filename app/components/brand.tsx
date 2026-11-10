type BrandProps = {
  variant?: "default" | "splash";
};

export function Brand({ variant = "default" }: BrandProps) {
  return (
    <div className={`brand brand-${variant}`}>
      <span className="brand-mark">
        <img src="/logo-amala.png" alt="Logo Amalakufood" />
      </span>
      <span className="brand-name">Amalakufood</span>
    </div>
  );
}
