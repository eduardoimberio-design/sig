"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

export function Campo({
  label,
  name,
  type = "text",
  required = true,
  placeholder,
  autoComplete,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="rotulo mb-2 block text-white/45">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        className="campo w-full px-4 py-2.5 placeholder-white/25"
      />
    </label>
  );
}

export function BotaoSubmit({ children }: { children?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rotulo w-full border border-cyan bg-cyan/10 px-6 py-3 text-cyan
                 transition-colors hover:bg-cyan hover:text-base-bg
                 disabled:opacity-40"
    >
      {pending ? "Processando" : children}
    </button>
  );
}

export function Alerta({
  tipo,
  children,
}: {
  tipo: "erro" | "sucesso";
  // Opcional porque as mensagens vêm de estado que pode estar
  // vazio — sem isso o build de produção rejeita cada uso.
  children?: React.ReactNode;
}) {
  const estilo =
    tipo === "erro"
      ? "border-negativo/50 bg-negativo/10 text-negativo"
      : "border-positivo/50 bg-positivo/10 text-positivo";

  const ref = useRef<HTMLParagraphElement>(null);

  // Formulários longos rolam para fora da vista: sem isso, a
  // mensagem aparece acima da área visível e parece que "nada
  // aconteceu" ao enviar.
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [children]);

  return (
    <p
      ref={ref}
      className={`border-l-4 border px-4 py-3 text-sm leading-relaxed ${estilo}`}
      role="alert"
      aria-live="assertive"
    >
      {children}
    </p>
  );
}

/** Painel com bisel chanfrado — o elemento-assinatura da interface. */
export function Painel({
  children,
  className = "",
  destaque = false,
}: {
  children: React.ReactNode;
  className?: string;
  destaque?: boolean;
}) {
  return (
    <div className={`painel ${destaque ? "painel-destaque" : ""} ${className}`}>
      {children}
    </div>
  );
}
