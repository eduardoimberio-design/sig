"use server";

// app/actions/admin-vouchers.ts
//
// Arquivo separado de app/actions/admin.ts de propósito — não tenho o conteúdo
// desse arquivo, então evito sobrescrevê-lo e arriscar apagar alguma outra action
// que já exista lá. Se quiser, depois dá pra mover essas duas funções pra lá.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function ocultarVoucher(voucherId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("admin_cancelar_voucher", {
    p_voucher_id: voucherId,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function excluirVoucher(voucherId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("admin_excluir_voucher", {
    p_voucher_id: voucherId,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
