# 📈 Finance Pulse

![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite_5-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Deno](https://img.shields.io/badge/Deno-white?style=for-the-badge&logo=deno&logoColor=464647)

---
# Finance Pulse 💰

A high-fidelity, role-based financial management platform built with React, Vite, and Supabase. Finance Pulse enables individuals to track their personal finances while giving institutional analysts and admins a real-time, platform-wide view of all transaction data.

---

## ✨ Features

### For All Users
- **Secure Authentication** via Supabase Auth (email/password)
- **Personal Dashboard** with income, expenses, net balance, and spending breakdown
- **Transaction Management**: Add, edit, and delete transactions with full category support
- **Advanced Filtering**: Filter transaction history by type, category, description search, and date range

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

## 🔐 Live Demo & Test Credentials

To experience the platform's dynamic routing and role-based permissions, use the following test credentials to log in. 

| Role | Email |Password| Permissions |
| :--- | :--- | :--- | :--- |
| **Viewer** | `viewer@gmail.com` | `viewer@123` | Standard access. Can only view, add, and delete their own personal transactions. |
| **Analyst** | `analyst@gmail.com` | `analyst@123` | Institutional access. Can view personal data AND the macro-level Platform Analytics dashboard. |
| **Admin** | `admin@gmail.com` | `admin123` | God-mode. Can view all dashboards, securely context-switch between users, and edit platform-wide data. |

---

## 🚀 Quick Start (Download & Run)

Follow these instructions to download the source code and run the application on your local machine.

### Prerequisites
Before you begin, ensure you have the following installed:
* [Node.js](https://nodejs.org/) (v18 or higher)
* [Git](https://git-scm.com/)
* [Supabase CLI](https://supabase.com/docs/guides/cli) (for running edge functions locally)


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
- **Validation**: Enforces numeric precision (2 dec), date limits (no future), and type-category consistency.

### `PATCH /functions/v1/update-transaction`
Updates an existing transaction.
- **Note**: This fulfills the "updating records" requirement via a secure validation layer.
- **Body**: `{ "id": "<uuid>", "amount": 1000, ... }`

### `GET /functions/v1/manage-users`
List all platform users.
- **Permission**: `admin` only.
- **Internal**: Uses service_role to query the profiles table.

### `PATCH /functions/v1/manage-users/:id`
Update user role or account status (active/inactive).
- **Permission**: `admin` only.

### `GET /functions/v1/get-platform-analytics`
Returns macro-level platform analytics including **Daily Trends** (Last 30 Days).
- **Trends**: Array of `{ date: string, income: number, expense: number }` for time-series visualization.

---

## 💡 Assumptions & Design Decisions

### Architectural Assumptions
1. **RBAC via Profiles**: We assume authentication alone isn't enough; authorization roles (`admin`, `analyst`, `viewer`) are stored in a dedicated `profiles` table linked to `auth.users` via a trigger.
2. **Category Isolation**: Categories are immutable across users to ensure data integrity during platform-wide aggregation.
3. **UTC Precision**: All transaction dates are stored and compared in YYYY-MM-DD format to avoid timezone drift in financial reports.

### Tradeoffs Considered
- **Edge Functions vs. Direct Client Updates**: We chose to route `CREATE` and `UPDATE` operations through Edge Functions despite the extra latency. **Tradeoff**: Higher latency for improved data consistency. This ensures that business logic (like verifying a category's type matches the transaction's type) is never bypassed by a malicious client.
- **Recharts vs. D3.js**: We used Recharts for the Analyst Dashboard. **Tradeoff**: Less control over minute SVG details in exchange for faster implementation of high-fidelity, responsive, and accessible charts that integrate perfectly with React 19's rendering cycle.
- **Client-side vs Server-side CSV Generation**: We generate CSVs in a dedicated Deno Edge Function. **Tradeoff**: Increased server cost vs. client-side performance. Large datasets can crash browser memory; generating on the edge ensures stability and better security (no raw transaction JSON ever touches the browser before it's converted to a file).

### Why Supabase?
We selected **Supabase** over alternatives like Firebase or a custom Express/Postgres stack for three core reasons:
1. **RLS (Row-Level Security)**: It allows us to build a multi-tenant financial app where data isolation is non-negotiable, enforced directly at the Postgres kernel level.
2. **Deno Edge Runtime**: Supabase Functions use Deno, providing a modern, secure, and zero-config deployment for our validation logic.
3. **Auto-Generated Types**: Using the Supabase CLI, we can sync database schemas to TypeScript interfaces, providing end-to-end type safety.

---

## 🛣️ Future Architectural Roadmap

While the current platform handles multi-tenant RBAC securely, enterprise scaling introduces concurrency challenges. The next planned architectural upgrade involves:

* **Optimistic Concurrency Control (OCC):** To prevent "Lost Update" anomalies when multiple Admins mutate the same user or transaction record simultaneously via the `PATCH` endpoints, the database tables will implement a `version` integer schema. Edge Functions will enforce an `.eq('version', currentVersion)` lock during updates, instantly rejecting race-condition mutations and prompting the Admin to refresh their localized state.

---

## 🧪 Testing (Engineering Maturity)

Core validation logic is covered by Deno tests located in the `supabase/functions/*/` directories. 
To run tests locally:
```bash
deno test supabase/functions/update-transaction/validation_test.ts
```