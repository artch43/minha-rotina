# Minha Rotina

Um lugar só para o seu dia: **tarefas, calendário, hábitos e anotações**, com avisos por
e-mail ou WhatsApp. Simples de usar no computador, no tablet e no celular.

**Site:** https://minha-rotina-zeta.vercel.app

---

## Sumário

- [Funcionalidades](#funcionalidades)
  - [Início](#início)
  - [Listas de tarefas](#listas-de-tarefas)
  - [Tarefas](#tarefas)
  - [Calendário](#calendário)
  - [Alarmes por e-mail e WhatsApp](#alarmes-por-e-mail-e-whatsapp)
  - [Anotações](#anotações)
  - [Hábitos](#hábitos)
  - [Áreas](#áreas)
  - [Busca](#busca)
  - [Aparência](#aparência)
  - [Conta, nuvem e segurança](#conta-nuvem-e-segurança)
  - [Celular e tablet](#celular-e-tablet)
  - [Atalhos de teclado](#atalhos-de-teclado)
  - [Acessibilidade](#acessibilidade)
- [Tecnologias](#tecnologias)
- [Como rodar no seu computador](#como-rodar-no-seu-computador)
- [Configurar a nuvem (Supabase)](#configurar-a-nuvem-supabase)
- [Configurar os alarmes](#configurar-os-alarmes)
- [Publicar na Vercel](#publicar-na-vercel)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Como os dados são guardados](#como-os-dados-são-guardados)

---

## Funcionalidades

### Início

A tela do dia, organizada por importância:

- **Atrasadas** primeiro, depois **Hoje**; as **concluídas** ficam recolhidas.
- Cada tarefa tem **○ concluir** e **Remarcar** (hoje, amanhã, daqui a uma semana ou tirar a data), sempre com **Desfazer**.
- Clicar no nome da tarefa leva à lista dela.
- Barra de progresso do dia (“2/5”, “Tudo feito!”).
- No computador, um painel ao lado com **Próximos compromissos** (3 dias) e **Hábitos de hoje**.
- A data e a saudação mudam sozinhas quando vira o dia.

### Listas de tarefas

- Cada lista tem três visões: **Quadro** (colunas de status), **Tabela** e **Calendário**.
- Colunas de status renomeáveis, com cor e tipo (a fazer, em andamento, concluído, revisar); dá para criar, mover e excluir colunas.
- **Ordem automática** das tarefas: o prazo mais próximo vem primeiro e, no mesmo dia, a prioridade mais alta; tarefas sem prazo ficam no fim. O botão **Ordenar** troca para só prazo, só prioridade, nome ou **manual** (arrastar um cartão dentro da coluna também passa para a manual).
- **Filtros** por status, prioridade, etiqueta e data (hoje, próximos 7 dias, atrasadas…). Filtros do mesmo campo se somam; um filtro de data por vez; nada se repete.
- Busca dentro da lista.
- **Pastas** na barra lateral, inclusive pastas dentro de pastas: arraste listas e pastas para organizar, renomeie com clique duplo e troque o ícone com um clique.
- **Arquivar** listas (saem da barra lateral sem perder nada) e trazê-las de volta.
- A barra lateral mostra quantas tarefas abertas cada lista tem; listas vazias ficam mais discretas.
- Excluir uma lista exclui as tarefas dela; excluir uma pasta pode manter as listas ou levar tudo junto (com confirmação e **Desfazer**).
- **Revisão espaçada** na lista de Estudos: ao concluir, o conteúdo volta para “Revisar” em 1, 7 e 30 dias.

### Tarefas

- **Nova tarefa** abre um formulário curto: nome e prazo (opcional). “Mais detalhes…” abre o painel completo. Cancelar não deixa tarefa vazia para trás.
- No painel: status, área, data e hora, prioridade, etiquetas, anotações e **alarme**.
- Arraste cartões entre colunas, e até para outra lista na barra lateral (a tarefa muda de lista, com Desfazer).
- Apague com `Ctrl/⌘ + ⌫` (dá para desfazer).

### Calendário

- Visões de **mês** e **semana**; a semana no celular abre já no dia de hoje.
- **Eventos** com horário, local, área e **repetição** (todo dia, dias úteis, toda semana, todo mês, com data final).
- Tarefas com data aparecem junto: eventos com barra colorida e horário, tarefas com uma caixinha de marcar.
- Arraste para remarcar; na semana, solte num horário para mudar a hora; clique duas vezes num horário para criar um evento.
- “**+N mais**” abre a lista completa do dia, com a opção de adicionar.
- No celular, o mês mostra pontinhos coloridos e, ao tocar num dia, a agenda dele aparece embaixo.

### Alarmes por e-mail e WhatsApp

- Em cada evento ou tarefa com data: escolha **E-mail** ou **WhatsApp** e quando avisar (na hora, 10 min, 30 min, 1 hora, 1 dia ou 1 semana antes).
- O número do WhatsApp fica em Configurações → Alertas.
- Limites diários por pessoa, para evitar abusos e custos (veja [Configurar os alarmes](#configurar-os-alarmes)).

### Anotações

- Editor em **Markdown com pré-visualização ao vivo** (os símbolos somem fora da linha em edição), modo **Ler** e **Modo foco**.
- Barra de formatação: negrito, itálico, riscado, código, títulos, listas, checklist, citação e link.
- **Fórmulas LaTeX** como no Obsidian: `$x^2$` no meio do texto e `$$ … $$` em bloco (desenhadas com KaTeX). O código da fórmula fica colorido enquanto você escreve.
- **Imagens e PDF** anexados: pelo botão, colando ou arrastando para o texto (até 10 MB).
- **Pastas**, **#tags**, notas fixadas, **nota do dia** e sumário.
- A nota aberta fica destacada; notas sem título aparecem em itálico; notas com o mesmo nome mostram a pasta.
- Exportar tudo em `.zip` e importar arquivos `.md`.
- Um **Guia rápido** com o passo a passo de todas as funções.

### Hábitos

- Botão **Marcar hoje** e a sequência de dias seguidos (🔥).
- Últimos 7 dias com o dia da semana; toque num dia para marcar ou desmarcar.
- Estados com forma própria, não só cor: **✓ feito**, **contorno tracejado = não feito** (depois que você começou) e **cinza = sem registro**. Há uma legenda.
- Histórico das últimas semanas, recolhido para consulta.
- Criar um hábito pede o nome (dá para cancelar); ícone, nome e exclusão ficam na própria linha.

### Áreas

- Pessoal, Profissional, Estudos… e quantas você criar, cada uma com sua cor.
- O seletor no topo filtra tarefas e eventos do site inteiro.

### Busca

- `Ctrl/⌘ + K` busca páginas, tarefas, tarefas do dia, eventos e anotações, agrupados por tipo.
- Cada resultado mostra contexto (lista, status, data, pasta, quando foi editada) e abre com o teclado.

### Aparência

Em **Configurações → Aparência**:

- **Tema** claro, escuro ou automático.
- **Cor de destaque**: 9 cores prontas ou qualquer cor. Os tons de botões, links e foco são ajustados para manter o contraste mínimo (WCAG AA) no claro e no escuro.
- **Papel de parede**: fundos prontos (Aurora, Pôr do sol, Oceano, Floresta, Lavanda, Noite, Pontilhado) ou **uma imagem sua**, com controle de intensidade. A imagem fica guardada no aparelho.
- **Barra lateral**: padrão, na cor de destaque ou **acompanhando o papel de parede** (vidro fosco).
- **Ícones**: cerca de 150 ícones desenhados, por tema e em 10 cores, com busca, para listas, pastas e hábitos (ou um emoji, se preferir).
- A **largura da barra lateral** é ajustável: arraste a borda (clique duplo volta ao padrão).

### Conta, nuvem e segurança

- Sem configurar nada, tudo fica salvo no navegador. Com o Supabase, cada pessoa tem uma **conta** e os dados **sincronizam entre aparelhos**, inclusive offline (as mudanças esperam a conexão voltar).
- **Limite de tentativas de login**: depois de 5 senhas erradas, pausas que crescem de 30 s até 15 min.
- **Recuperação de senha** por e-mail, com mensagens claras para link expirado ou aberto em outro navegador.
- **Alterar senha** em Configurações → Conta (pede a senha atual).
- **Lixeira** por 30 dias e **Desfazer** em quase tudo.
- **Backup**: baixar e restaurar uma cópia de tudo.
- **Remover exemplos**: tira só os dados de demonstração, com confirmação e Desfazer.
- **Apagar todos os meus dados** (LGPD).
- Cabeçalhos de segurança (CSP e outros) na Vercel; anexos em armazenamento privado por usuário; regras de acesso no banco (cada pessoa só vê os próprios dados).

### Celular e tablet

- Barra de navegação inferior no celular (Início, Agenda, Notas, Hábitos, Mais).
- **Segure e arraste** para mover cartões, eventos, listas e pastas no toque.
- Quadro com colunas empilhadas no celular; alvos de toque de 44 px.
- Tela de login própria para celular e tablet.
- **Instalável como app** (PWA): no Chrome/Edge, o ícone de instalar na barra de endereço; no iPhone, **Compartilhar → Adicionar à Tela de Início**. Funciona offline.

### Atalhos de teclado

| Atalho                            | O que faz                                                           |
| --------------------------------- | ------------------------------------------------------------------- |
| `Ctrl/⌘ + K`                      | Buscar                                                              |
| `Ctrl + Delete` (`⌘ + ⌫` no Mac)  | Apagar o item selecionado, aberto ou sob o mouse (dá para desfazer) |
| `Ctrl/⌘ + B` / `I`                | Negrito / itálico nas anotações                                     |
| `Ctrl/⌘ + B` (fora do texto)      | Abrir ou fechar a barra lateral                                     |
| `Esc`                             | Fechar painel ou janela                                             |
| `←` `→` na borda da barra lateral | Ajustar a largura                                                   |

### Acessibilidade

- Contraste WCAG AA conferido com axe-core em todas as páginas, no claro e no escuro, inclusive com cores e papéis de parede personalizados.
- Foco visível, navegação por teclado, rótulos para leitores de tela e respeito a “reduzir movimento”.

---

## Tecnologias

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) + [Vite](https://vitejs.dev)
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (Radix) + ícones [Lucide](https://lucide.dev)
- [Zustand](https://zustand.docs.pmnd.rs) (estado) e [Supabase](https://supabase.com) (login, banco, arquivos e função de alarmes)
- [CodeMirror 6](https://codemirror.net) (editor de notas), [marked](https://marked.js.org) + [DOMPurify](https://github.com/cure53/DOMPurify) e [KaTeX](https://katex.org)
- [Vitest](https://vitest.dev) (testes), ESLint e Prettier
- Hospedagem na [Vercel](https://vercel.com)

---

## Como rodar no seu computador

Precisa do [Node.js](https://nodejs.org) 18 ou mais novo.

```bash
npm install      # só na primeira vez
npm run dev      # abre em http://localhost:5173
```

Sem o arquivo `.env.local`, o app roda **sem login**, com os dados no navegador.

| Comando             | O que faz                                         |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento                       |
| `npm run build`     | Confere os tipos e gera a versão final em `dist/` |
| `npm run preview`   | Serve a versão de `dist/` para testar             |
| `npm run typecheck` | Só confere os tipos do TypeScript                 |
| `npm test`          | Roda os testes automáticos (Vitest)               |
| `npm run lint`      | Procura problemas no código (ESLint)              |
| `npm run format`    | Formata o código (Prettier)                       |

---

## Configurar a nuvem (Supabase)

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e um projeto novo.
2. Em **SQL Editor → New query**, cole o conteúdo de `supabase/setup.sql` e clique em **Run**.
   Ele cria tudo de uma vez (equivale às migrações `001` a `007` de `supabase/migrations/`, que também podem ser rodadas em ordem):
   tabelas `records` e `reminders`, regras de acesso, limites e o armazenamento privado `anexos` para imagens e PDF.
3. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**.
4. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
5. Em **Authentication → URL Configuration**, coloque o endereço do site em **Site URL** e em **Redirect URLs**
   (`http://localhost:5173` enquanto testa; depois, o da Vercel).
6. Rode `npm run dev` de novo. Agora o site pede login.

**Recomendações para abrir o site a outras pessoas:**

- **E-mails de cadastro e de senha:** o envio padrão do Supabase só chega a membros do projeto e tem limite baixo.
  Configure um SMTP em **Authentication → Emails → SMTP Settings** (por exemplo, Gmail: host `smtp.gmail.com`,
  porta `465`, usuário e **senha de app**).
- **Link de nova senha que funciona em qualquer aparelho** (opcional): em **Authentication → Emails → Templates → Reset Password**,
  use o link `{{ .SiteURL }}/?token_hash={{ .TokenHash }}&type=recovery`. O app já reconhece esse formato.
- **Tentativas de login:** além do limite no app, ajuste **Authentication → Rate Limits** (por exemplo, 10 entradas a cada 5 minutos).
- **Privacidade:** preencha o contato em `public/privacidade.html`.

> A chave `anon` é pública por definição (as regras de acesso protegem os dados). Nunca coloque a
> `service_role` ou outras chaves secretas no site ou no repositório; o `.env.local` já está no `.gitignore`.

---

## Configurar os alarmes

Os alarmes são enviados pela função `supabase/functions/send-reminders`, que roda a cada minuto.

### 1. Escolha como enviar os e-mails

- **Gmail** (grátis, sem domínio; até ~500 e-mails por dia): crie um Gmail só para o app, ative a
  verificação em duas etapas e gere uma **senha de app** em myaccount.google.com/apppasswords.
- **Resend** (precisa de um domínio verificado para enviar a outras pessoas): crie uma API key em resend.com.
- Outro SMTP (como o Brevo) também funciona: use `SMTP_HOST`, `SMTP_PORT` (465) e `SMTP_FROM`.

### 2. Publique a função

No Terminal (o token sai de supabase.com → Account → Access Tokens):

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>

# Gmail:
npx supabase secrets set SMTP_USER=seu.app@gmail.com SMTP_PASS=<senha de app> CRON_SECRET=<uma-senha-longa> APP_URL=https://seu-site.vercel.app
# ou Resend:
npx supabase secrets set RESEND_API_KEY=re_xxx REMINDER_FROM="Minha Rotina <alertas@seudominio.com>" CRON_SECRET=<uma-senha-longa> APP_URL=https://seu-site.vercel.app

npx supabase functions deploy send-reminders --no-verify-jwt
```

Uma senha longa para o `CRON_SECRET` pode ser gerada com `openssl rand -hex 32`. Se Gmail e Resend
estiverem configurados, vale o Gmail.

### 3. Ligue o agendamento

No **SQL Editor**, rode o conteúdo de `supabase/cron.sql` trocando `<PROJECT_REF>` e `<CRON_SECRET>`
(a mesma senha do passo anterior). Não salve o arquivo com a senha dentro.

Para conferir: `select status_code, content, created from net._http_response order by created desc limit 5;`
deve mostrar `200`.

### 4. WhatsApp (opcional)

Enquanto o WhatsApp não estiver configurado, os avisos marcados como WhatsApp chegam por e-mail.

- **Twilio:** `npx supabase secrets set WHATSAPP_PROVIDER=twilio TWILIO_ACCOUNT_SID=AC... TWILIO_AUTH_TOKEN=... TWILIO_WHATSAPP_FROM=+14155238886`
  (no sandbox, quem recebe manda antes a mensagem de ativação; em produção, use um modelo aprovado com
  `TWILIO_CONTENT_SID`, variáveis `{{1}}` título e `{{2}}` quando).
- **WhatsApp Cloud API (Meta):** `npx supabase secrets set WHATSAPP_PROVIDER=meta WHATSAPP_TOKEN=... WHATSAPP_PHONE_ID=... WHATSAPP_TEMPLATE=lembrete`
  (modelo aprovado com duas variáveis: título e quando).

Depois, publique a função de novo.

### Limites (por pessoa, a cada 24 h)

| Segredo                  | Padrão               |
| ------------------------ | -------------------- |
| `DAILY_EMAIL_LIMIT`      | 50 e-mails           |
| `DAILY_WHATSAPP_LIMIT`   | 20 mensagens         |
| `DAILY_WHATSAPP_NUMBERS` | 2 números diferentes |

---

## Publicar na Vercel

1. Envie o código para o GitHub.
2. Em [vercel.com](https://vercel.com), **Add New → Project** e importe o repositório (o preset **Vite** é detectado sozinho).
3. Em **Environment Variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Publique, e coloque o endereço da Vercel no Supabase (Site URL e Redirect URLs).

Pelo Terminal também dá: `npx vercel deploy --prod`.

---

## Estrutura do projeto

```
src/
  main.tsx, App.tsx         entrada, login, layout geral e rotas (#/id-da-página)
  store.ts                  estado global (Zustand) e todas as ações (criar, mover, desfazer…)
  index.css                 tema: cores, claro/escuro, papel de parede, animações
  styles.css                editor de notas e Markdown renderizado
  lib/
    types.ts                formatos dos dados (tarefa, evento, nota, hábito, configurações…)
    model.ts                regras: filtros, ordem automática, revisão espaçada, sequência de hábitos
    events.ts               calendário, repetições e cálculo dos alarmes
    sync.ts, records.ts     sincronização com a nuvem, lixeira e lembretes
    migrate.ts              atualiza dados salvos por versões antigas
    template.ts             espaço inicial com exemplos e o Guia rápido
    appearance.ts           cor de destaque (com contraste garantido), papel de parede, barra lateral
    attachments.ts          imagens e PDF das anotações
    math.ts                 fórmulas LaTeX
    touchDnd.ts             arrastar e soltar no toque
    loginLimit.ts           limite de tentativas de login
    shortcuts.ts, notes.ts, notesIO.ts, backup.ts, supabase.ts, storage.ts, util.ts
  components/
    ui/                     componentes do shadcn
    app/                    barra lateral, barra superior, navegação do celular, pastas
    tasks/                  página da lista, quadro, tabela, calendário, painel e nova tarefa
    calendar/               calendário (mês/semana), evento e alarme
    notes/                  anotações: lista, editor (CodeMirror) e leitura
    icons.tsx, IconPicker.tsx   catálogo e seletor de ícones
    Home.tsx, Habits.tsx, Search.tsx, Settings.tsx, AppearanceTab.tsx, Trash.tsx, Auth.tsx
supabase/
  setup.sql                 todo o banco de uma vez
  migrations/               001 a 007, em ordem
  functions/send-reminders  envio dos alarmes (e-mail e WhatsApp)
  cron.sql                  agenda a função a cada minuto
public/
  privacidade.html, ícones do app (PWA)
vercel.json                 cabeçalhos de segurança
```

---

## Como os dados são guardados

- Uma tabela, `records`, com uma linha por item (lista, tarefa, evento, anotação, hábito, configurações…), em JSON.
  Cada pessoa só lê e escreve as próprias linhas (Row Level Security).
- As mudanças são enviadas em lotes; as de outros aparelhos chegam ao voltar para a aba e a cada minuto.
  Sem internet, ficam numa fila e são enviadas quando a conexão volta.
- Itens excluídos ficam 30 dias na **Lixeira**.
- Anexos ficam no armazenamento privado `anexos`, numa pasta por pessoa. O papel de parede com imagem fica só no aparelho.
- Os lembretes ficam na tabela `reminders`; a função envia os que venceram e marca como enviados.
