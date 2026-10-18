import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <section className="hero slats">
        <div className="wrap">
          <div className="hero-card">
            <div className="eyebrow">Pizza Milano</div>
            <h1>Cette page n&apos;existe pas.</h1>
            <p>La carte et la commande en ligne sont par ici.</p>
            <Link className="cta" href="/commander">
              Voir la carte
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
