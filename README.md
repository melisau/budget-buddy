# BudgetBuddy

**Know where your money goes. Plan where it should go.**

BudgetBuddy is a modern, responsive personal-finance SaaS interface for tracking income, expenses, budgets, accounts, savings goals, family finances, and AI-assisted insights.

## Current scope

- Responsive landing, sign-in, and sign-up experiences
- Dashboard with cash-flow and category charts
- Manual transaction entry and review-first CSV import flow
- Monthly budgets, accounts, savings goals, and analytics
- Turkish and English language selection
- Family workspace with member roles and shared transactions
- AI assistant and voice-coach demo interface
- Free, Core, and Pro plan previews

The current version is a front-end product foundation using demo data. It does not connect to banks, process payments, or call paid AI services.

## Stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts
- Lucide React

## Run locally

Requirements: Node.js 22.13 or newer and pnpm.

```bash
pnpm install
pnpm dev
```

Open the local URL shown in the terminal.

## Build

```bash
pnpm build
```

## Planned architecture

Clerk authentication, Supabase/PostgreSQL persistence, secure family invitations, validated transaction CRUD, and server-side AI integration are planned for later phases. Secrets must remain server-side and must never be committed to this repository.

## Live demo

[budgetbuddy-finance.melisauyar5225.chatgpt.site](https://budgetbuddy-finance.melisauyar5225.chatgpt.site)
