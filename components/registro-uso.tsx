"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Registra a visita à tela. Não desenha nada.
 *
 * Roda depois da renderização e ignora falha de propósito: se a
 * telemetria cair, o cliente não pode nem perceber. Guarda a última
 * rota enviada para não duplicar quando o React re-renderiza.
 */
export function RegistroUso() {
  const pathname = usePathname();
  const ultima = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || ultima.current === pathname) return;
    ultima.current = pathname;

    fetch("/api/uso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rota: pathname }),
      keepalive: true,
    }).catch(() => {
      // Silêncio proposital.
    });
  }, [pathname]);

  return null;
}
