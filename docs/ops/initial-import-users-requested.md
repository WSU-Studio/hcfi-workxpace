# Initial import users (requested) — CLI

Prefill Workxpace users for prod go-live. The **58-user list is embedded** in `scripts/initial-import-users-requested.ts` — no CSV file is required on the server.

Optional `--file path.csv` overrides the built-in list if you need a different batch later.

## Behaviour

| Case | Action |
|---|---|
| Email not in DB | Create: role `GUEST`, department `UNASSIGNED`, restricted menu, default activity, random password, `employeeId` = `CSV-…` |
| Email already exists | Skip (does not change role / access / department) |
| `--update-name` + existing | Update `users.name` only |

Does **not** call Confins. After create, run employee sync so EmpNo / department / job-title role fill in.

## Usage on the server

From the app deploy directory (same place as PM2 / `.env`). Script must be deployed (commit + deploy) before running.

```bash
# Dry-run (default) — uses built-in list, no DB writes
npx tsx scripts/initial-import-users-requested.ts

# Apply
npx tsx scripts/initial-import-users-requested.ts --apply

# Optional: refresh display name for existing emails
npx tsx scripts/initial-import-users-requested.ts --apply --update-name

# Optional: override with an external CSV
npx tsx scripts/initial-import-users-requested.ts --file /tmp/other.csv --apply
```

Or via npm:

```bash
npm run initial-import-users-requested
npm run initial-import-users-requested -- --apply
```

Then sync from Confins:

```bash
curl -X POST "http://127.0.0.1:${PORT}/api/cron/sync-confins-employees" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

## After import

1. Assign Access Control (Department / Finance / C-Level / IT Admin).
2. Run Confins sync; review `notInConfins` / EmpNo errors.
3. Confirm Approval Schema PIC still correct after job-title roles appear.
