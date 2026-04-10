import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { cx } from "@/utils/cx";

function SectionCard({
    eyebrow,
    title,
    children,
    className,
}: {
    eyebrow: string;
    title: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cx(
                "rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6",
                className,
            )}
        >
            <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">{eyebrow}</p>
            <h2 className="mt-1 text-lg font-semibold text-primary">{title}</h2>
            <div className="mt-4 text-sm leading-relaxed text-secondary">{children}</div>
        </section>
    );
}

export default function ProjectShowcasePage() {
    const { t } = useTranslation("common");
    useCopilotPage("project-showcase", t("projectShowcase.docTitle"));

    const contributions = t("projectShowcase.contributions", { returnObjects: true }) as string[];
    const stack = t("projectShowcase.stackItems", { returnObjects: true }) as string[];
    const quality = t("projectShowcase.qualityItems", { returnObjects: true }) as string[];

    const featureRows = [
        { k: "f1" },
        { k: "f2" },
        { k: "f3" },
        { k: "f4" },
        { k: "f5" },
        { k: "f6" },
    ] as const;

    return (
        <div className="space-y-6">
            <header className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">{t("projectShowcase.eyebrow")}</p>
                <h1 className="mt-1 text-display-xs font-semibold text-primary md:text-display-sm">{t("projectShowcase.title")}</h1>
                <p className="mt-3 max-w-3xl text-md text-tertiary">{t("projectShowcase.lead")}</p>
            </header>

            <SectionCard eyebrow={t("projectShowcase.objectivesEyebrow")} title={t("projectShowcase.objectivesTitle")}>
                <p className="text-tertiary">{t("projectShowcase.objectivesBody")}</p>
            </SectionCard>

            <SectionCard eyebrow={t("projectShowcase.contributionsEyebrow")} title={t("projectShowcase.contributionsTitle")}>
                <ul className="list-inside list-disc space-y-2 text-tertiary marker:text-brand-secondary">
                    {Array.isArray(contributions) &&
                        contributions.map((line) => (
                            <li key={line} className="pl-1">
                                {line}
                            </li>
                        ))}
                </ul>
            </SectionCard>

            <SectionCard eyebrow={t("projectShowcase.stackEyebrow")} title={t("projectShowcase.stackTitle")}>
                <ul className="flex flex-wrap gap-2">
                    {Array.isArray(stack) &&
                        stack.map((item) => (
                            <li
                                key={item}
                                className="rounded-full bg-secondary_subtle px-3 py-1 text-xs font-medium text-secondary ring-1 ring-secondary/80"
                            >
                                {item}
                            </li>
                        ))}
                </ul>
            </SectionCard>

            <SectionCard eyebrow={t("projectShowcase.featuresEyebrow")} title={t("projectShowcase.featuresTitle")}>
                <div className="overflow-x-auto rounded-xl border border-secondary">
                    <table className="w-full min-w-[28rem] text-left text-sm">
                        <thead className="border-b border-secondary bg-secondary_subtle text-xs font-semibold uppercase tracking-wide text-quaternary">
                            <tr>
                                <th className="px-4 py-3">{t("projectShowcase.tableFeature")}</th>
                                <th className="px-4 py-3">{t("projectShowcase.tableDetail")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary">
                            {featureRows.map(({ k }) => (
                                <tr key={k} className="bg-primary">
                                    <td className="px-4 py-3 font-medium text-primary">{t(`projectShowcase.${k}.name`)}</td>
                                    <td className="px-4 py-3 text-tertiary">{t(`projectShowcase.${k}.detail`)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            <SectionCard eyebrow={t("projectShowcase.archEyebrow")} title={t("projectShowcase.archTitle")}>
                <p className="text-tertiary">{t("projectShowcase.archBody")}</p>
                <pre className="mt-4 overflow-x-auto rounded-lg bg-secondary_subtle p-4 text-xs text-secondary ring-1 ring-secondary/60">
                    {t("projectShowcase.archDiagram")}
                </pre>
            </SectionCard>

            <SectionCard eyebrow={t("projectShowcase.qualityEyebrow")} title={t("projectShowcase.qualityTitle")}>
                <ul className="list-inside list-disc space-y-2 text-tertiary marker:text-brand-secondary">
                    {Array.isArray(quality) &&
                        quality.map((line) => (
                            <li key={line} className="pl-1">
                                {line}
                            </li>
                        ))}
                </ul>
            </SectionCard>

            <SectionCard eyebrow={t("projectShowcase.outlookEyebrow")} title={t("projectShowcase.outlookTitle")}>
                <p className="text-tertiary">{t("projectShowcase.outlookBody")}</p>
            </SectionCard>
        </div>
    );
}
