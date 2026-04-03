# System Architecture & File Placement Guidelines

This project is a Finance Data Processing Backend with a React frontend, built as a modern monorepo. It is designed to demonstrate strict **separation of concerns**, scalable backend design, and high-quality code organization. 

As the AI developer (Antigravity), you MUST strictly adhere to the following directory rules when creating, modifying, or reading files.

## 1. Directory Structure & Purpose

### 📂 `supabase/` (The Backend Domain)
**Purpose:** This folder contains ALL database infrastructure, access control, and server-side logic. UI code NEVER goes here.
* **`migrations/`**: Contains only `.sql` files. This is where schema definitions, table creations, and Row-Level Security (RLS) policies live.
* **`functions/`**: Contains Supabase Edge Functions (written in TypeScript/Deno). This is where complex business logic (e.g., dashboard aggregations) lives.
* **`seed.sql`**: Contains mock data for local testing.

### 📂 `src/` (The Frontend Domain)
**Purpose:** This folder contains the React UI, state management, and API connection layer. Database schema definitions or SQL scripts NEVER go here.
* **`components/`**: Pure UI components. 
    * Use `components/layout/` for wrappers (Sidebar, Navbar).
    * Use `components/dashboard/` for feature-specific visuals (Charts, Tables).
* **`hooks/`**: Custom React hooks. ALL data fetching from Supabase must be abstracted into hooks (e.g., `useTransactions.ts`, `useAuth.ts`). Do not write raw Supabase fetch calls directly inside UI components.
* **`lib/`**: Core utilities. This is where `supabaseClient.ts` (the database connection) and `validations.ts` (Zod schemas for input validation) live.
* **`types/`**: TypeScript definitions. Keep database types (`database.types.ts`) and custom interfaces here to ensure type safety across the frontend.

### 📂 `docs/` (Assessment Documentation)
**Purpose:** Stores technical documentation for evaluators. 
* **`architecture.md`**: Explains the RBAC, RLS, and why Supabase was chosen.
* **`api-reference.md`**: Documents the Edge Functions.
* **`assumptions.md`**: Logs any edge cases, tradeoffs, or assumptions made during development.

---

## 2. Rules for Creating New Files

Before creating a new file, ask yourself:

1.  **Is this altering the database structure or security?**
    * *Action:* Create a new migration file in `supabase/migrations/`.
2.  **Is this an aggregation or complex backend task that shouldn't be exposed to the client?**
    * *Action:* Create an Edge Function in `supabase/functions/[function-name]/index.ts`.
3.  **Is this a reusable visual element?**
    * *Action:* Place it in `src/components/`.
4.  **Is this querying data for the UI?**
    * *Action:* Create or update a hook in `src/hooks/` and import that hook into your component.
5.  **Is this validating user input?**
    * *Action:* Add a Zod schema to `src/lib/validations.ts`.

By following these rules, we ensure the codebase remains clean, testable, and strictly divided between frontend presentation and backend logic.