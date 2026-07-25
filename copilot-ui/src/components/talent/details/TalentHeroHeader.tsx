import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import {
    TALENT_TITLE,
    riskLevelStyles,
    talentInitials,
    formatTalentDate,
} from "@/components/talent/talent-detail-shared";
import { TalentKpiCards } from "@/components/talent/details/TalentKpiCards";

const Box = "div" as const;

export interface TalentHeroHeaderProps {
    talentName: string;
    email: string;
    role: string;
    contractType: string;
    city?: string | null;
    country?: string | null;
    riskLevel?: string;
    allocationPct: number;
    alertsCount: number;
    ipiScore: number | null;
    contractEndDate: string | null | undefined;
    contractEndingSoon?: boolean;
    onBack: () => void;
}

function truncateEmail(email: string, max = 32): string {
    if (email.length <= max) return email;
    const at = email.indexOf("@");
    if (at <= 0) return `${email.slice(0, max - 1)}…`;
    const local = email.slice(0, at);
    const domain = email.slice(at);
    const keep = Math.max(4, max - domain.length - 1);
    return `${local.slice(0, keep)}…${domain}`;
}

export function TalentHeroHeader({
    talentName,
    email,
    role,
    contractType,
    city,
    country,
    riskLevel,
    allocationPct,
    alertsCount,
    ipiScore,
    contractEndDate,
    contractEndingSoon,
    onBack,
}: TalentHeroHeaderProps) {
    const location = [city, country].map((s) => String(s ?? "").trim()).filter(Boolean).join(", ");
    const risk = riskLevelStyles(riskLevel);

    return (
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-700 dark:bg-slate-950/80">
            <Box className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                <Box className="mb-4 flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={onBack}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                        Retour équipe
                    </button>
                    <Link
                        to="/workspace/manager/projects"
                        className="ml-auto hidden text-xs font-medium text-primary-600 hover:underline dark:text-primary-400 sm:inline"
                    >
                        Copilot projets →
                    </Link>
                </Box>

                <Box className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                    <Box
                        className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-500 text-xl font-bold text-white shadow-lg ring-4 ring-white dark:ring-slate-800"
                        aria-hidden
                    >
                        {talentInitials(talentName)}
                    </Box>
                    <Box className="min-w-0 flex-1">
                        <Box className="flex flex-wrap items-center gap-2">
                            <h1 className={TALENT_TITLE}>{talentName}</h1>
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${risk.badge}`}>
                                {risk.label}
                            </span>
                        </Box>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {role} · {contractType}
                            {contractEndDate ? (
                                <span className="text-slate-500 dark:text-slate-400">
                                    {" "}
                                    · fin {formatTalentDate(contractEndDate)}
                                </span>
                            ) : null}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                            {location ? <span>{location}</span> : null}
                            {email ? (
                                <a
                                    href={`mailto:${email}`}
                                    className="truncate text-primary-600 hover:underline dark:text-primary-400"
                                    title={email}
                                >
                                    {truncateEmail(email)}
                                </a>
                            ) : null}
                        </p>
                    </Box>
                </Box>

                <Box className="mt-5">
                    <TalentKpiCards
                        allocationPct={allocationPct}
                        alertsCount={alertsCount}
                        ipiScore={ipiScore}
                        contractEndDate={contractEndDate}
                        contractEndingSoon={contractEndingSoon}
                    />
                </Box>
            </Box>
        </header>
    );
}
