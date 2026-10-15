import "server-only";
import { createSessionClient } from "@/lib/supabase/server";
import type { StaffRole } from "@/lib/types";

/** Renvoie le rôle du compte connecté s'il figure dans la table staff, sinon null. */
export async function getStaffRole(): Promise<StaffRole | null> {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.rpc("current_staff_role");
  if (error || (data !== "admin" && data !== "staff")) return null;
  return data;
}

export interface Access {
  role: StaffRole | null;
  /** Session validée avec le code à 6 chiffres (double authentification). */
  mfa: boolean;
  /** Un téléphone (application d'authentification) est déjà associé au compte. */
  hasFactor: boolean;
}

/**
 * Rôle + niveau d'authentification. Le niveau est lu dans le jeton de session,
 * dont la signature vient d'être vérifiée par getUser() (appel au serveur Auth).
 * La base de données refait de toute façon la même vérification (is_admin_mfa).
 */
export async function getAccess(): Promise<Access> {
  const role = await getStaffRole();
  if (!role) return { role: null, mfa: false, hasFactor: false };
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return { role, mfa: false, hasFactor: false };
  return { role, mfa: data.currentLevel === "aal2", hasFactor: data.nextLevel === "aal2" };
}
