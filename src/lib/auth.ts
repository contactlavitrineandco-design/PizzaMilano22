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
