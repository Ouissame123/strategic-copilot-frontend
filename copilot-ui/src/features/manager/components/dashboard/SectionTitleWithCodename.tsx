import { cx } from "@/utils/cx";

type Props = {
    title: string;
    codename: string;
    className?: string;
    titleClassName?: string;
};

export function SectionTitleWithCodename({ title, codename, className, titleClassName }: Props) {
    return (
        <div className={cx("flex flex-wrap items-center gap-2", className)}>
            <h3 className={cx("text-base font-semibold text-primary", titleClassName)}>{title}</h3>
            <span className="rounded-md border border-secondary bg-secondary_subtle/60 px-2 py-0.5 font-mono text-[10px] font-medium tracking-wide text-tertiary">
                {codename}
            </span>
        </div>
    );
}
