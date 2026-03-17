"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * Normalise un numéro français saisi librement vers le format E.164.
 * Accepte : "0612345678", "06 12 34 56 78", "+33612345678", "+33 6 12 34 56 78"
 */
function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\.\(\)]/g, "");
  if (/^0[1-9]\d{8}$/.test(cleaned)) return "+33" + cleaned.slice(1);
  return cleaned; // déjà E.164 ou format inconnu — on laisse passer
}

// Étape 1 — Profil (obligatoire)
export async function saveProfilStep(data: {
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
}): Promise<{ error?: string } | { success: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const supabaseAdmin = getAdminClient();
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone ? normalizePhone(data.phone) : null,
      avatar_url: data.avatar_url ?? null,
      current_onboarding_step: 2,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/onboarding");
  return { success: true };
}

// Étape 2 — Cabinet (obligatoire) : crée l'organisation + met à jour JWT claims
export async function saveCabinetStep(
  orgName: string,
): Promise<{ error?: string } | { success: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const supabaseAdmin = getAdminClient();

  const { data: org, error: orgError } = await supabaseAdmin
    .from("organizations")
    .insert({ name: orgName })
    .select()
    .single();

  if (orgError || !org)
    return { error: orgError?.message ?? "Erreur création cabinet" };

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      organization_id: org.id,
      role: "expert-comptable",
      current_onboarding_step: 3,
    })
    .eq("id", user.id);

  if (profileError) return { error: profileError.message };

  const { error: claimsError } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    { app_metadata: { org_id: org.id, role: "expert-comptable" } },
  );

  if (claimsError) return { error: claimsError.message };

  revalidatePath("/onboarding");
  return { success: true };
}

// Étape 3 — Pennylane (passable)
export async function savePennylaneStep(): Promise<
  { error?: string } | { success: true }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const supabaseAdmin = getAdminClient();
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ current_onboarding_step: 4 })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

// Complétion : is_complete = true
export async function completeOnboarding(): Promise<
  { error?: string } | { success: true }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const supabaseAdmin = getAdminClient();
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ is_complete: true, current_onboarding_step: 4 })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}
