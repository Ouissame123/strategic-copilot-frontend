import type { ReactNode } from "react";
import { cx } from "@/utils/cx";

type DecisionKPIProps = {
    label: string;
    children: ReactNode;
    footer?: ReactNode;
    className?: string;
};

export function DecisionKPI({ label, children, footer, className }: DecisionKPIProps) {
    return (
        <article
            className={cx(
                "flex min-h-[5.5rem] flex-col rounded-xl border border-secondary bg-primary p-3 shadow-sm",
                className,
            )}
        >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">{label}</p>
            <div className="mt-2 flex flex-1 flex-col justify-center">{children}</div>
            {footer ? <div className="mt-3">{footer}</div> : null}
        </article>
    );
}
