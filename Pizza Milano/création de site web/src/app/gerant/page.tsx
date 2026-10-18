import type { Metadata } from "next";
import { adminConfigured, codeState, isAdmin } from "@/lib/admin-session";
import { toProduct, toSettings, toSupplement } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { CodeLogin } from "./CodeLogin";
import { Gerant } from "./Gerant";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Espace gérant", robots: { index: false, follow: false } };

export default async function GerantPage() {
  if (!adminConfigured()) {
    return (
      <main className="wrap pro ger">
        <section className="ger-card ger-narrow">
          <h1 className="ger-title">Espace gérant</h1>
          <p>
            L&apos;espace gérant n&apos;est pas encore configuré sur ce serveur : il manque la variable{" "}
            <code>ADMIN_SESSION_SECRET</code> (32 caractères minimum) ou <code>SUPABASE_SERVICE_ROLE_KEY</code>. Voir le
            README.
          </p>
        </section>
      </main>
    );
  }

  if (!(await isAdmin())) return <CodeLogin />;

  const db = createAdminClient();
  const [products, supplements, settings, state] = await Promise.all([
    db.from("products").select("*").order("category").order("sort_order"),
    db.from("supplements").select("*").order("sort_order"),
    db.from("restaurant_settings").select("*").eq("id", 1).single(),
    codeState(),
  ]);
  if (products.error || supplements.error || settings.error) throw new Error("Lecture des données impossible");

  return (
    <Gerant
      products={(products.data ?? []).map(toProduct)}
      supplements={(supplements.data ?? []).map(toSupplement)}
      settings={toSettings(settings.data)}
      defaultCode={state?.is_default ?? false}
    />
  );
}
