type DocumentPrintHeaderProps = {
  number: string;
  title: string;
  classification: string;
  sectionLabel?: string;
  className?: string;
};

/**
 * Formal bordered document header for print/PDF layouts.
 * Single responsibility: render Number | Title | Classification + optional section bar.
 *
 * Left/right columns are stacked inside one cell (not rowspan + separate rows) so the
 * horizontal divider always paints — border-collapse + rowspan often drops that edge
 * in Chrome print and html2canvas PDF export.
 */
export default function DocumentPrintHeader({
  number,
  title,
  classification,
  sectionLabel,
  className = '',
}: DocumentPrintHeaderProps) {
  return (
    <table
      className={`w-full border-collapse border border-gray-400 text-center text-sm text-gray-900 ${className}`}
      role="presentation"
    >
      <tbody>
        <tr>
          <td className="w-[28%] border border-gray-400 p-0 align-middle">
            <div className="border-b border-gray-400 px-2 py-1.5 text-gray-500">Number</div>
            <div className="px-2 py-2 font-medium break-all">{number}</div>
          </td>
          <td className="w-[44%] border border-gray-400 px-3 py-4 text-base font-bold tracking-tight sm:text-lg">
            {title}
          </td>
          <td className="w-[28%] border border-gray-400 p-0 align-middle">
            <div className="border-b border-gray-400 px-2 py-1.5 text-gray-500">Classification</div>
            <div className="px-2 py-2 font-medium">{classification}</div>
          </td>
        </tr>
        {sectionLabel ? (
          <tr>
            <td colSpan={3} className="border border-gray-400 bg-gray-100 px-2 py-2 font-bold">
              {sectionLabel}
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}
