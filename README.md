<div align="center">

# 💰 Meu Orçamento

Aplicação web para organizar renda, categorias, compras e objetivos financeiros de forma simples.

[![Status](https://img.shields.io/badge/status-em%20desenvolvimento-173d35?style=for-the-badge)](https://meu-orcamento.athoskolling.chatgpt.site)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)

[**Abrir aplicação**](https://meu-orcamento.athoskolling.chatgpt.site)

</div>

## Sobre o projeto

O **Meu Orçamento** é um sistema pessoal de controle financeiro. Ele permite definir a renda de cada mês, separar limites por categoria, registrar compras e acompanhar quanto ainda está disponível.

Também é possível criar objetivos financeiros com ou sem data limite, informar quanto já foi guardado e registrar novos depósitos ao longo dos meses.

> A aplicação publicada possui acesso privado. O código deste repositório não contém compras, categorias, saldos ou qualquer outro dado financeiro salvo no sistema.

## Funcionalidades

- Definição da renda mensal
- Criação, edição e exclusão de categorias
- Limite de gastos individual por categoria
- Registro e exclusão de compras
- Cálculo automático do saldo disponível
- Indicadores de gasto e orçamento restante
- Criação de objetivos financeiros
- Data limite opcional em cada objetivo
- Registro do valor inicial já guardado
- Depósitos mensais nos objetivos
- Acompanhamento visual do progresso das metas
- Interface responsiva para celular e computador
- Persistência dos dados em banco de dados

## Tecnologias

| Tecnologia | Utilização |
| --- | --- |
| React 19 | Construção da interface |
| TypeScript | Tipagem e segurança do código |
| Vinext / Vite | Aplicação full-stack e desenvolvimento |
| Tailwind CSS | Estilização responsiva |
| Shadcn UI | Componentes de interface |
| Drizzle ORM | Acesso e modelagem do banco |
| Cloudflare D1 | Banco de dados SQLite na nuvem |
| Lucide React | Ícones |

## Executando no computador

### Requisitos

- [Node.js](https://nodejs.org/) 22.13 ou superior
- npm
- Git
- Linux ou WSL 2

No Windows, a forma recomendada é abrir o projeto pelo **VS Code usando WSL**, pois os scripts de instalação e compilação utilizam Bash e ferramentas do Linux.

### Instalação

```bash
git clone https://github.com/athoskolling/meu_orcamento.git
cd meu_orcamento
npm run install:ci
```

### Iniciar o ambiente de desenvolvimento

```bash
npm run dev
```

Abra no navegador o endereço mostrado no terminal. As alterações feitas nos arquivos serão atualizadas durante o desenvolvimento.

### Criar uma versão de produção

```bash
npm run build
```

## Estrutura principal

```text
app/
├── api/budget/route.ts  # Operações de renda, compras, categorias e objetivos
├── globals.css          # Estilos globais
├── layout.tsx           # Metadados e estrutura da página
└── page.tsx             # Interface principal

db/
├── index.ts             # Conexão com o banco
└── schema.ts            # Tabelas do sistema

drizzle/                 # Migrações do banco de dados
components/ui/           # Componentes visuais reutilizáveis
public/                  # Ícones e arquivos públicos
```

## Banco de dados

O projeto utiliza **Cloudflare D1**, baseado em SQLite. As definições das tabelas ficam em `db/schema.ts` e as migrações em `drizzle/`.

Para gerar uma nova migração após alterar o esquema:

```bash
npm run db:generate
```

Os dados reais da aplicação publicada ficam no ambiente de hospedagem e **não são enviados ao GitHub**.

## Principais comandos

| Comando | Função |
| --- | --- |
| `npm run dev` | Inicia o projeto em desenvolvimento |
| `npm run build` | Gera a versão de produção |
| `npm run lint` | Verifica a qualidade do código |
| `npm test` | Executa os testes |
| `npm run db:generate` | Gera migrações do banco |

## Autor

Desenvolvido por [Athos Kolling](https://github.com/athoskolling).

---

<div align="center">
  Feito para transformar o controle financeiro em algo visual e fácil de acompanhar.
</div>
