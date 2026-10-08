"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";

export interface LoginState {
  error: string | null;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Indiquez votre e-mail et votre mot de passe." };

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "E-mail ou mot de passe incorrect." };

  // Un compte Supabase connecté n'est pas forcément un restaurateur.
  const { data: role } = await supabase.rpc("current_staff_role");
  if (role !== "admin" && role !== "staff") {
    await supabase.auth.signOut();
    return { error: "Ce compte n'a pas accès à l'espace pizzeria." };
  }

  redirect("/pizzeria");
}

export async function logout() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/login");
}
