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
    update: {
      name: 'Admin User',
      password: hashedPassword,
      roleId: adminRole.id,
      departmentId: dept.id,
      isActive: true,
    },
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
    where: { name: 'Primary Schema for Budget Plan', departmentId: dept.id },
  });
  if (!approvalSchemaBP) {
    approvalSchemaBP = await prisma.approvalSchema.create({
      data: {
        name: 'Primary Schema for Budget Plan',
        type: 'BudgetPlan',
        period: 'Unlimited',
        departmentId: dept.id,
      },
    });
  }

  let approvalSchemaBR = await prisma.approvalSchema.findFirst({
    where: { name: 'Primary Schema for Budget Request', departmentId: dept.id },
  });
  if (!approvalSchemaBR) {
    approvalSchemaBR = await prisma.approvalSchema.create({
      data: {
        name: 'Primary Schema for Budget Request',
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

  const commonPassword = await bcrypt.hash('password123', 10);

  const requestorUser = await prisma.user.upsert({
    where: { email: 'requestor@workxpace.com' },
    update: {
      name: 'Requestor IT',
      password: commonPassword,
      roleId: adminRole.id,
      departmentId: dept.id,
      isActive: true,
    },
    create: {
      name: 'Requestor IT',
      email: 'requestor@workxpace.com',
      password: commonPassword,
      roleId: adminRole.id,
      departmentId: dept.id,
      employeeId: 'EMP002',
    },
  });

  const reviewerUser = await prisma.user.upsert({
    where: { email: 'reviewer.fm@workxpace.com' },
    update: {
      name: 'Reviewer FM',
      password: commonPassword,
      roleId: fmRole.id,
      departmentId: dept.id,
      isActive: true,
    },
    create: {
      name: 'Reviewer FM',
      email: 'reviewer.fm@workxpace.com',
      password: commonPassword,
      roleId: fmRole.id,
      departmentId: dept.id,
      employeeId: 'EMP003',
    },
  });

  const approverUser = await prisma.user.upsert({
    where: { email: 'approver.ceo@workxpace.com' },
    update: {
      name: 'Approver CEO',
      password: commonPassword,
      roleId: ceoRole.id,
      departmentId: dept.id,
      isActive: true,
    },
    create: {
      name: 'Approver CEO',
      email: 'approver.ceo@workxpace.com',
      password: commonPassword,
      roleId: ceoRole.id,
      departmentId: dept.id,
      employeeId: 'EMP004',
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: reviewerUser.id, roleId: fmRole.id } },
    update: {},
    create: { userId: reviewerUser.id, roleId: fmRole.id },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: requestorUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: requestorUser.id, roleId: adminRole.id },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: approverUser.id, roleId: ceoRole.id } },
    update: {},
    create: { userId: approverUser.id, roleId: ceoRole.id },
  });

  await prisma.userAccess.upsert({
    where: { userId: requestorUser.id },
    update: fullAccess,
    create: { userId: requestorUser.id, ...fullAccess },
  });

  await prisma.userAccess.upsert({
    where: { userId: reviewerUser.id },
    update: fullAccess,
    create: { userId: reviewerUser.id, ...fullAccess },
  });

  await prisma.userAccess.upsert({
    where: { userId: approverUser.id },
    update: fullAccess,
    create: { userId: approverUser.id, ...fullAccess },
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

  console.log('Seed completed. Admin: admin@workxpace.com / admin123');
  console.log('Requestor: requestor@workxpace.com / password123');
  console.log('Reviewer (FM): reviewer.fm@workxpace.com / password123');
  console.log('Approver (CEO): approver.ceo@workxpace.com / password123');
  console.log('Project:', project.code);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
