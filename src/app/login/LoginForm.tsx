"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initial: LoginState = { error: null };

export function LoginForm({ denied }: { denied: boolean }) {
  const [state, action, pending] = useActionState(login, initial);
  const error = state.error ?? (denied ? "Ce compte n'a pas accès à l'espace pizzeria." : null);
  return (
    <form action={action} className="cart-f" style={{ padding: 0, borderTop: 0 }}>
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="field">
        <label htmlFor="password">Mot de passe</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error && (
        <div className="err" role="alert">
          {error}
        </div>
      )}
      <button className="cta" type="submit" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
