# Minha Rotina

Um espaço pessoal e simples para organizar a rotina:

- **Listas de tarefas** com quadro de status (colunas renomeáveis), tabela e calendário.
- **Áreas** (Pessoal, Profissional, Estudos…) com um seletor no topo que filtra tudo; crie novas pelo botão ＋.
- **Calendário** com eventos (inclusive repetidos) e **alertas por e-mail** no horário que você escolher. Tarefas com data também aparecem lá e podem ter alertas.
- **Início** só para consulta: as tarefas com prazo para hoje; clicar numa leva ao quadro dela.
- **Listas de tarefas em pastas** (e pastas dentro de pastas) na barra lateral.
- **Anotações** em Markdown, com barra de formatação, fórmulas LaTeX ($…$ e $$…$$, como no Obsidian), imagens e PDF anexados, pastas, tags e modo foco.
- **Instalável como app** (PWA) no celular e no computador.
- **Hábitos**: marque o de hoje e acompanhe a sequência de dias seguidos; o histórico fica recolhido para consulta.

## Como rodar

Precisa do [Node.js](https://nodejs.org) 18 ou mais novo.

```bash
npm install      # só na primeira vez
npm run dev      # abre em http://localhost:5173
```

Outros comandos:

| Comando             | O que faz                                         |
| ------------------- | ------------------------------------------------- |
| `npm run build`     | Confere os tipos e gera a versão final em `dist/` |
| `npm run preview`   | Serve a versão de `dist/` para testar             |
| `npm run typecheck` | Só confere os tipos do TypeScript                 |
| `npm test`          | Roda os testes automáticos (Vitest)               |
| `npm run lint`      | Procura problemas no código (ESLint)              |

## Atalhos

| Atalho                           | O que faz                                                   |
| -------------------------------- | ----------------------------------------------------------- |
| `Ctrl/⌘ + K`                     | Buscar                                                      |
| `Ctrl + Delete` (`⌘ + ⌫` no Mac) | Apagar o item selecionado ou sob o mouse (dá para desfazer) |
| `Ctrl/⌘ + B` / `I`               | Negrito / itálico nas anotações                             |
| `Esc`                            | Fechar painel ou janela                                     |

## Instalar como app

Com o site publicado (HTTPS), abra no navegador e use **Instalar app** (Chrome/Edge,
ícone na barra de endereço) ou **Compartilhar → Adicionar à Tela de Início** (iPhone).

## Estrutura

Interface feita com [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS v4.

```
src/
  main.tsx, App.tsx     entrada, login, layout geral e rotas (#/id-da-pagina)
  store.ts              estado global (Zustand) e todas as ações
  index.css             tema: cores, cores das áreas, claro/escuro
  styles.css            só o editor de notas e o Markdown renderizado
  lib/
    types.ts            formatos dos dados (Tarefa, Evento, Tarefa do dia, Nota…)
    model.ts            regras: filtros, áreas, revisão espaçada
    events.ts           calendário e cálculo dos alertas
    migrate.ts          atualiza dados salvos por versões antigas
    template.ts         espaço inicial com exemplos
    sync.ts / records.ts   sincronização com a nuvem, lixeira e lembretes
    notes.ts / notesIO.ts  tags, pastas, exportar .md
    attachments.ts      imagens e PDF das anotações (Supabase Storage ou o navegador)
    backup.ts, supabase.ts, storage.ts, util.ts
  components/
    ui/                 componentes do shadcn (gerados pela CLI)
    app/                barra lateral, topo com seletor de área, nova lista
    tasks/              página da lista, quadro, tabela, calendário, painel da tarefa, status
    calendar/           Calendário (mês/semana) e diálogo de evento
    notes/              Anotações: NotesView, NoteEditor (CodeMirror), NoteReader
    Home.tsx, Habits.tsx, Search.tsx, Settings.tsx, Trash.tsx, Auth.tsx
supabase/
  migrations/           SQL do banco (rode na ordem: 001 a 007, ou tudo de uma vez com setup.sql)
  functions/            send-reminders: envia os alertas por e-mail
  cron.sql              agenda a função para rodar a cada minuto
```

## Dados e contas

O app funciona de dois jeitos:

- **Sem configurar nada:** tudo fica salvo no navegador (sem login). Bom para testar.
- **Com o Supabase configurado:** cada pessoa cria uma conta e os dados ficam
  salvos na nuvem, sincronizados entre aparelhos, com Lixeira de 30 dias.

### Configurar o Supabase (uma vez)

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e um projeto novo.
2. No projeto, abra **SQL Editor → New query**, cole o conteúdo de
   `supabase/migrations/001_init.sql` e clique em **Run**. Depois faça o mesmo com
   `002_events_reminders.sql` e `003_grants.sql`. Isso cria as tabelas `records` e `reminders` com as
   regras de acesso (cada usuário só vê os próprios dados).
3. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**.
4. Copie `.env.example` para `.env.local` e preencha as duas variáveis.
5. Em **Authentication → URL Configuration**, coloque em **Site URL** o endereço
   do site (`http://localhost:5173` enquanto testa; depois, o da Vercel) e adicione
   o mesmo endereço em **Redirect URLs**.
6. Rode `npm run dev` de novo. Agora o site pede login.

> O envio de e-mails do Supabase gratuito tem limite baixo (poucos por hora).
> Para abrir o site para muita gente, configure um SMTP próprio em
> **Authentication → Emails → SMTP Settings**.

### Alertas por e-mail (opcional, depois do passo anterior)

Os alertas são enviados por uma função do Supabase usando o [Resend](https://resend.com).

1. Crie uma conta gratuita no Resend e gere uma **API key**. Para mandar e-mails
   para outras pessoas, verifique um domínio seu no Resend; para testar, dá para
   enviar só para o e-mail da própria conta do Resend.
2. Publique a função (o token sai de supabase.com → Account → Access Tokens):
   ```bash
   npx supabase login
   npx supabase link --project-ref <PROJECT_REF>
   npx supabase secrets set RESEND_API_KEY=re_xxx CRON_SECRET=<uma-senha-longa> \
     REMINDER_FROM="Minha Rotina <alertas@seudominio.com>" APP_URL=https://seu-site.vercel.app
   npx supabase functions deploy send-reminders --no-verify-jwt
   ```
3. No **SQL Editor**, rode `supabase/cron.sql` trocando `<PROJECT_REF>` e
   `<CRON_SECRET>`. A função passa a rodar a cada minuto.

Quando alguém salva um evento com alertas, o app grava os lembretes na tabela
`reminders`; a função envia os que venceram e marca como enviados.

### Avisos no WhatsApp (opcional)

Em cada evento ou tarefa, o **Alarme** deixa escolher e-mail ou WhatsApp. O número
fica em Configurações → Alertas. Enquanto o WhatsApp não estiver ligado no servidor,
os avisos marcados como WhatsApp chegam por e-mail. Para ligar, rode a migração
`006_whatsapp.sql` e configure um dos dois serviços:

- **Twilio:** `npx supabase secrets set WHATSAPP_PROVIDER=twilio TWILIO_ACCOUNT_SID=AC... TWILIO_AUTH_TOKEN=... TWILIO_WHATSAPP_FROM=+14155238886`
  (no sandbox, quem recebe manda antes a mensagem de ativação para o número do Twilio;
  em produção, use um modelo aprovado com `TWILIO_CONTENT_SID`, variáveis {{1}} título e {{2}} quando).
- **WhatsApp Cloud API (Meta):** `npx supabase secrets set WHATSAPP_PROVIDER=meta WHATSAPP_TOKEN=... WHATSAPP_PHONE_ID=... WHATSAPP_TEMPLATE=lembrete`
  (modelo aprovado com duas variáveis no corpo: título e quando).

Depois, publique a função de novo: `npx supabase functions deploy send-reminders --no-verify-jwt`.

### Como os dados são guardados

Uma tabela, `records`, com uma linha por entidade (lista, tarefa, evento,
tarefa do dia, anotação, hábito…), em JSON. A sincronização fica em `src/lib/sync.ts`:
as mudanças são enviadas em lotes e as de outros aparelhos são buscadas ao
voltar para a aba e a cada minuto. Sem internet, as mudanças ficam numa fila e
são enviadas quando a conexão volta.

## Publicar (deploy na Vercel)

1. Envie o código para o GitHub (`git push`).
2. Em [vercel.com](https://vercel.com), **Add New → Project**, importe o repositório.
   O preset **Vite** é detectado sozinho.
3. Em **Environment Variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Publique. Depois, coloque o endereço da Vercel no Supabase (passo 5 acima).
5. Antes de abrir para outras pessoas, preencha o contato em `public/privacidade.html`.
