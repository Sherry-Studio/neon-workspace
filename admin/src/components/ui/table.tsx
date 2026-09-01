"use client";

import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function DataTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  sortable,
  sortState,
  onSort,
  className,
}: {
  children?: React.ReactNode;
  sortable?: boolean;
  sortState?: "asc" | "desc" | null;
  onSort?: () => void;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "sticky top-0 z-10 whitespace-nowrap bg-ink-850/95 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur",
        className,
      )}
    >
      {sortable ? (
        <button
          onClick={onSort}
          className="inline-flex items-center gap-1 transition hover:text-slate-300"
        >
          {children}
          {sortState === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : sortState === "desc" ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronsUpDown className="h-3 w-3 opacity-40" />
          )}
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export function Tr({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "border-b border-line/60 transition-colors",
        onClick && "cursor-pointer hover:bg-white/[0.03]",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  className,
  onClick,
}: {
  children?: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLTableCellElement>) => void;
}) {
  return (
    <td
      onClick={onClick}
      className={cn("whitespace-nowrap px-4 py-3 text-slate-300", className)}
    >
      {children}
    </td>
  );
}
