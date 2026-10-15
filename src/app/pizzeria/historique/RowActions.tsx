"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setOrderStatus } from "../actions";

/** Clôturer une ancienne commande restée ouverte (oubli de la marquer « récupérée »). */
export function RowActions({ id, number }: { id: string; number: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<"done" | "cancelled" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(status: "done" | "cancelled") {
    setError(null);
    start(async () => {
      const res = await setOrderStatus(id, status);
      setConfirm(null);
      if (!res.ok) setError(res.message);
      else router.refresh();
    });
  }

  if (confirm)
    return (
      <span className="hist-actions">
        <button type="button" className="hist-btn ok" disabled={pending} onClick={() => run(confirm)}>
          {confirm === "done" ? "Confirmer récupérée" : "Confirmer l'annulation"}
        </button>
        <button type="button" className="hist-btn" disabled={pending} onClick={() => setConfirm(null)}>
          Retour
        </button>
      </span>
    );

  return (
    <span className="hist-actions">
      <button
        type="button"
        className="hist-btn"
        aria-label={`Marquer la commande ${number} comme récupérée`}
        onClick={() => setConfirm("done")}
      >
        Récupérée
      </button>
      <button
        type="button"
        className="hist-btn"
        aria-label={`Annuler la commande ${number}`}
        onClick={() => setConfirm("cancelled")}
      >
        Non venue
      </button>
      {error && (
        <span className="hist-err" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
