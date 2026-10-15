import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccess } from "@/lib/auth";
import { MfaPanel } from "./MfaPanel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sécurité · Pizza Milano", robots: { index: false, follow: false } };

export default async function SecuritePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await getAccess();
  if (!access.role) redirect("/login");
  if (access.role !== "admin") redirect("/pizzeria");
  const sp = await searchParams;
  // Seule destination autorisée après validation : l'historique (pas de redirection ouverte).
  const next = sp.suite === "historique" ? "/pizzeria/historique" : null;

  return (
    <main>
      <div className="wrap pro mfa">
        <div className="pro-head">
          <h1>Sécurité du compte</h1>
          <Link href="/pizzeria" className="ghost adm-link">
            Commandes du jour
          </Link>
        </div>
        <MfaPanel mfa={access.mfa} hasFactor={access.hasFactor} next={next} />
      </div>
    </main>
  );
}
