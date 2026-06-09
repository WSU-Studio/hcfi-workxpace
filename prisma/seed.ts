import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { fullMenuAccess, fullActivityAccess } from '../lib/default-access';

// `UserAccess.menuAccess`/`.activityAccess` are Prisma JSON columns. We feed
// plain object literals; cast through `unknown` keeps strict TS happy without
// pulling a Prisma JSON type that has shifted across versions.
const fullAccess = {
  menuAccess: fullMenuAccess as unknown as object,
  activityAccess: fullActivityAccess as unknown as object,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (SOLID: each does one thing, all idempotent — safe to re-run seed)
// ─────────────────────────────────────────────────────────────────────────────

interface RoleSeed {
  roleCode: string;
  roleName: string;
  description: string;
}

async function upsertRole(input: RoleSeed) {
  return prisma.role.upsert({
    where: { roleCode: input.roleCode },
    update: {},
    create: input,
  });
}

interface UserSeed {
  email: string;
  name: string;
  employeeId: string;
  roleId: string;
  departmentId: string;
}

/**
 * Upsert a user, attach their primary role to the userRole join table, and
 * grant them full menu/activity access. Single helper so seed entries don't
 * drift on which side-effects they perform.
 */
async function upsertUserWithAccess(seed: UserSeed, hashedPassword: string) {
  const user = await prisma.user.upsert({
    where: { email: seed.email },
    update: {
      name: seed.name,
      password: hashedPassword,
      roleId: seed.roleId,
      departmentId: seed.departmentId,
      isActive: true,
    },
    create: {
      ...seed,
      password: hashedPassword,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: seed.roleId } },
    update: {},
    create: { userId: user.id, roleId: seed.roleId },
  });

  await prisma.userAccess.upsert({
    where: { userId: user.id },
    update: fullAccess,
    create: { userId: user.id, ...fullAccess },
  });

  return user;
}

interface ApprovalLevelSeed {
  levelType: 'Reviewer' | 'Approver';
  roleId: string;
}

interface ApprovalSchemaSeed {
  name: string;
  type: 'BudgetPlan' | 'BudgetRequest' | 'PaymentRequest';
  departmentId: string;
  /** Ordered list — first entry = step 1; last entry should be `'Approver'`. */
  levels: ApprovalLevelSeed[];
}

/**
 * Create-or-find an approval schema, then ensure its levels exist. Levels are
 * only seeded if the schema currently has zero levels — so admins who later
 * tweak a schema via the UI won't have their changes overwritten on reseed.
 */
async function upsertApprovalSchemaWithLevels(seed: ApprovalSchemaSeed) {
  let schema = await prisma.approvalSchema.findFirst({
    where: { name: seed.name, departmentId: seed.departmentId, type: seed.type },
  });
  if (!schema) {
    schema = await prisma.approvalSchema.create({
      data: {
        name: seed.name,
        type: seed.type,
        period: 'Unlimited',
        departmentId: seed.departmentId,
      },
    });
  }

  const existingLevelCount = await prisma.approvalLevel.count({
    where: { schemaId: schema.id },
  });
  if (existingLevelCount === 0) {
    await prisma.approvalLevel.createMany({
      data: seed.levels.map((level, idx) => ({
        schemaId: schema!.id,
        stepOrder: idx + 1,
        levelType: level.levelType,
        roleId: level.roleId,
      })),
    });
  }

  return schema;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  // Department
  const dept = await prisma.department.upsert({
    where: { code: 'IT' },
    update: {},
    create: { code: 'IT', name: 'IT', description: 'Information Technology' },
  });

  // ── Roles ────────────────────────────────────────────────────────────────
  // Existing tiers
  const adminRole = await upsertRole({
    roleCode: 'ADMIN',
    roleName: 'Administrator',
    description: 'Full access',
  });
  const fmRole = await upsertRole({
    roleCode: 'FM',
    roleName: 'Finance Manager',
    description: 'Finance Manager — mid-tier reviewer',
  });
  const ceoRole = await upsertRole({
    roleCode: 'CEO',
    roleName: 'CEO',
    description: 'Chief Executive Officer — top-tier approver',
  });
  // New tiers for richer multi-step approval scenarios
  const spvRole = await upsertRole({
    roleCode: 'SPV',
    roleName: 'Supervisor',
    description: 'Team supervisor — first reviewer in extended schemas',
  });
  const dhRole = await upsertRole({
    roleCode: 'DH',
    roleName: 'Department Head',
    description: 'Department head — second-tier reviewer',
  });
  const dirRole = await upsertRole({
    roleCode: 'DIR',
    roleName: 'Director',
    description: 'Director — senior approver tier (below CEO)',
  });

  // ── Passwords ────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin123', 10);
  const commonPassword = await bcrypt.hash('password123', 10);

  // ── Users ────────────────────────────────────────────────────────────────
  // Admin (separate password to keep historical login working)
  await upsertUserWithAccess(
    {
      email: 'admin@workxpace.com',
      name: 'Admin User',
      employeeId: 'EMP001',
      roleId: adminRole.id,
      departmentId: dept.id,
    },
    adminPassword,
  );

  // 3 Requestors — all admin-role + IT dept so they share submission powers
  await upsertUserWithAccess(
    {
      email: 'requestor@workxpace.com',
      name: 'Requestor IT',
      employeeId: 'EMP002',
      roleId: adminRole.id,
      departmentId: dept.id,
    },
    commonPassword,
  );
  await upsertUserWithAccess(
    {
      email: 'requestor.2@workxpace.com',
      name: 'Requestor IT 2',
      employeeId: 'EMP010',
      roleId: adminRole.id,
      departmentId: dept.id,
    },
    commonPassword,
  );
  await upsertUserWithAccess(
    {
      email: 'requestor.3@workxpace.com',
      name: 'Requestor IT 3',
      employeeId: 'EMP011',
      roleId: adminRole.id,
      departmentId: dept.id,
    },
    commonPassword,
  );

  // 3 Reviewers — distinct roles so multi-step schemas can chain through them
  await upsertUserWithAccess(
    {
      email: 'reviewer.fm@workxpace.com',
      name: 'Reviewer FM',
      employeeId: 'EMP003',
      roleId: fmRole.id,
      departmentId: dept.id,
    },
    commonPassword,
  );
  await upsertUserWithAccess(
    {
      email: 'reviewer.spv@workxpace.com',
      name: 'Reviewer SPV',
      employeeId: 'EMP012',
      roleId: spvRole.id,
      departmentId: dept.id,
    },
    commonPassword,
  );
  await upsertUserWithAccess(
    {
      email: 'reviewer.dh@workxpace.com',
      name: 'Reviewer DH',
      employeeId: 'EMP013',
      roleId: dhRole.id,
      departmentId: dept.id,
    },
    commonPassword,
  );

  // 3 Approvers — distinct roles so different schemas can end at different ranks.
  // Note: `Approver FM` shares the FM role with `Reviewer FM`, which is intentional
  // so QA can validate the "multiple users hold the same role" code path.
  await upsertUserWithAccess(
    {
      email: 'approver.ceo@workxpace.com',
      name: 'Approver CEO',
      employeeId: 'EMP004',
      roleId: ceoRole.id,
      departmentId: dept.id,
    },
    commonPassword,
  );
  await upsertUserWithAccess(
    {
      email: 'approver.dir@workxpace.com',
      name: 'Approver DIR',
      employeeId: 'EMP014',
      roleId: dirRole.id,
      departmentId: dept.id,
    },
    commonPassword,
  );
  await upsertUserWithAccess(
    {
      email: 'approver.fm@workxpace.com',
      name: 'Approver FM',
      employeeId: 'EMP015',
      roleId: fmRole.id,
      departmentId: dept.id,
    },
    commonPassword,
  );

  // ── Fiscal year & project ────────────────────────────────────────────────
  await prisma.fiscalYear.upsert({
    where: { year: 2026 },
    update: {},
    create: { year: 2026, isActive: true },
  });

  const project = await prisma.project.upsert({
    where: { code: 'B1' },
    update: {},
    create: { code: 'B1', name: 'B1 - Non Project' },
  });

  // ── Approval schemas ─────────────────────────────────────────────────────
  // For every entity type (BudgetPlan / BudgetRequest / PaymentRequest) we
  // ship three flavours so QA can pick the depth needed:
  //
  //   Primary (2 steps): FM(R) → CEO(A)            — baseline
  //   3-Step           : SPV(R) → FM(R) → DIR(A)   — alternate final approver (Director)
  //   4-Step           : SPV(R) → DH(R) → FM(R) → CEO(A) — full ladder
  //
  // The non-final steps are always 'Reviewer'; the final step is 'Approver'.
  type EntityType = ApprovalSchemaSeed['type'];
  const ENTITY_TYPES: EntityType[] = ['BudgetPlan', 'BudgetRequest', 'PaymentRequest'];
  const LABEL_BY_TYPE: Record<EntityType, string> = {
    BudgetPlan: 'Budget Plan',
    BudgetRequest: 'Budget Request',
    PaymentRequest: 'Payment Request',
  };

  for (const type of ENTITY_TYPES) {
    const label = LABEL_BY_TYPE[type];

    await upsertApprovalSchemaWithLevels({
      name: `Primary Schema for ${label}`,
      type,
      departmentId: dept.id,
      levels: [
        { levelType: 'Reviewer', roleId: fmRole.id },
        { levelType: 'Approver', roleId: ceoRole.id },
      ],
    });

    await upsertApprovalSchemaWithLevels({
      name: `3-Step Schema for ${label}`,
      type,
      departmentId: dept.id,
      levels: [
        { levelType: 'Reviewer', roleId: spvRole.id },
        { levelType: 'Reviewer', roleId: fmRole.id },
        { levelType: 'Approver', roleId: dirRole.id },
      ],
    });

    await upsertApprovalSchemaWithLevels({
      name: `4-Step Schema for ${label}`,
      type,
      departmentId: dept.id,
      levels: [
        { levelType: 'Reviewer', roleId: spvRole.id },
        { levelType: 'Reviewer', roleId: dhRole.id },
        { levelType: 'Reviewer', roleId: fmRole.id },
        { levelType: 'Approver', roleId: ceoRole.id },
      ],
    });
  }

  // ── Master data ──────────────────────────────────────────────────────────
  const opexNames = ['ALL', 'Fixed', 'Variable'];
  for (const name of opexNames) {
    await prisma.opexMaster.upsert({
      where: { name },
      update: {},
      create: { name, isActive: true },
    });
  }

  const opexAllocationNames = ['ALL', 'IT', 'HRGA', 'Sales'];
  for (const name of opexAllocationNames) {
    await prisma.opexAllocationMaster.upsert({
      where: { name },
      update: {},
      create: { name, isActive: true },
    });
  }

  const categorySeeds = [
    { name: 'Monthly Cost', description: 'Recurring monthly expense category' },
    { name: 'Operational Cost', description: 'Operational day-to-day expense category' },
  ];
  for (const category of categorySeeds) {
    await prisma.categoryMaster.upsert({
      where: { name: category.name },
      update: { description: category.description, isActive: true },
      create: { ...category, isActive: true },
    });
  }

  const costCenterSeeds = [
    { name: 'IT', description: 'Information Technology cost center' },
    { name: 'HRGA', description: 'Human Resources and General Affairs cost center' },
    { name: 'Sales', description: 'Sales cost center' },
  ];
  for (const costCenter of costCenterSeeds) {
    await prisma.costCenterMaster.upsert({
      where: { name: costCenter.name },
      update: { description: costCenter.description, isActive: true },
      create: { ...costCenter, isActive: true },
    });
  }

  const originOfficeSeeds = [
    { code: '99', name: 'HEAD OFFICE', officeType: 'HO', address: 'SEQUIS LIFE SCBD DISTRICT 8' },
    { code: '11', name: 'DKI JAKARTA', officeType: 'BRANCH', address: 'RUKO PLAZA PONDOK INDAH' },
    { code: '12', name: 'TANGERANG', officeType: 'BRANCH', address: 'RUKO NORTHRIDGE BUSINESS CENTER' },
  ];
  const originOfficeMaster = (prisma as unknown as {
    originOfficeMaster: {
      upsert: (args: {
        where: { code: string };
        update: { code: string; name: string; officeType: string; address: string; isActive: boolean };
        create: { code: string; name: string; officeType: string; address: string; isActive: boolean };
      }) => Promise<unknown>;
    };
  }).originOfficeMaster;
  for (const originOffice of originOfficeSeeds) {
    await originOfficeMaster.upsert({
      where: { code: originOffice.code },
      update: { ...originOffice, isActive: true },
      create: { ...originOffice, isActive: true },
    });
  }

  const categoryKeyIndexSeeds = [
    { name: 'CKI-01', description: 'Default category key index 01' },
    { name: 'CKI-02', description: 'Default category key index 02' },
  ];
  for (const categoryKeyIndex of categoryKeyIndexSeeds) {
    await prisma.categoryKeyIndexMaster.upsert({
      where: { name: categoryKeyIndex.name },
      update: { description: categoryKeyIndex.description, isActive: true },
      create: { ...categoryKeyIndex, isActive: true },
    });
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('Seed completed.');
  console.log('');
  console.log('Admin (own password):');
  console.log('  admin@workxpace.com / admin123');
  console.log('');
  console.log('Common password for everyone below: password123');
  console.log('');
  console.log('Requestors (3, ADMIN role, dept IT):');
  console.log('  - requestor@workxpace.com         (Requestor IT)');
  console.log('  - requestor.2@workxpace.com       (Requestor IT 2)');
  console.log('  - requestor.3@workxpace.com       (Requestor IT 3)');
  console.log('');
  console.log('Reviewers (3, distinct roles, dept IT):');
  console.log('  - reviewer.fm@workxpace.com       (Reviewer FM,  role FM)');
  console.log('  - reviewer.spv@workxpace.com      (Reviewer SPV, role SPV)');
  console.log('  - reviewer.dh@workxpace.com       (Reviewer DH,  role DH)');
  console.log('');
  console.log('Approvers (3, distinct roles, dept IT):');
  console.log('  - approver.ceo@workxpace.com      (Approver CEO, role CEO)');
  console.log('  - approver.dir@workxpace.com      (Approver DIR, role DIR)');
  console.log('  - approver.fm@workxpace.com       (Approver FM,  role FM — shares role with Reviewer FM)');
  console.log('');
  console.log('Approval schemas seeded for each entity type (BudgetPlan / BudgetRequest / PaymentRequest):');
  console.log('  - Primary Schema for X    (2 steps): FM(R) → CEO(A)');
  console.log('  - 3-Step Schema for X     (3 steps): SPV(R) → FM(R) → DIR(A)');
  console.log('  - 4-Step Schema for X     (4 steps): SPV(R) → DH(R) → FM(R) → CEO(A)');
  console.log('');
  console.log('Project:', project.code);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
