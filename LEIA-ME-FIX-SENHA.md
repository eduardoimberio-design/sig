# Correção definitiva — link de redefinir senha inválido

## O que causa o problema (recapitulando)

O link padrão do Supabase (`{{ .ConfirmationURL }}`) consome o token assim que é
**aberto** — o Gmail abre ele sozinho pra escanear segurança, e o link já morre antes
da pessoa clicar de verdade.

## A correção

1. Uma página nova (`/confirmar`) que só troca o token por uma sessão de verdade
   quando a pessoa clica no botão "Confirmar" — nunca automaticamente ao abrir.
2. Trocar o link usado nos e-mails do Supabase pra apontar pra essa página nova, em vez
   do link padrão do Supabase.

## Passo a passo

### 1. Copie o arquivo novo

```
xcopy sig-fix-reset-senha\ C:\Users\User\Documents\sig-app\ /E /H /Y
```

Isso cria `app/(auth)/confirmar/page.tsx` — não mexe em mais nada do seu código.

### 2. Teste local

```
npm run dev
```

(não precisa testar o link ainda, só confirmar que o projeto builda sem erro)

### 3. Troque o template de "Reset Password" no Supabase

Vá em **Authentication → Email Templates → Reset Password** e troque o conteúdo por:

```html
<h2>Redefinição de senha</h2>
<p>Recebemos uma solicitação para redefinir a senha da sua conta no SIG.</p>
<p><a href="{{ .SiteURL }}/confirmar?token_hash={{ .TokenHash }}&type=recovery">Criar nova senha</a></p>
<p>Se você não solicitou isso, pode ignorar este e-mail com segurança.</p>
```

Subject: `Redefinir sua senha — SIG`

### 4. (Recomendado) Troque os outros templates do mesmo jeito

Mesma lógica, só troca o `type` no final do link:

**Confirm signup:**
```html
<h2>Confirme seu cadastro no SIG</h2>
<p>Clique no link abaixo para confirmar seu e-mail e ativar sua conta:</p>
<p><a href="{{ .SiteURL }}/confirmar?token_hash={{ .TokenHash }}&type=signup">Confirmar meu e-mail</a></p>
<p>Se você não criou uma conta no SIG, pode ignorar este e-mail.</p>
```
Subject: `Confirme seu e-mail — SIG`

**Invite user:**
```html
<h2>Você foi convidado</h2>
<p>Clique no link abaixo para aceitar o convite e criar sua conta:</p>
<p><a href="{{ .SiteURL }}/confirmar?token_hash={{ .TokenHash }}&type=invite">Aceitar convite</a></p>
```
Subject: `Você foi convidado para o SIG`

**Magic Link (se usarem):**
```html
<h2>Acesse sua conta</h2>
<p>Clique no link abaixo para entrar no SIG:</p>
<p><a href="{{ .SiteURL }}/confirmar?token_hash={{ .TokenHash }}&type=magiclink">Entrar no SIG</a></p>
```
Subject: `Seu link de acesso — SIG`

**Change Email Address (se usarem):**
```html
<h2>Confirmação de novo e-mail</h2>
<p>Clique no link abaixo para confirmar seu novo endereço de e-mail:</p>
<p><a href="{{ .SiteURL }}/confirmar?token_hash={{ .TokenHash }}&type=email_change">Confirmar novo e-mail</a></p>
```
Subject: `Confirme seu novo e-mail — SIG`

### 5. Teste de verdade

1. Peça a redefinição de senha normalmente (`/recuperar-senha`)
2. Abra o e-mail no Gmail — dessa vez, mesmo que o Gmail "abra" o link sozinho, nada é
   consumido, porque a página só age quando você clica no botão
3. Clique no link do e-mail
4. Deve aparecer a tela "Confirmar redefinição de senha" com um botão — clique nele
5. Deve te levar pra tela de "Defina sua senha" funcionando normalmente

### 6. Suba pro ar

```
git add .
git commit -m "fix: pagina de confirmacao com clique explicito, evita consumo do link por scanners de email"
git push
```

## Um detalhe importante

Como o link agora usa `{{ .SiteURL }}` (que é `https://www.sig-fsi.com.br`, configurado
no Supabase), o link do e-mail sempre vai apontar pra produção, mesmo que você tenha
gerado o pedido de redefinição rodando localmente. Isso é esperado — já que esse é o seu
projeto Supabase de produção. Pra testar o fluxo completo localmente, teste direto em
`https://www.sig-fsi.com.br/recuperar-senha` (ou implante essa correção antes de testar).
