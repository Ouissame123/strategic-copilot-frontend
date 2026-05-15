import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { Link } from "react-router";
import { cx } from "@/utils/cx";

type RHRequestsHeaderProps = {
    ctaLabel: string;
    onNewRequest: () => void;
    backLabel: string;
};

/** Barre compacte sous la topbar : retour équipe + CTA (titre dans la topbar). */
export function RHRequestsHeader({ ctaLabel, onNewRequest, backLabel }: RHRequestsHeaderProps) {
    return (
        <motion.header
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-5"
        >
            <Link
                to="/workspace/manager/team"
                className="text-sm font-semibold text-violet-700 underline-offset-4 transition hover:text-violet-900 hover:underline dark:text-violet-300 dark:hover:text-violet-200"
            >
                {backLabel}
            </Link>
            <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onNewRequest}
                className={cx(
                    "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md",
                    "bg-violet-600 ring-1 ring-violet-500/30 transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900",
                )}
            >
                <Plus className="size-5 shrink-0" strokeWidth={2.25} aria-hidden />
                {ctaLabel}
            </motion.button>
        </motion.header>
    );
}
