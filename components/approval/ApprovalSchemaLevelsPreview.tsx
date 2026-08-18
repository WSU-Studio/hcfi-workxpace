'use client';

import {
  Table,
  TableBodyRow,
  TableCell,
  TableHead,
  TableHeaderRow,
} from '@/components/ui/Table';
import { schemaLevelPicDisplayName, type ApprovalLevelOption } from '@/lib/approval-schema';

export interface ApprovalSchemaLevelsPreviewProps {
  levels: ApprovalLevelOption[];
  className?: string;
}

export default function ApprovalSchemaLevelsPreview({
  levels,
  className = '',
}: ApprovalSchemaLevelsPreviewProps) {
  if (levels.length === 0) return null;

  return (
    <div className={className}>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <Table>
          <thead>
            <TableHeaderRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Specific PIC</TableHead>
            </TableHeaderRow>
          </thead>
          <tbody>
            {levels.map((level, index) => (
              <TableBodyRow key={`${level.stepOrder}-${level.levelType}-${index}`}>
                <TableCell>{level.stepOrder}</TableCell>
                <TableCell>{level.role?.roleName ?? '-'}</TableCell>
                <TableCell>{level.levelType}</TableCell>
                <TableCell>{schemaLevelPicDisplayName(level.pics)}</TableCell>
              </TableBodyRow>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
