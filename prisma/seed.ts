import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import type { Prisma } from '@prisma/client';
import { fullMenuAccess, fullActivityAccess } from '../lib/default-access';

const fullAccess = {
  menuAccess: fullMenuAccess as unknown as Prisma.InputJsonValue,
  activityAccess: fullActivityAccess as unknown as Prisma.InputJsonValue,
};

async function main() {
  const dept = await prisma.department.upsert({
    where: { code: 'IT' },
    update: {},
    create: { code: 'IT', name: 'IT', description: 'Information Technology' },
  });

  const adminRole = await prisma.role.upsert({
    where: { roleCode: 'ADMIN' },
    update: {},
    create: { roleCode: 'ADMIN', roleName: 'Administrator', description: 'Full access' },
  });

  const hashedPassword = await bcrypt.hash('admin123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@workxpace.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@workxpace.com',
      password: hashedPassword,
      roleId: adminRole.id,
      departmentId: dept.id,
      employeeId: 'EMP001',
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  await prisma.userAccess.upsert({
    where: { userId: adminUser.id },
    update: fullAccess,
    create: { userId: adminUser.id, ...fullAccess },
  });

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

  let approvalSchemaBP = await prisma.approvalSchema.findFirst({
    where: { name: 'Primary Scheme for Budget Plan', departmentId: dept.id },
  });
  if (!approvalSchemaBP) {
    approvalSchemaBP = await prisma.approvalSchema.create({
      data: {
        name: 'Primary Scheme for Budget Plan',
        type: 'BudgetPlan',
        period: 'Unlimited',
        departmentId: dept.id,
      },
    });
  }

  let approvalSchemaBR = await prisma.approvalSchema.findFirst({
    where: { name: 'Primary Scheme for Budget Request', departmentId: dept.id },
  });
  if (!approvalSchemaBR) {
    approvalSchemaBR = await prisma.approvalSchema.create({
      data: {
        name: 'Primary Scheme for Budget Request',
        type: 'BudgetRequest',
        period: 'Unlimited',
        departmentId: dept.id,
      },
    });
  }

  const fmRole = await prisma.role.upsert({
    where: { roleCode: 'FM' },
    update: {},
    create: { roleCode: 'FM', roleName: 'Finance Manager', description: 'Finance Manager' },
  });

  const ceoRole = await prisma.role.upsert({
    where: { roleCode: 'CEO' },
    update: {},
    create: { roleCode: 'CEO', roleName: 'CEO', description: 'Chief Executive Officer' },
  });

  const existingLevels = await prisma.approvalLevel.count();
  if (existingLevels === 0) {
    await prisma.approvalLevel.createMany({
      data: [
        { schemaId: approvalSchemaBP.id, stepOrder: 1, levelType: 'Reviewer', roleId: fmRole.id },
        { schemaId: approvalSchemaBP.id, stepOrder: 2, levelType: 'Approver', roleId: ceoRole.id },
        { schemaId: approvalSchemaBR.id, stepOrder: 1, levelType: 'Reviewer', roleId: fmRole.id },
        { schemaId: approvalSchemaBR.id, stepOrder: 2, levelType: 'Approver', roleId: ceoRole.id },
      ],
    });
  }

  console.log('Seed completed. Admin: admin@workxpace.com / admin123');
  console.log('Project:', project.code);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
