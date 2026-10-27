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
    storage.ts          onde os dados são salvos (hoje: localStorage)
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
```

## Dados

Hoje tudo fica salvo no `localStorage` do navegador (chave `minha-rotina`).
Ou seja: cada navegador/aparelho tem o seu próprio espaço, e limpar os dados
do site apaga tudo.

Para abrir o site para outras pessoas, o próximo passo é ter contas e um banco
de dados online (por exemplo, Supabase ou Firebase). A troca fica concentrada
em `src/lib/storage.ts` e em `src/store.ts`.

## Publicar (deploy)

O projeto gera arquivos estáticos (`npm run build` → `dist/`), então funciona
em Vercel, Netlify ou Cloudflare Pages. Na Vercel, por exemplo: importe o
repositório do GitHub, escolha o preset **Vite** e publique.
