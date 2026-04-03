# Finance Pulse 💰

A high-fidelity, role-based financial management platform built with React, Vite, and Supabase. Finance Pulse enables individuals to track their personal finances while giving institutional analysts and admins a real-time, platform-wide view of all transaction data.

---

## ✨ Features

### For All Users
- **Secure Authentication** via Supabase Auth (email/password)
- **Personal Dashboard** with income, expenses, net balance, and spending breakdown
- **Transaction Management**: Add, edit, and delete transactions with full category support
- **Advanced Filtering**: Filter transaction history by type, category, description search, and date range
- **Indian Rupee (₹) Localization** throughout the UI

### For Analysts & Admins
- **Institutional Analytics Dashboard** with platform-wide aggregates (total users, volume, income vs. expenses)
- **Interactive Donut Chart** with hover-based segment focus for category breakdown
- **Platform Health Bar** showing the live income/expense balance ratio
- **CSV Export**: Download a full audit trail of all platform transactions in one click

### Security
- **Row-Level Security (RLS)** enforced at the PostgreSQL level — users can only see their own data
- **Role-Based Access Control** (Admin, Analyst, Viewer) verified on every sensitive Edge Function call
- **Zod validation** on the frontend for all transaction inputs

---

## 🏗 Architecture

```
zorvyn_assignment/
├── frontend/                   # Vite + React 19 + Tailwind CSS v4
│   └── src/
│       ├── components/
│       │   ├── auth/           # AuthForm (login/signup)
│       │   ├── common/         # ConfirmationModal, shared UI
│       │   ├── dashboard/      # All dashboard views and forms
│       │   └── layout/         # AppLayout, Navigation
│       ├── hooks/              # Data fetching hooks (useDashboard, useTransactions, etc.)
│       └── lib/
│           └── supabaseClient.ts
└── supabase/
    └── functions/              # Deno Edge Functions
        ├── create-transaction/
        ├── export-platform-csv/
        ├── get-dashboard-summary/
        └── get-platform-analytics/
```

---

## 🛠 Tech Stack

| Layer         | Technology                                         |
|---------------|----------------------------------------------------|
| Frontend      | React 19, Vite, TypeScript, Tailwind CSS v4        |
| UI / Icons    | Lucide React, Recharts                             |
| Validation    | Zod (client-side), custom validators (Edge Fn)     |
| Backend       | Supabase (Postgres + Auth + RLS + Edge Functions)  |
| Runtime       | Deno 2 (Edge Functions)                            |
| Notifications | react-hot-toast                                    |

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js v18+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- A Supabase project

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd zorvyn_assignment/frontend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

> ⚠️ **Never commit this file.** It is already in `.gitignore`.

### 3. Apply Database Migrations

Run the SQL schema from the Supabase Dashboard SQL editor or via the CLI. The schema includes:

- `profiles` table with `role` column (`admin`, `analyst`, `viewer`)
- `categories` table with `type` column (`income` / `expense`)
- `transactions` table with `RLS` policies enabled
- Trigger to auto-create a profile row on user sign-up

### 4. Deploy Edge Functions

```bash
# From the project root
supabase functions deploy create-transaction
supabase functions deploy get-dashboard-summary
supabase functions deploy get-platform-analytics
supabase functions deploy export-platform-csv
```

### 5. Run Locally

```bash
cd frontend
npm run dev
```

---

## 🔐 User Roles

| Role       | Personal Dashboard | Analyst Dashboard | CSV Export | Manage Others' Tx |
|------------|:------------------:|:-----------------:|:----------:|:-----------------:|
| `viewer`   | ✅                  | ❌                 | ❌          | ❌                 |
| `analyst`  | ✅                  | ✅                 | ✅          | ❌                 |
| `admin`    | ✅                  | ✅                 | ✅          | ✅                 |

Set a user's role by updating their row in the `profiles` table in your Supabase dashboard.

---

## 📋 API Reference (Edge Functions)

### `POST /functions/v1/create-transaction`
Creates a new transaction for the authenticated user.

**Body:**
```json
{
  "amount": 1500.00,
  "type": "expense",
  "category_id": "<uuid>",
  "date": "2026-04-03",
  "description": "Optional note"
}
```

### `GET /functions/v1/get-dashboard-summary`
Returns aggregated personal finance data for the authenticated user.

### `GET /functions/v1/get-platform-analytics`
Returns platform-wide analytics. Requires `analyst` or `admin` role.

### `POST /functions/v1/export-platform-csv`
Returns a `.csv` file of all platform transactions. Requires `analyst` or `admin` role.