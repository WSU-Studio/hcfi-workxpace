# Workxpace — eBudgeting System

Web application for **Hyundai Capital Finance Indonesia** eBudgeting: Budget Plans (BP), Budget Requests (BR), Payment Requests (PR), Confins reconciliation, and FP&A reporting. Built with **Next.js 15**, **NextAuth**, **Prisma**, and **PostgreSQL**.

Default dev port: **3090** (`http://localhost:3090`).

---

## Features

| Module | Description |
|--------|-------------|
| **Budget Plans** | Annual/department budget planning with approval workflow |
| **Budget Requests** | OPEX/CAPEX requests linked to budget plans |
| **Payment Requests** | Payment execution requests with supporting documents |
| **Reconciliation** | Sync payment lines from Confins API, auto-match to approved BR, save results |
| **Reports** | Reconciliation history, Data Marts (staging), Budget Pivot |
| **User Management** | Users, roles, menu & activity access control |
| **Workspace Management** | Master data: departments, projects, roles, approval schemas, COA, categories, origin offices |

Authentication: **credentials** (email/password) and optional **Azure AD SSO**.

---

## Tech stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **Auth:** NextAuth.js v4 (Prisma adapter)
- **Database:** PostgreSQL + Prisma ORM
- **Storage:** AWS S3 (supporting documents)
- **Integration:** Confins E-Budgeting API WSU **1.03**
- **Process manager (prod):** PM2 on self-hosted runner

---

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm

---

## Local setup

### 1. Install dependencies

```bash
npm ci
```

### 2. Environment variables

Copy the template below into a local `.env` file (never commit `.env`).

Generate a NextAuth secret locally — **do not reuse values from this README or from production**:

```bash
openssl rand -base64 32
```

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/workxpace?schema=public"

# NextAuth (required)
NEXTAUTH_URL="http://localhost:3090"
NEXTAUTH_SECRET="<paste output of: openssl rand -base64 32>"

# AWS S3 — supporting document uploads (optional for local dev without uploads)
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION=""
AWS_S3_BUCKET=""

# Confins E-Budgeting 1.03
CONFINS_BASE_URL=""
ADINSKEY=""
CONFINS_USE_MOCK=true
CONFINS_MOCK_FALLBACK=true
# CONFINS_INCOMING_REF_FIELD="Description"
# CONFINS_BUDGET_REAL_PATH="/v1/IntegrationEBudgetingX/GetListGetListBudgetRealBySourceTypeX"

# Azure AD SSO (optional)
AZURE_APPLICATION_ID=""
AZURE_TENANT_ID=""
AZURE_CLIENT_SECRET=""
AZURE_ALLOWED_GROUP_IDS=""
NEXT_PUBLIC_AZURE_AD_SSO_ENABLED=false

# Tenant UI (optional) — see lib/deployment-ui-policy.ts
NEXT_PUBLIC_DEPLOYMENT_TENANT=
NEXT_PUBLIC_BR_DETAIL_COMPACT_VIEW=false
# When enabled: /budget-requests/[id] = compact view; /budget-requests/[id]/detail = full drill-down

# Master sync UI (optional)
NEXT_PUBLIC_SYNC_MANAGED_MASTERS=""

# Reconciliation QA reset (dev only; or set true explicitly)
# RECONCILIATION_ALLOW_RESET=true
```

### 3. Database

```bash
npm run db:migrate    # prisma migrate dev — local schema + migrations
npm run seed          # idempotent demo users & approval schemas
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3090](http://localhost:3090).

---

## NPM scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Generate Prisma client + Next.js dev server (port 3090) |
| `npm run build` | Production build |
| `npm run start` | Start production server (port 3090) |
| `npm run lint` | ESLint |
| `npm run seed` | Seed demo data (safe to re-run) |
| `npm run db:migrate` | `prisma migrate dev` — **local development only** |
| `npm run db:migrate:deploy` | `prisma migrate deploy` — **production / CI** |
| `npm run db:migrate:create` | Create migration without applying |
| `npm run db:generate` | Regenerate Prisma client |

---

## Demo users (after seed)

| Email | Password | Role |
|-------|----------|------|
| `admin@workxpace.com` | `admin123` | Admin |
| `requestor@workxpace.com` | `password123` | Requestor (Admin role) |
| `reviewer.fm@workxpace.com` | `password123` | Reviewer FM |
| `approver.ceo@workxpace.com` | `password123` | Approver CEO |

Additional requestor/reviewer/approver accounts are created by seed for multi-step approval QA. See `prisma/seed.ts` for the full list.

> **Production:** seed is idempotent (matches by email or `employeeId`) but still resets seeded users' passwords. Prefer running seed only in non-production or controlled deploys.

---

## Confins integration

### API

- Endpoint: `GetListGetListBudgetRealBySourceTypeX` (E-Budgeting **1.03**)
- Default request `sourceType`: **`EGL`** (override via query `?sourceType=CONFINS` on payments API)
- Mock mode: toggle **Activate Mock API** in Application Settings, or set `CONFINS_USE_MOCK=true`

### Reconciliation rules (current)

| Rule | Value |
|------|--------|
| **DC filter** | Only rows with `DC = "D"` (Debit) |
| **Source column** | Raw `DataInterfaceSource` from API (`EGL`, `CONFINS`, `Other Receive`, etc.) — display & record only |
| **BR auto-match field** | `Description` (override: `CONFINS_INCOMING_REF_FIELD`) |
| **Description format** | `{KODE_BR}-{deskripsi invoice}` — hyphen **without** space after BR code |
| **Example** | `BRNOP202606004-INVOICE KJH INV-0010/OS/KJH/V/2025` |
| **Month filter** | `RequestDate` (fallback: InvoiceDate, then period metadata) |

Manual match and **Mark Unused** remain available for unmatched lines.

---

## Deployment

Production deploys via GitHub Actions (`.github/workflows/deploy-prod.yml`):

1. `npm ci` → build
2. `npm run db:migrate:deploy` → apply migrations
3. `npm run seed` → ensure demo/reference data (idempotent)
4. PM2 restart

Secrets (`DATABASE_URL`, `NEXTAUTH_SECRET`, Confins keys, Azure AD, AWS, etc.) are configured in the **GitHub repository / environment secrets** — not in this repository.

---

## Project structure (overview)

```
app/
  (protected)/          # Authenticated pages (BP, BR, PR, reconciliation, reports, …)
  api/                  # REST routes + NextAuth
components/             # UI, forms, reconciliation, reports
lib/
  integrations/confins/ # Confins 1.03 client, budget-real mapping, reconciliation fetch
  reconciliation/     # Incoming BR ref parsing from Description
  data-mart/            # Staging & export helpers
prisma/                 # Schema, migrations, seed
types/                  # Shared TypeScript types (access control, reconciliation, …)
```

---

## Security notes

- **Never commit** `.env`, production credentials, or `NEXTAUTH_SECRET` to git or documentation.
- Rotate `NEXTAUTH_SECRET` if it was ever exposed.
- Menu and activity permissions are enforced in middleware and API routes via `UserAccess`.
- Azure AD login can be restricted with `AZURE_ALLOWED_GROUP_IDS`.
