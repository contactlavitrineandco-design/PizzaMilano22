"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelMyOrder, type CancelState } from "./actions";

export function CancelButton({ token }: { token: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<CancelState>(null);
  const [pending, startTransition] = useTransition();

  if (state?.ok) return <p className="track-msg ok">{state.message}</p>;

  return (
    <div className="track-cancel">
      {!confirming ? (
        <button type="button" className="ghost" onClick={() => setConfirming(true)}>
          Annuler ma commande
        </button>
      ) : (
        <>
          <p>Annuler la commande ? La pizzeria sera prévenue tout de suite.</p>
          <div className="track-actions">
            <button
              type="button"
              className="cta danger"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await cancelMyOrder(token);
                  setState(res);
                  router.refresh();
                })
              }
            >
              {pending ? "Annulation…" : "Oui, annuler"}
            </button>
            <button type="button" className="ghost" disabled={pending} onClick={() => setConfirming(false)}>
              Garder ma commande
            </button>
          </div>
        </>
      )}
      {state && !state.ok && (
        <p className="err" role="alert">
          {state.message}
        </p>
      )}
    </div>
  );
}
