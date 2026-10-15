"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";

interface Props {
  mfa: boolean;
  hasFactor: boolean;
  next: string | null;
}

type Enrollment = { factorId: string; qr: string; secret: string };

const CODE_RE = /^\d{6}$/;

/**
 * Double authentification (TOTP) : un code à 6 chiffres, renouvelé toutes les
 * 30 secondes, affiché par une application du téléphone (Google Authenticator,
 * Microsoft Authenticator, l'app Mots de passe de l'iPhone…). Tout passe par
 * Supabase Auth ; aucun secret n'est stocké par le site.
 */
export function MfaPanel({ mfa, hasFactor, next }: Props) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [pending, start] = useTransition();

  function client() {
    const supabase = createBrowserSupabase();
    if (!supabase) throw new Error("Configuration Supabase manquante.");
    return supabase;
  }

  function done() {
    setCode("");
    if (next) router.replace(next);
    router.refresh();
  }

  function beginEnroll() {
    setError(null);
    start(async () => {
      try {
        const supabase = client();
        // Une inscription abandonnée laisse un facteur non vérifié : on le retire d'abord.
        const { data: list } = await supabase.auth.mfa.listFactors();
        for (const f of list?.all ?? []) {
          if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
        const { data, error: e } = await supabase.auth.mfa.enroll({ factorType: "totp", issuer: "Pizza Milano" });
        if (e || !data) throw e ?? new Error();
        setEnrollment({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
      } catch {
        setError("Impossible de démarrer l'activation. Réessayez dans un instant.");
      }
    });
  }

  function verify(factorId?: string) {
    setError(null);
    if (!CODE_RE.test(code)) {
      setError("Le code fait 6 chiffres.");
      return;
    }
    start(async () => {
      const supabase = client();
      let id = factorId;
      if (!id) {
        const { data } = await supabase.auth.mfa.listFactors();
        id = data?.totp[0]?.id;
      }
      if (!id) {
        setError("Aucun téléphone n'est associé à ce compte.");
        return;
      }
      const { error: e } = await supabase.auth.mfa.challengeAndVerify({ factorId: id, code });
      if (e) {
        setCode("");
        setError("Code incorrect ou expiré. Saisissez le code affiché en ce moment dans l'application.");
        return;
      }
      setEnrollment(null);
      done();
    });
  }

  function remove() {
    setError(null);
    start(async () => {
      const supabase = client();
      const { data } = await supabase.auth.mfa.listFactors();
      for (const f of data?.all ?? []) {
        const { error: e } = await supabase.auth.mfa.unenroll({ factorId: f.id });
        if (e) {
          setError("Suppression impossible. Reconnectez-vous puis réessayez.");
          return;
        }
      }
      setConfirmRemove(false);
      // Le jeton de session doit être renouvelé pour revenir au niveau « mot de passe seul ».
      await supabase.auth.refreshSession();
      router.refresh();
    });
  }

  const codeField = (onSubmit: () => void, label: string) => (
    <form
      className="mfa-code"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label>
        {label}
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="123456"
          autoFocus
          required
        />
      </label>
      <button type="submit" className="add" disabled={pending || code.length !== 6}>
        Valider
      </button>
    </form>
  );

  return (
    <section className="hist-card mfa-card" aria-live="polite">
      {mfa ? (
        <>
          <h2>Double authentification active</h2>
          <p>
            Cette session est validée par mot de passe et code à 6 chiffres. L&apos;historique des commandes et les
            exports sont accessibles.
          </p>
          {next && (
            <button type="button" className="add" onClick={() => router.replace(next)}>
              Ouvrir l&apos;historique
            </button>
          )}
          <details className="hist-details">
            <summary>Changer de téléphone</summary>
            <p className="hist-note">
              Retirez le téléphone actuel, puis activez à nouveau la double authentification avec le nouveau.
            </p>
            {confirmRemove ? (
              <div className="adm-actions">
                <button type="button" className="adm-danger" disabled={pending} onClick={remove}>
                  Confirmer le retrait
                </button>
                <button type="button" className="ghost" onClick={() => setConfirmRemove(false)}>
                  Annuler
                </button>
              </div>
            ) : (
              <button type="button" className="ghost" onClick={() => setConfirmRemove(true)}>
                Retirer ce téléphone
              </button>
            )}
          </details>
        </>
      ) : hasFactor ? (
        <>
          <h2>Code de vérification</h2>
          <p>
            Ouvrez l&apos;application d&apos;authentification de votre téléphone et saisissez le code « Pizza Milano ».
          </p>
          {codeField(() => verify(), "Code à 6 chiffres")}
        </>
      ) : enrollment ? (
        <>
          <h2>Associer votre téléphone</h2>
          <ol className="mfa-steps">
            <li>
              Installez une application d&apos;authentification (Google Authenticator, Microsoft Authenticator ; sur
              iPhone, l&apos;app Mots de passe convient aussi).
            </li>
            <li>Dans l&apos;application, ajoutez un compte et scannez ce QR code.</li>
          </ol>
          {/* eslint-disable-next-line @next/next/no-img-element -- QR code SVG en data URI, généré par Supabase */}
          <img className="mfa-qr" src={enrollment.qr} alt="QR code à scanner avec l'application d'authentification" width={200} height={200} />
          <p className="hist-note">
            Impossible de scanner ? Saisissez cette clé à la main : <code className="mfa-secret">{enrollment.secret}</code>
          </p>
          {codeField(() => verify(enrollment.factorId), "3. Saisissez le code affiché")}
        </>
      ) : (
        <>
          <h2>Activez la double authentification</h2>
          <p>
            L&apos;historique contient toutes les commandes et le chiffre d&apos;affaires. Pour l&apos;ouvrir, il faut en
            plus du mot de passe un code à 6 chiffres affiché par votre téléphone. Ainsi, un mot de passe volé ne suffit
            pas.
          </p>
          <button type="button" className="add" disabled={pending} onClick={beginEnroll}>
            Activer avec mon téléphone
          </button>
        </>
      )}
      {error && (
        <p className="hist-err" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
