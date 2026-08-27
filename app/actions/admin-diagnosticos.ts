"use server";

// app/actions/admin-diagnosticos.ts
//
// Segue o mesmo padrão de app/actions/auth.ts (ex.: a função `sair`): Server Action
// que usa o client autenticado do usuário (respeitando RLS/RPC), nunca a service role key.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function atualizarStatusLeadDiagnostico(leadId: string, novoStatus: string) {
  const supabase = createClient();

  const { error } = await supabase.rpc("admin_atualizar_status_lead_diagnostico", {
    p_lead_id: leadId,
    p_status: novoStatus,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/diagnosticos");
}
