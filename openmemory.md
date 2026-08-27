# OpenMemory Guide — Workxpace

## Overview
Workxpace is the HCFI eBudgeting app (Next.js App Router, Prisma, NextAuth). Protected routes live under `app/(protected)/`. Authorization is per-user JSON on `UserAccess` (`menuAccess` + `activityAccess`), not role-menu matrices.

## Architecture
- **Session:** `lib/auth/session-user.ts` builds JWT claims. `ADMIN` role starts from `fullMenuAccess` / `fullActivityAccess`; other roles start from defaults. Stored `UserAccess` JSON overrides the baseline.
- **Department RLS (documents):** `lib/access/cross-department.ts` — `viewOtherDepartmentDocuments` / `createForOtherDepartment`.
- **Department RLS (dashboard):** `lib/access/dashboard.ts` — `viewAllDashboardDepartments`. Independent from document RLS.
- **Dashboard personas:** `activityAccess.dashboardView` = `department` | `director` | `fpa`. Assigned per user on Access Control. Runtime view is locked (no switcher).
- **Dashboard data:** `GET /api/dashboard/summary` aggregates `DataMartStagingRow` plus outstanding GR (approved BR vs paid) and pending PR. Formulas: `lib/dashboard/metrics.ts`.

## User Defined Namespaces
- [Leave blank - user populates]

## Components
- `app/(protected)/dashboard/page.tsx` — server wrapper via `renderClientPage` (Next 15 params Promise must not reach the client)
- `app/(protected)/dashboard/PageClient.tsx` — locked persona shell + filters
- `components/dashboard/*` — reusable KPI/chart/table widgets (SOLID: one visual per file)
- `DepartmentDashboard` / `DirectorDashboard` / `FpaDashboard` — compose widgets from the spec
- `components/ui/SegmentedControl.tsx` — reusable All/Q1… switcher; dashboard quarter filter uses All | Q1 | Q2 | Q3 | Q4 (calendar FY has no Q5)
- `app/api/dashboard/summary/route.ts` — gated by `menuAccess.dashboard`

## Patterns
- **Production build:** `prebuild` clears `.next` before `next build`. Stale Next 15 cache can leave incomplete `app-paths-manifest.json` and surface as `PageNotFoundError` / ENOENT for routes that exist (seen on `/budget-requests/[id]` and `/budget-requests/[id]/review/detail`).
- New activity flags go on `ActivityAccess` + `defaultActivityAccess` + `fullActivityAccess` + `mergeWithDefaultActivityAccess`. JSON column; no Prisma migration for new keys.
- Dashboard widget lists are **not** per-user checkboxes. Persona is a single enum; layout is hardcoded per persona.
- Dashboard department charts merge staging rows that share the same display name (legacy null `departmentId` vs master id) so utilization is one bar per department. List widgets use index-suffixed React keys. Budget-alert ids also include department name + index because the same `departmentId` can appear under more than one staging name.
- Staging `expenseCategory` (and other BR classification fields) often store CategoryMaster IDs, not names. Dashboard charts, alerts, and category filters resolve ID → name via `lib/data-mart/resolve-classification-labels.ts` (same read-time map as reports). Filter queries match both ID and name.
