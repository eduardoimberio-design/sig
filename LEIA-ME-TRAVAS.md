# Módulo 2: trava de 2 acessos (diagnóstico e degustação)

TEM MIGRATION. Rodar a 0030 no SQL Editor do Supabase ANTES de aplicar os arquivos.

## Como funciona
- Cada pessoa é contada por DUAS chaves: o aparelho (hash do IP) e o WhatsApp,
  assim que ela informa na conversa. Qualquer uma no limite já bloqueia.
- Um "acesso" é uma SESSÃO, não uma mensagem. O navegador guarda um id; atualizar a
  página ou continuar a conversa mantém o mesmo id e não consome outro acesso.
- Diagnóstico e degustação contam separado: 2 de cada.
- No limite, a conversa não abre e a pessoa recebe um botão "Falar no WhatsApp".
  A verificação acontece ANTES da chamada à Anthropic, então não gera custo.
- Se o banco falhar, LIBERA. Barrar um lead legítimo por instabilidade é pior do
  que perder a contagem de um acesso. A falha é registrada no Sentinela.

## Arquivos
supabase/migrations/0030_travas_funil.sql (novo) · lib/acessos.ts (novo)
lib/eventos.ts (nova origem "funil") · app/api/joao/route.ts · components/joao.tsx

## Ainda não ligado
A parte da degustação (recurso 'degustacao') está pronta em lib/acessos.ts, mas só
passa a ser usada no módulo 3, quando a tela existir.

## Para zerar a trava em testes
delete from acessos_funil;
