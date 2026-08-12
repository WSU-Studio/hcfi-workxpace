const DEFAULT_CITY = 'Jakarta';

export type PaymentRequestPrintHeaderProps = {
  preparedBy: string;
  department: string;
  purposeDescription: string;
  originOffice: string;
  expenseType?: string | null;
  vendorInvoiceNo?: string | null;
  dateNeeded?: string | null;
  requestDate: string;
  className?: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatJakartaDate(date: string): string {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  return `${pad2(d.getDate())} / ${pad2(d.getMonth() + 1)} / ${d.getFullYear()}`;
}

function formatDotDate(date: string | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
}

function formatOriginOfficeLabel(originOffice: string): string {
  const value = originOffice.trim();
  if (!value || value.toUpperCase() === 'HQ') return 'Head Office';
  return value;
}

function isOpex(expenseType?: string | null): boolean {
  return (expenseType ?? '').toUpperCase() === 'OPEX';
}

function isCapex(expenseType?: string | null): boolean {
  return (expenseType ?? '').toUpperCase() === 'CAPEX';
}

function PrintCheckbox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-flex h-3.5 w-3.5 items-center justify-center border border-gray-700 text-[10px] leading-none"
        aria-hidden
      >
        {checked ? '✓' : ''}
      </span>
      <span>{label}</span>
    </span>
  );
}

const cell = 'border border-gray-400 px-2 py-1.5 text-left text-xs align-middle';

/**
 * Hyundai Payment Request Form header for print/PDF.
 * Separate from Budget Request's Number/Classification header.
 */
export default function PaymentRequestPrintHeader({
  preparedBy,
  department,
  purposeDescription,
  originOffice,
  expenseType,
  vendorInvoiceNo,
  dateNeeded,
  requestDate,
  className = '',
}: PaymentRequestPrintHeaderProps) {
  return (
    <div className={`w-full max-w-full text-gray-900 ${className}`}>
      <h2 className="mb-4 text-center text-base font-bold tracking-tight">Payment Request Form</h2>

      <table
        className="w-full max-w-full table-fixed border-collapse border-spacing-0 border border-gray-400 text-xs"
        role="presentation"
      >
        <colgroup>
          <col className="w-[20%]" />
          <col className="w-[30%]" />
          <col className="w-[50%]" />
        </colgroup>
        <tbody>
          <tr>
            <td colSpan={3} className={`${cell} text-right`}>
              <span>
                {DEFAULT_CITY}, {formatJakartaDate(requestDate)}
              </span>
            </td>
          </tr>
          <tr>
            <td colSpan={2} className={cell}>
              <span className="font-semibold">Prepared by :</span> {preparedBy || '-'}
            </td>
            <td className={cell}>
              <span className="font-semibold">Department :</span> {department || '-'}
            </td>
          </tr>
          <tr>
            <td colSpan={3} className={`${cell}`}>
              <div className="min-h-10">
                <span className="font-semibold">Purpose Description :</span>{' '}
                {purposeDescription?.trim() || '-'}
              </div>
            </td>
          </tr>
          <tr>
            <td className={cell}>
              <span className="font-semibold">Origin Office</span>
            </td>
            <td className={cell}>
              {formatOriginOfficeLabel(originOffice)}
            </td>
            <td className={cell}>
              <span className="inline-flex w-full items-center justify-end gap-4">
                <PrintCheckbox checked={isCapex(expenseType)} label="CAPEX" />
                <PrintCheckbox checked={isOpex(expenseType)} label="OPEX" />
              </span>
            </td>
          </tr>
          <tr>
            <td className={cell}>
              <span className="font-semibold">Vendor Invoice No.</span>
            </td>
            <td className={cell}>
              {vendorInvoiceNo?.trim() || '-'}
            </td>
            <td className={cell}>
              <span className="inline-flex w-full items-center justify-end gap-2">
                <span className="font-semibold">Date Needed :</span>
                <span>{formatDotDate(dateNeeded)}</span>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
