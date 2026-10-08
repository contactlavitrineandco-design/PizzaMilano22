import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaffRole } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Connexion · Pizza Milano", robots: { index: false } };

export default async function LoginPage() {
  const role = await getStaffRole();
  if (role) redirect("/pizzeria");

  // Session ouverte mais compte absent de la table staff
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main>
      <section className="hero slats">
        <div className="wrap">
          <div className="hero-card">
            <div className="eyebrow">Réservé au restaurant</div>
            <h1>Espace pizzeria</h1>
            <p>Connectez-vous avec le compte du restaurant pour recevoir et gérer les commandes sur la tablette.</p>
            <LoginForm denied={Boolean(user)} />
          </div>
        </div>
      </section>
    </main>
  );
}
