import Link from "next/link";
import { Brand } from "./components/brand";

export default function Home() {
  return (
    <main className="splash-screen">
      <div className="splash-decoration splash-decoration-top" aria-hidden="true" />
      <div className="splash-decoration splash-decoration-bottom" aria-hidden="true" />
      <section className="splash-content">
        <Brand variant="splash" />
        <p className="splash-tagline">Fresh From Our Oven</p>
        <Link className="button button-dark splash-button" href="/pilih-peran">
          Mulai
          <span aria-hidden="true">→</span>
        </Link>
      </section>
      <span className="splash-caption">Toko Kue Amala</span>
    </main>
  );
}
