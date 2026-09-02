import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBudgetPlanImportWorkbookBuffer } from '../lib/budget-plans/bulk-import-template';

const output = join(
  dirname(fileURLToPath(import.meta.url)),
  '../public/templates/Template_Bulk_Import_Budget_Plan.xlsx',
);

writeFileSync(output, buildBudgetPlanImportWorkbookBuffer());
console.log(`Wrote ${output}`);
