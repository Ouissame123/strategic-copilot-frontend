import * as React from "react";
import { cx } from "@/utils/cx";

/** Primitives style « shadcn/ui » pour table HTML + sticky header. */
type TableProps = React.HTMLAttributes<HTMLTableElement> & {
    /** Classes du conteneur scrollable (ex. max-h + overflow). */
    containerClassName?: string;
};

const Table = React.forwardRef<HTMLTableElement, TableProps>(({ className, containerClassName, ...props }, ref) => (
    <div className={cx("relative w-full overflow-auto", containerClassName)}>
        <table ref={ref} className={cx("w-full caption-bottom text-sm", className)} {...props} />
    </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
    ({ className, ...props }, ref) => <thead ref={ref} className={cx("[&_tr]:border-b", className)} {...props} />,
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
    ({ className, ...props }, ref) => <tbody ref={ref} className={cx("[&_tr:last-child]:border-0", className)} {...props} />,
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
    ({ className, ...props }, ref) => (
        <tfoot ref={ref} className={cx("border-t border-slate-200 bg-slate-50/80 font-medium dark:border-slate-800 dark:bg-slate-900/80", className)} {...props} />
    ),
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(({ className, ...props }, ref) => (
    <tr
        ref={ref}
        className={cx(
            "border-b border-slate-100 transition-colors data-[state=selected]:bg-slate-100 dark:border-slate-800 dark:data-[state=selected]:bg-slate-800/60",
            className,
        )}
        {...props}
    />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => (
    <th
        ref={ref}
        className={cx(
            "h-11 px-3 text-left align-middle text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 [&:has([role=checkbox])]:pr-0",
            className,
        )}
        {...props}
    />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => (
    <td ref={ref} className={cx("p-3 align-middle text-slate-800 dark:text-slate-200 [&:has([role=checkbox])]:pr-0", className)} {...props} />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
    ({ className, ...props }, ref) => <caption ref={ref} className={cx("mt-4 text-sm text-slate-500 dark:text-slate-400", className)} {...props} />,
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
