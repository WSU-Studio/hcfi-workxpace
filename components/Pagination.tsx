interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  /**
   * Optional override for the "showing" copy. Consumers that present a list
   * of unusual entities (e.g. "Showing 1-10 of 47 plans") can pass their own
   * label generator. Default just uses "items".
   */
  itemNoun?: string;
  className?: string;
}

/**
 * Paginator with a "Showing X-Y of Z {noun}" status line.
 *
 * Renders nothing when there are no items at all, so consumers don't have to
 * conditionally hide it. Page numbers are still listed inline because all
 * existing call sites depend on that affordance.
 */
export default function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  itemNoun = 'items',
  className = '',
}: PaginationProps) {
  if (totalItems <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(safePage * itemsPerPage, totalItems);

  return (
    <div
      className={`mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <p className="text-sm text-slate-600">
        Showing <span className="font-medium text-slate-900">{startIndex}-{endIndex}</span>{' '}
        of <span className="font-medium text-slate-900">{totalItems}</span> {itemNoun}
      </p>

      {totalPages > 1 && (
        <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              aria-current={safePage === pageNum ? 'page' : undefined}
              className={`px-3 py-1 rounded transition-colors ${
                safePage === pageNum
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer'
              }`}
            >
              {pageNum}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
