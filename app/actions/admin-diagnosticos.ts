"use server";

// app/actions/admin-diagnosticos.ts

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

export async function excluirLeadDiagnostico(leadId: string) {
  const supabase = createClient();

  const { error } = await supabase.rpc("admin_excluir_lead_diagnostico", {
    p_lead_id: leadId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/diagnosticos");
}
