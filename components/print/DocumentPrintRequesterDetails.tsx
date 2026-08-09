import RichTextContent from '../ui/RichTextContent';

const DEFAULT_COMPANY_NAME = 'PT Hyundai Capital Finance Indonesia';

export type DocumentPrintRequesterDetailsProps = {
  date: string;
  teamName: string;
  subject: string;
  /** Mapped to Purpose — typically request description. */
  purpose?: string | null;
  /** Mapped to Plan — typically notes (rich text HTML). */
  plan?: string | null;
  companyName?: string;
  className?: string;
};

function formatDotDate(date: string): string {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

/** Right + bottom edges only — pairs with border-separate so dividers always paint in print/PDF. */
const cell = 'border-b border-r border-gray-400 px-2 py-2 text-left text-sm align-middle';
const cellLastCol = 'border-b border-gray-400 px-2 py-2 text-left text-sm align-middle';

/**
 * Requester detail block for print/PDF: Date + Team Name, Subject, Purpose, Plan, company footer.
 *
 * Uses border-separate (not collapse) so horizontal rules between Subject/Purpose/Plan
 * remain visible — border-collapse + colspan often drops those edges in Chrome print.
 * Plan row is breakable across pages; table-fixed keeps width within the page.
 */
export default function DocumentPrintRequesterDetails({
  date,
  teamName,
  subject,
  purpose,
  plan,
  companyName = DEFAULT_COMPANY_NAME,
  className = '',
}: DocumentPrintRequesterDetailsProps) {
  return (
    <table
      className={`w-full max-w-full table-fixed border-separate border-spacing-0 border border-gray-400 text-xs text-gray-900 ${className}`}
      role="presentation"
    >
      <colgroup>
        <col className="w-[16%]" />
        <col className="w-[34%]" />
        <col className="w-[16%]" />
        <col className="w-[34%]" />
      </colgroup>
      <tbody>
        <tr>
          <td className={`${cell} text-gray-800`}>Date</td>
          <td className={`${cell} text-gray-900`}>{formatDotDate(date)}</td>
          <td className={`${cell} text-gray-800`}>Team Name</td>
          <td className={`${cellLastCol} text-gray-900`}>{teamName || '-'}</td>
        </tr>
        <tr>
          <td className={`${cell} text-gray-800`}>Subject</td>
          <td colSpan={3} className={`${cellLastCol} break-words text-gray-900`}>
            {subject || '-'}
          </td>
        </tr>
        <tr>
          <td className={`${cell} text-gray-800`}>Purpose</td>
          <td colSpan={3} className={`${cellLastCol} break-words text-gray-900`}>
            {purpose?.trim() ? purpose : '-'}
          </td>
        </tr>
        <tr className="print-row-breakable">
          <td className={`${cell} align-top text-gray-800`}>Plan</td>
          <td
            colSpan={3}
            className={`${cellLastCol} align-top break-words text-gray-900`}
          >
            <div className="min-w-0 max-w-full overflow-hidden break-words [overflow-wrap:anywhere]">
              {plan?.trim() ? (
                <RichTextContent
                  value={plan}
                  className="max-w-full text-xs [&_p]:my-1 [&_table]:w-full [&_table]:max-w-full [&_table]:table-fixed [&_td]:break-words [&_th]:break-words"
                />
              ) : (
                '-'
              )}
            </div>
          </td>
        </tr>
        <tr>
          <td colSpan={4} className="px-2 py-3 text-center text-sm font-semibold">
            {companyName}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
