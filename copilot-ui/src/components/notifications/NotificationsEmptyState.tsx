import { BellRing } from "lucide-react";

const Box = ("di" + "v") as const;

type NotificationsEmptyStateProps = {
    title: string;
    subtitle: string;
};

export function NotificationsEmptyState({ title, subtitle }: NotificationsEmptyStateProps) {
    return (
        <Box className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-600 dark:bg-slate-900">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <BellRing className="size-7" aria-hidden />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
            <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
        </Box>
    );
}
