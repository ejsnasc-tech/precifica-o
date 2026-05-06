# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Precificação Pro** — SaaS de precificação para pequenas empresas. Permite cadastrar empresas, definir taxas, custos, funcionários e ingredientes para calcular automaticamente o preço de produtos. Hospedado em Cloudflare Workers.

## Commands

```bash
# Desenvolvimento
npm run dev                    # Next.js dev server (localhost:3000)

# Build e deploy
npm run build                  # Build Next.js padrão
npm run build:cf               # Build para Cloudflare Workers
npm run preview                # Preview local no Cloudflare
npm run deploy                 # Deploy para produção Cloudflare

# Banco de dados (D1)
npm run db:migrate             # Aplica migrations (dev)
npm run db:migrate:prod        # Aplica migrations (produção --remote)

# Lint
npm run lint
```

## Architecture

### Stack
- **Next.js 15 + React 19 + TypeScript** com App Router
- **Cloudflare Workers** via OpenNext
- **Cloudflare D1** (SQLite) — binding `DB` em `wrangler.jsonc`
- **Cloudflare KV** — sessões de usuário
- **Tailwind CSS 4**
- **Hono** — framework HTTP usado internamente em algumas rotas API
- **Zod** — validação de schemas nas APIs
- **JWT (jose)** — autenticação stateless + bcryptjs para hash de senhas

### Path alias
`@/*` aponta para `./src/*`

### Autenticação (`src/lib/auth.ts`)
JWT com cookies HttpOnly. `sign` cria token, `verify` valida. Middleware em `src/middleware.ts` protege `/dashboard` e rotas `/api/*` (exceto login/register).

### Database (`src/lib/db.ts`)
Acessa D1 via `getRequestContext().env.DB`. Schema em `migrations/0001_init.sql` com 5 tabelas: `users`, `empresas`, `configuracoes_empresa`, `produtos`, `ingredientes`.

### Estrutura de dados
- `users` — conta do usuário (SaaS multi-tenant)
- `empresas` — cada usuário pode ter múltiplas empresas
- `configuracoes_empresa` — taxas por forma de pagamento (débito, crédito, pix, dinheiro), alíquotas
- `produtos` — produtos de cada empresa com margem de lucro
- `ingredientes` — ingredientes dos produtos com custo unitário

### API Routes (`src/app/api/`)
- `/api/auth/login` — POST, retorna JWT no cookie
- `/api/auth/register` — POST, cria usuário + hash bcrypt
- `/api/auth/logout` — POST, limpa cookie
- `/api/empresas` — GET lista, POST cria empresa

### Frontend
- `src/components/EmpresaCard.tsx` — card de empresa no dashboard
- `src/components/EmpresaModal.tsx` — modal criar/editar empresa
- Dashboard em `src/app/dashboard/` — listagem de empresas do usuário logado
