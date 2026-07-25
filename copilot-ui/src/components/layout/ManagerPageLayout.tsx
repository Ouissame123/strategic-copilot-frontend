import type { ReactNode } from "react";

type ManagerPageLayoutProps = {
    header?: ReactNode;
    kpi?: ReactNode;
    distribution?: ReactNode;
    filters?: ReactNode;
    main: ReactNode;
    sidebar?: ReactNode;
};

/** Layout manager max-width 1280 — réutilisable dashboard, team, risks… */
export function ManagerPageLayout({ header, kpi, distribution, filters, main, sidebar }: ManagerPageLayoutProps) {
    return (
        <div className="min-h-0">
            {header}
            <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6">
                {kpi}
                {distribution}
                {filters ? (
                    <div className="sticky top-14 z-20 -mx-4 border-b border-secondary/80 bg-surface-1/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6">
                        {filters}
                    </div>
                ) : null}
                <div className="grid grid-cols-12 gap-6">
                    <div className={sidebar ? "col-span-12 lg:col-span-8" : "col-span-12"}>{main}</div>
                    {sidebar ? <aside className="col-span-12 space-y-4 lg:col-span-4">{sidebar}</aside> : null}
                </div>
            </div>
        </div>
    );
}
