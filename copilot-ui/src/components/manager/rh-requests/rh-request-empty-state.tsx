import { motion } from "motion/react";
import { FileQuestion, Plus } from "lucide-react";

type RHRequestEmptyStateProps = {
    title: string;
    subtitle: string;
    ctaLabel: string;
    onNewRequest: () => void;
};

export function RHRequestEmptyState({ title, subtitle, ctaLabel, onNewRequest }: RHRequestEmptyStateProps) {
    return (
        <motion.section
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-8 py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
            <div className="flex size-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900">
                <FileQuestion className="size-8" strokeWidth={1.75} aria-hidden />
            </div>
            <h2 className="mt-6 text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">{subtitle}</p>
            <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onNewRequest}
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md ring-1 ring-violet-500/30 transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
            >
                <Plus className="size-4" strokeWidth={2.5} aria-hidden />
                {ctaLabel}
            </motion.button>
        </motion.section>
    );
}
