# Minha Rotina

Um espaço pessoal para organizar estudos, trabalho, compromissos e hábitos,
com páginas, bancos de dados e visões (Quadro, Tabela, Lista e Calendário).

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

## Estrutura

```
src/
  main.tsx              ponto de entrada
  App.tsx               layout geral, atalhos e rotas (#/id-da-pagina)
  store.ts              estado global (Zustand) e todas as ações
  styles.css            visual (cores, temas claro/escuro, layout)
  lib/
    types.ts            formatos dos dados (Página, Banco, Item, Hábito…)
    model.ts            regras: filtros, ordenação, revisão espaçada
    template.ts         espaço inicial com exemplos
    storage.ts          chave do cache local
    supabase.ts         conexão com o Supabase (se configurado)
    sync.ts             sincronização com a nuvem e lixeira
    records.ts          conversão espaço ⇄ linhas do banco
    notes.ts            links [[ ]], tags, menções, nota do dia
    notesIO.ts          exportar/importar .md
    backup.ts           backup em JSON
    util.ts             datas, constantes e utilidades
  components/
    Sidebar.tsx         árvore de páginas, favoritos, arrastar e soltar
    PageView.tsx        cabeçalho (ícone, capa, título) e página de texto
    BlockEditor.tsx     editor em blocos com "/" e atalhos de markdown
    DbPage.tsx          barra de visões, filtros e busca do banco
    DbMenus.tsx         menus de visão, filtro, ordenação e propriedades
    Props.tsx           exibição e edição dos valores das propriedades
    Peek.tsx            painel lateral de um item
    Home.tsx            Início: hoje, revisões, hábitos, sugestões, estatísticas
    Habits.tsx          página de hábitos
    Search.tsx          busca (Ctrl/Cmd + K)
    Settings.tsx        tema, cor, fonte, largura, densidade
    views/              Board, Table, ListView, Calendar
    notes/              Anotações: NotesView, NoteEditor, NoteReader, Graph
    Auth.tsx            entrar, criar conta, recuperar senha
    Trash.tsx           lixeira
supabase/migrations/    SQL do banco de dados
```

## Dados e contas

O app funciona de dois jeitos:

- **Sem configurar nada:** tudo fica salvo no navegador (sem login). Bom para testar.
- **Com o Supabase configurado:** cada pessoa cria uma conta e os dados ficam
  salvos na nuvem, sincronizados entre aparelhos, com Lixeira de 30 dias.

### Configurar o Supabase (uma vez)

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e um projeto novo.
2. No projeto, abra **SQL Editor → New query**, cole o conteúdo de
   `supabase/migrations/001_init.sql` e clique em **Run**. Isso cria a tabela
   `records` com as regras de acesso (cada usuário só vê os próprios dados).
3. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**.
4. Copie `.env.example` para `.env.local` e preencha as duas variáveis.
5. Em **Authentication → URL Configuration**, coloque em **Site URL** o endereço
   do site (`http://localhost:5173` enquanto testa; depois, o da Vercel) e adicione
   o mesmo endereço em **Redirect URLs**.
6. Rode `npm run dev` de novo. Agora o site pede login.

> O envio de e-mails do Supabase gratuito tem limite baixo (poucos por hora).
> Para abrir o site para muita gente, configure um SMTP próprio em
> **Authentication → Emails → SMTP Settings**.

### Como os dados são guardados

Uma única tabela, `records`, com uma linha por entidade (página, banco, item,
anotação, hábito…), em JSON. A sincronização fica em `src/lib/sync.ts`:
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
