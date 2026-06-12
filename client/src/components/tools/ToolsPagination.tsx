import { ChevronLeft, ChevronRight } from "lucide-react";

type ToolsPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function ToolsPagination({
  onPageChange,
  page,
  pageSize,
  total,
  totalPages,
}: ToolsPaginationProps) {
  const firstItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col justify-between gap-3 rounded-lg border border-line bg-panel px-4 py-3 text-sm text-slate-300 sm:flex-row sm:items-center">
      <div>
        Showing {firstItem}-{lastItem} of {total}
      </div>
      <div className="flex items-center gap-2">
        <button
          className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          <ChevronLeft size={16} /> Previous
        </button>
        <span className="px-2 text-slate-400">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <button
          className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
