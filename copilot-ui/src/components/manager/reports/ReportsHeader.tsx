import { FileBarChart2 } from "lucide-react";

type ReportsHeaderProps = {
    title: string;
    subtitle: string;
};

export function ReportsHeader({ title, subtitle }: ReportsHeaderProps) {
    return (
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:hidden">
            <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md">
                    <FileBarChart2 className="size-5" aria-hidden />
                </span>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
                </div>
            </div>
        </header>
    );
}
