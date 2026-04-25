import { prisma } from '@/lib/prisma';
import { ConfinsClient } from './client';

type ConfinsDepartment = {
  BizUnitCode: string;
  BizUnitName: string;
  IsActive: boolean;
};

type ConfinsOffice = {
  OfficeCode: string;
  OfficeName: string;
  OfficeAddr?: string | null;
  MrOfficeTypeCode?: string | null;
  IsActive: boolean;
};

export type OriginOfficeOption = {
  code: string;
  name: string;
  address: string | null;
  officeType: string | null;
  isActive: boolean;
};

export type SyncSummary = {
  sourceCount: number;
  created: number;
  updated: number;
  deactivated: number;
};

const syncDescription = (source: string) => `Synced from Confins (${source})`;

export class ConfinsMasterSyncService {
  constructor(private readonly client: ConfinsClient) {}

  private async postWithFallback<T>(
    paths: string[],
    body: Record<string, unknown>
  ): Promise<T[]> {
    let lastError: unknown = null;
    for (const path of paths) {
      try {
        return await this.client.post<T>({ path, body });
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Confins request failed');
  }

  async syncDepartments(): Promise<SyncSummary> {
    const departmentPaths = [
      process.env.CONFINS_DEPARTMENT_PATH || '/v1/IntegrationEBudgetingX/GetListRefBizUnitByIsActiveX',
      '/v1/RefBizUnitX/GetListRefBizUnitByIsActiveX',
    ];
    const rows = await this.postWithFallback<ConfinsDepartment>(departmentPaths, { IsActive: '0' });

    let created = 0;
    let updated = 0;
    let deactivated = 0;

    for (const row of rows) {
      const code = String(row.BizUnitCode || '').trim();
      const name = String(row.BizUnitName || '').trim();
      if (!code || !name) continue;

      const existing = await prisma.department.findUnique({ where: { code } });
      if (!existing) {
        await prisma.department.create({
          data: {
            code,
            name,
            description: syncDescription('department'),
          },
        });
        created += 1;
        continue;
      }

      await prisma.department.update({
        where: { id: existing.id },
        data: {
          name,
          description: syncDescription('department'),
        },
      });
      updated += 1;
      if (row.IsActive === false) deactivated += 1;
    }

    return {
      sourceCount: rows.length,
      created,
      updated,
      deactivated,
    };
  }

  async syncCostCenters(): Promise<SyncSummary> {
    const officePaths = [
      process.env.CONFINS_OFFICE_PATH || '/v1/IntegrationEBudgetingX/GetListRefOfficeByIsActiveX',
      '/v1/RefOfficeX/GetListRefOfficeByIsActiveX',
    ];
    const rows = await this.postWithFallback<ConfinsOffice>(officePaths, { IsActive: '0' });

    let created = 0;
    let updated = 0;
    let deactivated = 0;

    for (const row of rows) {
      const officeCode = String(row.OfficeCode || '').trim();
      const officeName = String(row.OfficeName || '').trim();
      if (!officeCode || !officeName) continue;

      const name = `${officeCode} - ${officeName}`;
      const description = [row.OfficeAddr, row.MrOfficeTypeCode]
        .filter(Boolean)
        .join(' | ') || syncDescription('cost-center');

      const existing = await prisma.costCenterMaster.findUnique({ where: { name } });
      if (!existing) {
        await prisma.costCenterMaster.create({
          data: {
            name,
            description,
            isActive: Boolean(row.IsActive),
          },
        });
        created += 1;
        if (row.IsActive === false) deactivated += 1;
        continue;
      }

      await prisma.costCenterMaster.update({
        where: { id: existing.id },
        data: {
          description,
          isActive: Boolean(row.IsActive),
        },
      });
      updated += 1;
      if (row.IsActive === false) deactivated += 1;
    }

    return {
      sourceCount: rows.length,
      created,
      updated,
      deactivated,
    };
  }

  async getOriginOfficesFromApi(): Promise<OriginOfficeOption[]> {
    const officePaths = [
      process.env.CONFINS_OFFICE_PATH || '/v1/IntegrationEBudgetingX/GetListRefOfficeByIsActiveX',
      '/v1/RefOfficeX/GetListRefOfficeByIsActiveX',
    ];
    const rows = await this.postWithFallback<ConfinsOffice>(officePaths, { IsActive: '0' });

    return rows
      .map((row) => ({
        code: String(row.OfficeCode || '').trim(),
        name: String(row.OfficeName || '').trim(),
        address: row.OfficeAddr?.trim() || null,
        officeType: row.MrOfficeTypeCode?.trim() || null,
        isActive: Boolean(row.IsActive),
      }))
      .filter((row) => row.code && row.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async syncOriginOffices(): Promise<SyncSummary> {
    const offices = await this.getOriginOfficesFromApi();

    let created = 0;
    let updated = 0;
    let deactivated = 0;

    for (const office of offices) {
      const existing = await prisma.originOfficeMaster.findUnique({
        where: { code: office.code },
      });
      if (!existing) {
        await prisma.originOfficeMaster.create({
          data: {
            code: office.code,
            name: office.name,
            address: office.address,
            officeType: office.officeType,
            isActive: office.isActive,
          },
        });
        created += 1;
      } else {
        await prisma.originOfficeMaster.update({
          where: { id: existing.id },
          data: {
            name: office.name,
            address: office.address,
            officeType: office.officeType,
            isActive: office.isActive,
          },
        });
        updated += 1;
      }

      if (!office.isActive) deactivated += 1;
    }

    return {
      sourceCount: offices.length,
      created,
      updated,
      deactivated,
    };
  }
}
