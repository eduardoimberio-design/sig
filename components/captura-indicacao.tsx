"use client";

import { useEffect } from "react";

/**
 * Guarda o código do afiliado quando a pessoa chega por um link
 * como sig-fsi.com.br/?ref=AF-7K3M.
 *
 * Vale a PRIMEIRA indicação: se já existe um código guardado, não
 * sobrescreve. Sem essa regra, o último link clicado "roubaria" a
 * indicação de quem apresentou o SIG primeiro.
 *
 * Dura 60 dias — tempo razoável entre conhecer e decidir comprar.
 */
export function CapturaIndicacao() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (!ref) return;

      const codigo = ref.trim().toUpperCase();
      if (!/^[A-Z0-9-]{4,20}$/.test(codigo)) return;

      if (document.cookie.split("; ").some((c) => c.startsWith("sig_ref="))) {
        return;
      }

      const sessentaDias = 60 * 24 * 60 * 60;
      document.cookie = `sig_ref=${codigo}; max-age=${sessentaDias}; path=/; SameSite=Lax`;
    } catch {
      // Cookie bloqueado: o código ainda pode ser digitado no cadastro.
    }
  }, []);

  return null;
}
