/**
 * Prefill Workxpace users for prod go-live (HCFI User List).
 *
 * Default source = built-in list below (no CSV file needed on the server).
 * Optional `--file path.csv` overrides the built-in list.
 *
 * Creates missing users only (match by email). Existing rows are skipped so
 * admin-assigned role / access / department are not overwritten.
 *
 * New users mirror SSO auto-provision defaults:
 *   - role `GUEST`
 *   - department `UNASSIGNED`
 *   - restricted menu + default activity access
 *   - random unusable password (SSO login expected)
 *   - employeeId `CSV-{emailHash}` until Confins sync fills EmpNo
 *
 * After import, run Confins employee sync:
 *   curl -X POST "http://127.0.0.1:${PORT}/api/cron/sync-confins-employees" \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json"
 *
 * Usage (from app root, with production `.env` loaded):
 *   npx tsx scripts/initial-import-users-requested.ts
 *   npx tsx scripts/initial-import-users-requested.ts --apply
 *   npx tsx scripts/initial-import-users-requested.ts --apply --update-name
 *   npx tsx scripts/initial-import-users-requested.ts --file other.csv --apply
 */

import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import bcrypt from 'bcryptjs';
import { config as loadEnv } from 'dotenv';

import {
  defaultActivityAccess,
  restrictedMenuAccess,
} from '../lib/default-access';
import { prisma } from '../lib/prisma';

loadEnv({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const UPDATE_NAME = process.argv.includes('--update-name');

/** Same codes as SSO auto-provision (`lib/auth/azure-ad-provision.ts`). */
const GUEST_ROLE_CODE = 'GUEST';
const UNASSIGNED_DEPARTMENT_CODE = 'UNASSIGNED';

const GUEST_ROLE_DEFAULTS = {
  roleCode: GUEST_ROLE_CODE,
  roleName: 'Guest',
  description:
    'CSV/SSO placeholder. No access by default — admin must assign role/access.',
};

const UNASSIGNED_DEPARTMENT_DEFAULTS = {
  code: UNASSIGNED_DEPARTMENT_CODE,
  name: 'Unassigned',
  description:
    'Placeholder department for imported/SSO users. Admin or Confins sync reassigns.',
};

type ImportUser = { name: string; email: string };

/**
 * Built-in go-live list from sheet User List (name + email, deduped).
 * Source workbook: FormUATSkenario_and_LOG_HCSRTH-593_E-budgeting 20261015.xlsx
 * Ary Yudistira Sidauruk omitted (no email in sheet).
 */
const BUILTIN_USERS: ImportUser[] = [
  { name: 'Ade Maulana', email: 'ade.maulana@id.hcs.com' },
  { name: 'Ahmad Andi Priyanto', email: 'ahmad.priyanto@id.hcs.com' },
  { name: 'Andriyanus', email: 'andriyanus.andriyanus@id.hcs.com' },
  { name: 'Arnetta Zhafira', email: 'arnetta.zhafira@id.hcs.com' },
  { name: 'Audrey Fahdina', email: 'audrey.fahdina@id.hcs.com' },
  { name: 'Berta Fiona Amethyst', email: 'berta.amethyst@id.hcs.com' },
  { name: 'Bobby Pratama', email: 'bobby.pratama@id.hcs.com' },
  { name: 'Budi Kasrozi Indro P U', email: 'budi.kasrozi@id.hcs.com' },
  { name: 'Candra Setiadi', email: 'candra.setiadi@id.hcs.com' },
  { name: 'Dea Rizki Ananda', email: 'dea.rizki@id.hcs.com' },
  { name: 'Devy Lesmana', email: 'devy.lesmana@id.hcs.com' },
  { name: 'Diana', email: 'diana.diana@id.hcs.com' },
  { name: 'Edrizal Bahsan', email: 'edrizal.bahsan@id.hcs.com' },
  { name: 'Eko Nugroho', email: 'eko.nugroho@id.hcs.com' },
  { name: 'Fachrul Prakoso Utomo', email: 'fachrul.utomo@id.hcs.com' },
  { name: 'Faris Septiawan', email: 'faris.septiawan@id.hcs.com' },
  { name: 'Feni Apriliani', email: 'feni.apriliani@id.hcs.com' },
  { name: 'Firdha Ulya', email: 'firdha.ulya@id.hcs.com' },
  { name: 'Franciska Ferlyn Theno', email: 'franciska.theno@id.hcs.com' },
  { name: 'Ganang Adji Danuharto', email: 'ganang.danuharto@id.hcs.com' },
  { name: 'Helvina Andriany', email: 'helvina.andriany@id.hcs.com' },
  { name: 'Iswadi Pryanali Linardo', email: 'iswadi.linardo@id.hcs.com' },
  { name: 'Julia Rizky Utami', email: 'julia.utami@id.hcs.com' },
  { name: 'Jullia Gracia Roberta Agu', email: 'jullia.agu@id.hcs.com' },
  { name: 'Kharisma', email: 'kharisma.kharisma@id.hcs.com' },
  { name: 'Kuk Joo Jang', email: 'kukjoo.jang@id.hcs.com' },
  { name: 'Kunpil', email: 'kunpil.cho@id.hcs.com' },
  { name: 'Lailatusyifa', email: 'lailatusyifa.lailatusyifa@id.hcs.com' },
  { name: 'Mangapul Berthin Prima Manik', email: 'prima.manik@id.hcs.com' },
  { name: 'Marianus T. Pranatal Bantrang', email: 'marianus.bantrang@id.hcs.com' },
  { name: 'Mario Aditya', email: 'mario.aditya@id.hcs.com' },
  { name: 'Meistany Pratiwi Lumban Raja', email: 'meistany.pratiwi@id.hcs.com' },
  { name: 'Melati Putri Surakusumah', email: 'melati.putri@id.hcs.com' },
  { name: 'Muhamad Aek Nabara', email: 'muhamad.nabara@id.hcs.com' },
  { name: 'Muhamad Zicovix', email: 'm.zicovix@id.hcs.com' },
  { name: 'Nanda Damarayu', email: 'nanda.damarayu@id.hcs.com' },
  { name: 'Nicole Oesman', email: 'nicole.oesman@id.hcs.com' },
  { name: 'Niken Ayu Darmastuti', email: 'niken.darmastuti@id.hcs.com' },
  { name: 'Pulinda Paranida Sinaga', email: 'pulinda.sinaga@id.hcs.com' },
  { name: 'Pupu Puadudin', email: 'pupu.puadudin@id.hcs.com' },
  { name: 'Putri Sekar Pinasthi', email: 'putri.pinasthi@id.hcs.com' },
  { name: 'Rabbi Perangin Angin', email: 'rabbi.angin@id.hcs.com' },
  { name: 'Raditya Rayadi', email: 'raditya.rayadi@id.hcs.com' },
  { name: 'Ratry Padmaningtyas', email: 'ratry.padmaningtyas@id.hcs.com' },
  { name: 'Ricky', email: 'ricky.ricky@id.hcs.com' },
  { name: 'Riefky Rasyidi', email: 'riefky.rasyidi@id.hcs.com' },
  { name: 'Riski Dahlia', email: 'riski.dahlia@id.hcs.com' },
  { name: 'Ristra Ayu Damayanti', email: 'ristra.damayanti@id.hcs.com' },
  { name: 'Rizka Ismail', email: 'rizka.ismail@id.hcs.com' },
  { name: 'Rizka Yunidarini', email: 'rizka.yunidarini@id.hcs.com' },
  { name: 'Sandra Irianto', email: 'sandra.irianto@id.hcs.com' },
  { name: 'Santoso Dharma Tjipto', email: 'santoso.tjipto@id.hcs.com' },
  { name: 'Soon Sang Kwon', email: 'soonsang.kwon@id.hcs.com' },
  { name: 'Suli Djayanti', email: 'suli.djayanti@id.hcs.com' },
  { name: 'Syska Natalia Panjaitan', email: 'syska.natalia@id.hcs.com' },
  { name: 'Tyas Untoro', email: 'tyas.untoro@id.hcs.com' },
  { name: 'Wulan Listiani', email: 'wulan.listiani@id.hcs.com' },
  { name: 'Yusof Imaduddin Majid', email: 'yusof.imadudin@id.hcs.com' },
];

function getOptionalFileArg(): string | null {
  const idx = process.argv.indexOf('--file');
  if (idx >= 0 && process.argv[idx + 1]) {
    return resolve(process.cwd(), process.argv[idx + 1]);
  }
  return null;
}

/** Minimal RFC4180-ish CSV parser (quoted fields, commas inside quotes). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      row.push(cell);
      cell = '';
      continue;
    }
    if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    if (ch === '\r') continue;
    cell += ch;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function dedupeUsers(users: ImportUser[]): ImportUser[] {
  const byEmail = new Map<string, ImportUser>();
  for (const row of users) {
    const name = row.name.trim();
    const email = row.email.trim().toLowerCase();
    if (!name || !email || !email.includes('@')) {
      console.warn(`[skip] invalid row: ${row.name} / ${row.email}`);
      continue;
    }
    if (!byEmail.has(email)) {
      byEmail.set(email, { name, email });
    }
  }
  return [...byEmail.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || a.email.localeCompare(b.email),
  );
}

function loadUsersFromCsv(filePath: string): ImportUser[] {
  const raw = readFileSync(filePath, 'utf8');
  const rows = parseCsv(raw);
  if (rows.length === 0) {
    throw new Error(`CSV is empty: ${filePath}`);
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const nameIdx = header.indexOf('name');
  const emailIdx = header.indexOf('email');
  if (nameIdx < 0 || emailIdx < 0) {
    throw new Error('CSV must have header columns: name,email');
  }

  const parsed: ImportUser[] = [];
  for (const row of rows.slice(1)) {
    parsed.push({
      name: String(row[nameIdx] ?? ''),
      email: String(row[emailIdx] ?? ''),
    });
  }
  return dedupeUsers(parsed);
}

function resolveUsers(): { source: string; users: ImportUser[] } {
  const filePath = getOptionalFileArg();
  if (filePath) {
    return { source: `file:${filePath}`, users: loadUsersFromCsv(filePath) };
  }
  return { source: 'builtin', users: dedupeUsers(BUILTIN_USERS) };
}

function buildCsvEmployeeId(email: string): string {
  return `CSV-${Buffer.from(email).toString('base64url').slice(0, 24)}`;
}

async function generatePlaceholderPasswordHash(): Promise<string> {
  return bcrypt.hash(randomBytes(48).toString('base64url'), 10);
}

async function ensureGuestRoleId(): Promise<string> {
  const role = await prisma.role.upsert({
    where: { roleCode: GUEST_ROLE_CODE },
    update: {},
    create: GUEST_ROLE_DEFAULTS,
  });
  return role.id;
}

async function ensureUnassignedDepartmentId(): Promise<string> {
  const department = await prisma.department.upsert({
    where: { code: UNASSIGNED_DEPARTMENT_CODE },
    update: {},
    create: UNASSIGNED_DEPARTMENT_DEFAULTS,
  });
  return department.id;
}

async function resolveUniqueEmployeeId(email: string): Promise<string> {
  const candidate = buildCsvEmployeeId(email);
  const taken = await prisma.user.findUnique({
    where: { employeeId: candidate },
    select: { email: true },
  });
  if (!taken || taken.email.toLowerCase() === email) return candidate;

  return `CSV-${randomBytes(12).toString('base64url')}`;
}

async function main() {
  const { source, users } = resolveUsers();

  console.log(`Mode: ${APPLY ? 'APPLY (write DB)' : 'DRY-RUN (no writes)'}`);
  console.log(`Source: ${source}`);
  console.log(`Rows: ${users.length}`);
  console.log(`Update name on existing: ${UPDATE_NAME ? 'yes' : 'no'}`);
  console.log('');

  const [guestRoleId, unassignedDeptId] = await Promise.all([
    ensureGuestRoleId(),
    ensureUnassignedDepartmentId(),
  ]);

  const summary = {
    create: 0,
    skipExisting: 0,
    updateName: 0,
    errors: [] as { email: string; reason: string }[],
  };

  for (const row of users) {
    try {
      const existing = await prisma.user.findUnique({
        where: { email: row.email },
        select: { id: true, name: true, email: true },
      });

      if (existing) {
        if (UPDATE_NAME && existing.name !== row.name) {
          if (APPLY) {
            await prisma.user.update({
              where: { id: existing.id },
              data: { name: row.name },
            });
          }
          summary.updateName += 1;
          console.log(`[update-name] ${row.email}: "${existing.name}" → "${row.name}"`);
        } else {
          summary.skipExisting += 1;
          console.log(`[skip] ${row.email} (already exists)`);
        }
        continue;
      }

      const employeeId = await resolveUniqueEmployeeId(row.email);
      const passwordHash = await generatePlaceholderPasswordHash();

      if (APPLY) {
        await prisma.user.create({
          data: {
            name: row.name,
            email: row.email,
            employeeId,
            password: passwordHash,
            roleId: guestRoleId,
            departmentId: unassignedDeptId,
            isActive: true,
            userRoles: { create: { roleId: guestRoleId } },
            access: {
              create: {
                menuAccess: restrictedMenuAccess as unknown as object,
                activityAccess: defaultActivityAccess as unknown as object,
              },
            },
          },
        });
      }

      summary.create += 1;
      console.log(`[create] ${row.name} <${row.email}> empId=${employeeId}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      summary.errors.push({ email: row.email, reason });
      console.error(`[error] ${row.email}: ${reason}`);
    }
  }

  console.log('');
  console.log('Summary:', {
    mode: APPLY ? 'apply' : 'dry-run',
    source,
    create: summary.create,
    skipExisting: summary.skipExisting,
    updateName: summary.updateName,
    errors: summary.errors.length,
  });
  if (summary.errors.length > 0) {
    console.log('Errors:', summary.errors);
  }
  if (!APPLY) {
    console.log('');
    console.log('Dry-run only. Re-run with --apply to write.');
  } else {
    console.log('');
    console.log('Next: Sync from Confins to fill EmpNo / department / job-title role.');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
