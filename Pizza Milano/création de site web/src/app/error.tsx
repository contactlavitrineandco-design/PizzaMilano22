"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main>
      <section className="hero slats">
        <div className="wrap">
          <div className="hero-card">
            <div className="eyebrow">Pizza Milano</div>
            <h1>Oups, la page n&apos;a pas pu se charger.</h1>
            <p>Réessayez dans un instant. Si le problème continue, appelez directement le restaurant.</p>
            <button type="button" className="cta" onClick={reset}>
              Réessayer
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
