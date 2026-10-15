"use client";

import { useState, useTransition } from "react";
import { setVatRates } from "./actions";

const RATES = ["", "0", "2.1", "5.5", "10", "20"];
const label = (r: string) => (r === "" ? "Non renseigné" : `${r.replace(".", ",")} %`);

export function VatForm({ food, drinks }: { food: number | null; drinks: number | null }) {
  const [f, setF] = useState(food === null ? "" : String(food));
  const [d, setD] = useState(drinks === null ? "" : String(drinks));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="hist-vat"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const res = await setVatRates(f, d);
          setMsg(res.ok ? "Taux enregistrés." : res.message);
        });
      }}
    >
      <label>
        Plats (pizzas, soufflés)
        <select value={f} onChange={(e) => setF(e.target.value)}>
          {RATES.map((r) => (
            <option key={r} value={r}>
              {label(r)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Boissons
        <select value={d} onChange={(e) => setD(e.target.value)}>
          {RATES.map((r) => (
            <option key={r} value={r}>
              {label(r)}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="ghost" disabled={pending}>
        Enregistrer
      </button>
      {msg && (
        <p className="hist-note" role="status">
          {msg}
        </p>
      )}
    </form>
  );
}
