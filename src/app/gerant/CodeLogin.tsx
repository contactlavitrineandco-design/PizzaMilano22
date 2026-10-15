"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { login } from "./actions";

export function CodeLogin() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <main className="wrap pro ger">
      <section className="ger-card ger-narrow" aria-labelledby="gerLogin">
        <h1 className="ger-title" id="gerLogin">
          Espace gérant
        </h1>
        <p>Saisissez votre code d&apos;accès pour modifier le site : carte, prix, photos, horaires, commandes en ligne.</p>
        <form
          className="ger-code"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            start(async () => {
              const res = await login(code);
              setCode("");
              if (!res.ok) setError(res.message);
              else router.refresh();
            });
          }}
        >
          <label>
            Code d&apos;accès
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={12}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 12))}
              placeholder="••••••"
              autoFocus
              required
            />
          </label>
          <button type="submit" className="cta" disabled={pending || code.length < 6}>
            {pending ? "Vérification…" : "Entrer"}
          </button>
        </form>
        {error && (
          <p className="ger-err" role="alert">
            {error}
          </p>
        )}
        <p className="ger-hint">5 essais, puis blocage de 15 minutes. La session dure 12 heures.</p>
      </section>
    </main>
  );
}
