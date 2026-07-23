# Confins Employee Sync (Scheduled)

Daily job that updates Workxpace users whose email exists in the Confins Organization Master API.

## What gets synced

| Confins field | Workxpace field | Notes |
|---|---|---|
| `Username` | match key (`users.email`) | Case-insensitive |
| `EmpName` | `users.name` | Skipped when empty in Confins |
| `EmpNo` | `users.employeeId` | Skipped if EmpNo already belongs to another user |
| `Roles[].BusinessUnitName` | `users.departmentId` | Resolved by department name; auto-creates from BizUnit master if missing |
| `Roles[].RoleName` | `users.roleId` | Match `roles.roleCode`; auto-create role if missing |
| `Roles[].JobTitleName` | `roles.roleName` | Used as display name when role is auto-created |

**Not synced:** access flags, `isActive`.

Employee master sync **always calls the live Confins API** (`liveOnly`) — it ignores the
**Activate Mock API** toggle and mock fallback. Mock mode only affects other Confins
endpoints (e.g. budget reconciliation).

Users in Workxpace with no Confins match are skipped (counted in `notInConfins`).

## API endpoint (shared by Option A and B)

```
POST /api/cron/sync-confins-employees
Authorization: Bearer {CRON_SECRET}
Content-Type: application/json
```

### Manual sync (User Management UI)

**Hyundai/HCFI deployments only** — requires `NEXT_PUBLIC_DEPLOYMENT_TENANT=hyundaicapital` at build time.
Other tenant deployments do not show the button and the manual API returns 404.

Admins with `editUser` or `changeAccess` can trigger the same sync from **User Management → Sync from Confins**.

```
POST /api/user-management/sync-confins
Cookie: session (NextAuth)
```

Both paths call the same `runConfinsEmployeeSync()` logic.

**Success response:**

```json
{
  "success": true,
  "summary": {
    "totalUsers": 20,
    "matchedInConfins": 16,
    "notInConfins": 4,
    "updated": 14,
    "unchanged": 2,
    "errors": []
  }
}
```

## Required environment variables

| Variable | Where | Description |
|---|---|---|
| `CRON_SECRET` | Production `.env` + GitHub Secrets | Shared bearer token for cron endpoints |
| `PORT` | GitHub Secrets (Option A only) | PM2 port for localhost curl on self-hosted runner |
| `CONFINS_BASE_URL` | Production `.env` | Confins API base URL |
| `ADINSKEY` | Production `.env` | Confins auth header |

`NEXTAUTH_URL` is **not** used by the sync workflow. The job runs on the
**self-hosted runner** and calls `http://127.0.0.1:{PORT}/...` locally.

Generate a strong secret:

```bash
openssl rand -base64 32
```

Use the **same value** in GitHub Secrets (`CRON_SECRET`) and production server `.env`.

---

## Option A — GitHub Actions (current)

**File:** `.github/workflows/sync-confins-users.yml`

- Runs on the **self-hosted runner** (same server as PM2)
- Calls `http://127.0.0.1:{PORT}/api/cron/sync-confins-employees` — no public DNS needed
- Runs daily at **02:00 WIB** (19:00 UTC)
- Can be triggered manually: **Actions → Sync Confins Employees → Run workflow**

### Setup checklist

1. Add GitHub Secrets to the **production** environment:
   - `CRON_SECRET` — same as server `.env`
   - `PORT` — PM2 app port (e.g. `3090`)
2. Add `CRON_SECRET` to production `.env` (via deploy workflow or manual)
3. Ensure the **self-hosted GitHub Actions runner** is online on the production server
4. Deploy the app
5. Test manually from GitHub Actions before waiting for the schedule

### Manual test (from your machine)

```bash
curl -X POST "https://ebudget.hyundaicapital.co.id/api/cron/sync-confins-employees" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

### Logs

- GitHub Actions run log — HTTP status + JSON summary
- Production server — `pm2 logs nextjs-app | grep CRON`
- Activity history — `entityType: ConfinsSyncEmployees` (logged under first ADMIN user)

---

## Option B — Server crontab (future migration)

When moving from GitHub Actions to the HCFI server scheduler:

### 1. Add crontab on production server

```bash
crontab -e
```

```cron
# Daily Confins employee sync — 02:00 WIB
0 2 * * * curl -sf -X POST http://127.0.0.1:3090/api/cron/sync-confins-employees \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  >> /var/log/workxpace-confins-sync.log 2>&1
```

Use `127.0.0.1:3090` (PM2 port) — no public internet round-trip.

### 2. Ensure `CRON_SECRET` is in server `.env`

Already injected by deploy workflow if `secrets.CRON_SECRET` is set in GitHub.

### 3. Disable GitHub Actions schedule

Edit `.github/workflows/sync-confins-users.yml`:

- Remove or comment out the `schedule:` block, **or**
- Delete the workflow file entirely

Keep `workflow_dispatch` if you want a manual fallback trigger from GitHub.

### 4. Verify — do not run both schedulers

Running Option A and B together causes **double sync** (2x Confins API load, redundant DB writes).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| curl exit `6` (couldn't resolve host) | Workflow used public URL / `ubuntu-latest` | Use self-hosted runner + `127.0.0.1:{PORT}` (current workflow) |
| curl exit `7` (connection refused) | PM2 not running or wrong `PORT` secret | `pm2 status`, align `PORT` secret with `.env` |
| `401 Unauthorized` | `CRON_SECRET` mismatch | Align GitHub Secret and server `.env` |
| `503 CRON_SECRET is not configured` | Missing env on server | Add to `.env`, restart PM2 |
| `matchedInConfins: 0` | Email mismatch | Confins `Username` must match Workxpace `email` exactly |
| Confins API error | `CONFINS_BASE_URL` / `ADINSKEY` | Check Confins connectivity from server |
| `Invalid JSON from Confins (... body=...)` | Confins/gateway returned HTML or non-JSON (wrong URL, auth, WAF, downtime) | Check `body=` preview in the error; verify `CONFINS_BASE_URL` + `ADINSKEY` on the server; `curl` the employee path from the PM2 host |
| `ReturnObject is not an array` | Confins returned an error envelope without employee rows | Read `StatusCode` / `Message` in the error; confirm AdInsKey and path |
| `errors[].reason: EmpNo already assigned` | Duplicate EmpNo in Confins | Resolve in Confins or manually in User Management |

## Code map

| File | Role |
|---|---|
| `lib/confins/employee-sync.ts` | Batch sync logic |
| `lib/confins/employee-lookup.ts` | Confins fetch + department resolution (shared with SSO) |
| `lib/cron/verify-cron-secret.ts` | Bearer token auth |
| `app/api/cron/sync-confins-employees/route.ts` | HTTP endpoint |
| `.github/workflows/sync-confins-users.yml` | Option A scheduler only |

When migrating A → B, only the workflow file becomes optional; all app code stays.
