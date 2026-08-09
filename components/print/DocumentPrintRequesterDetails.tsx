import RichTextContent from "../ui/RichTextContent";

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
      className={`w-full border-separate border-spacing-0 border border-gray-400 text-xs text-gray-900 ${className}`}
      role="presentation"
    >
      <tbody>
        <tr>
          <td className={`w-[16%] ${cell} text-gray-800`}>Date</td>
          <td className={`w-[34%] ${cell} text-gray-900`}>{formatDotDate(date)}</td>
          <td className={`w-[16%] ${cell} text-gray-800`}>Team Name</td>
          <td className={`w-[34%] ${cellLastCol} text-gray-900`}>{teamName || '-'}</td>
        </tr>
        <tr>
          <td className={`${cell} text-gray-800`}>Subject</td>
          <td colSpan={3} className={`${cellLastCol} text-gray-900`}>
            {subject || '-'}
          </td>
        </tr>
        <tr>
          <td className={`${cell} text-gray-800`}>Purpose</td>
          <td colSpan={3} className={`${cellLastCol} text-gray-900`}>
            {purpose?.trim() ? purpose : '-'}
          </td>
        </tr>
        <tr>
          <td className={`${cell} align-top text-gray-800`}>Plan</td>
          <td colSpan={3} className={`${cellLastCol} align-top whitespace-pre-wrap text-gray-900`}>
            <span className="text-xs min-h-80 block">
              {plan?.trim() ? <RichTextContent value={plan} /> : '-'}
            </span>
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
