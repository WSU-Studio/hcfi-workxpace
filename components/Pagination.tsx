interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  className = '',
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  if (totalPages <= 0) return null;

  return (
    <div className={`flex justify-center gap-2 my-6 ${className}`}>
      {pages.map((pageNum) => (
        <button
          key={pageNum}
          onClick={() => onPageChange(pageNum)}
          className={`px-3 py-1 rounded transition-colors ${
            currentPage === pageNum
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          {pageNum}
        </button>
      ))}
    </div>
  );
}
