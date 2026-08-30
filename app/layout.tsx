import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { Joao } from "@/components/joao";
import "./globals.css";

// Space Grotesk: grotesca com desenho levemente estranho nos
// terminais — lê como técnica dos anos 70/80 sem virar fantasia
// sci-fi (Orbitron e afins soam a fantasia).
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

// IBM Plex Mono carrega os dois registros de uma vez: a IBM é
// computação vintage, e a fonte segue sendo desenhada para dados.
// Aqui ela não é acessória — é a voz dominante da interface.
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "SIG — Sistema Inteligente de Gestão",
  description:
    "Hub de agentes de IA para gestão de pequenos negócios de food service.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // O João muda de tom conforme quem está do outro lado: visitante
  // recebe explicação do produto, cliente recebe orientação de uso.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="pt-BR"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body
        className="text-white font-sans antialiased"
        style={{
          backgroundColor: "#050B14",
          backgroundImage:
            "linear-gradient(rgba(5,11,20,0.72), rgba(5,11,20,0.85)), url('/images/diagnostico-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          backgroundRepeat: "no-repeat",
        }}
      >
        {children}
        <Joao logado={!!user} />
      </body>
    </html>
  );
}
