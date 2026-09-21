# Budget Buddy

Budget Buddy is a bilingual personal-finance application for tracking income, expenses, accounts, budgets, savings goals, family finances, receipts, and AI-assisted financial explanations.

## Highlights

- Clerk authentication with server-side authorization
- Supabase/PostgreSQL persistence and starter data for new users
- Personal and family transactions with role-aware access control
- Secure receipt uploads for JPG, PNG, and WEBP files up to 5 MB
- Accounts, budgets, CSV import/export, and financial reports
- Turkish and English user interfaces
- Groq-powered cloud assistant with optional live EUR/TRY reference rates
- Conversation history, voice input, and confirmed voice transaction drafts
- Free family invitations through copyable links and WhatsApp sharing
- Free, Core, and Pro plan definitions with Stripe Checkout groundwork

## Local setup

Requirements: Node.js 22.13 or later, pnpm 11, a Clerk application, a Supabase project, and a Groq API key for AI features.

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your local machine:

* **Node.js** v22.13 or later
* **pnpm** v11 or later
* A **Supabase** account &amp; project
* A **Clerk** application
* A **Groq API Key** (for free AI assistant features)

### Installation Steps

1. **Clone the repository:**  
```  
git clone https://github.com/melisau/budget-buddy.git  
cd budget-buddy  
```
2. **Install dependencies:**  
```  
pnpm install  
```
3. **Configure environment variables:**Copy `.env.example` to `.env.local` and fill in your API credentials:  
```  
cp .env.example .env.local  
```
4. **Apply Database Migrations:**Open the **SQL Editor** in your Supabase Dashboard and run the migration files located in `supabase/migrations/` in order:

  1. `0001_budgetbuddy_foundation.sql`
  2. `0002_new_user_starter_data.sql`
5. **Run the development server:**  
```  
pnpm dev  
```  
Open `http://localhost:5173` (or the URL outputted in your console) to view the app in your browser.

---





Use separate Clerk, Supabase, Stripe, and Groq configuration for development and production.

## Billing status

The application stores trial and subscription status, provides Stripe Checkout and Customer Portal routes, records invoices, and verifies Stripe webhook signatures. Apply every migration, configure Stripe product prices, and register `POST /api/billing/webhook` in Stripe before enabling payments. New accounts retain full application access throughout their 14-day trial.


## 📖 About The Project

**Budget Buddy** is an intuitive, secure, and bilingual personal finance application built to help individuals and families track income, manage expenses, and achieve savings goals effortlessly.

It provides complete control over bank accounts, cash balances, savings, and credit cards, while introducing advanced features like multi-user family budget management, secure receipt scanning and storage, CSV data import/export, and cloud-powered AI financial advisory.

---

## ✨ Key Features

* 🔐 **Authentication &amp; Security:** Clerk integration featuring server-side session validation, OAuth (Google) social logins, and secure user profiles.
* 👨‍👩‍👧‍👦 **Personal &amp; Family Finances:** Role-based access control (**Admin**, **Member**, **Viewer**) with shared household expense tracking, invitation flows, and activity feeds.
* 💳 **Account Management &amp; Transfers:** Create bank, cash, savings, credit card, and digital wallet accounts, track live balances, and record inter-account transfers seamlessly.
* 🧾 **Secure Receipt Storage:** Upload receipt images (JPG, PNG, WEBP up to 5 MB) stored in private Supabase Storage buckets and served via short-lived signed URLs.
* ⚡ **Groq Cloud AI Assistant:** Ultra-fast streaming financial analysis, spending advice, and voice-assisted transaction draft confirmations powered by Groq API (`@ai-sdk/groq` / Vercel AI SDK).
* 🌐 **Bilingual Support (i18n):** Real-time Turkish and English UI toggling with persistent user language preferences across sessions and browser tabs.
* 📊 **Budgets &amp; Savings Goals:** Category-specific monthly spending limits, threshold alerts, interactive progress indicators, and goal tracking.
* 📈 **Analytics &amp; CSV Import/Export:** Recharts-driven 6-month cash flow visualizations, category breakdown charts, and dual-language CSV data export/import.
* 💎 **Subscription Architecture:** Free, Core, and Pro plan tiers backed by Stripe Checkout and Webhook signature verification groundwork.

---

## 🛠 Tech Stack

* **Framework &amp; Runtime:** Next.js 16 (App Router), React 19, TypeScript, Vinext &amp; Cloudflare Workers runtime.
* **Styling &amp; UI Components:** Tailwind CSS v4, shadcn/ui, Lucide Icons, Recharts.
* **Database &amp; Storage:** Supabase (PostgreSQL, Row Level Security, Migrations, Private Storage Buckets).
* **Authentication:** Clerk (`@clerk/nextjs`).
* **AI Engine:** Groq Cloud API (`@ai-sdk/groq` / Vercel AI SDK).
* **Payments:** Stripe Checkout &amp; Webhook Verification.
* **Package Manager:** `pnpm`.



## 🧪 Quality &amp; Build Commands

Run the following commands to check code style, TypeScript types, and production builds:

```
# Lint code formatting (ESLint)
pnpm lint

# TypeScript compilation and type check
node node_modules/typescript/bin/tsc --noEmit

# Production build
pnpm build

```

---

## 🛡 Security &amp; Architectural Principles

* **Receipt Security:** Receipt files are stored in a private Supabase Storage bucket and accessed strictly via short-lived (60-second) signed URLs.
* **Data Isolation:** Supabase Row Level Security (RLS) policies enforce strict data ownership; users can only read or write their own data or data shared within their accepted family group.
* **AI Safety Boundaries:** The AI assistant operates strictly on authorized, sanitized financial summaries and cannot commit transactions without explicit user confirmation.

---

## 📜 License

This project is private software and not licensed for public redistribution. All rights reserved.
