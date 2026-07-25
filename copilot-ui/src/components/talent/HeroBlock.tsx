import { Bell, Edit3 } from "lucide-react";
import { Avatar } from "@/components/base/avatar/avatar";
import { Button } from "@/components/base/buttons/button";
import { HEALTH_TONES, toneClasses } from "@/components/talent/dashboard/talent-dashboard-tones";
import type { HealthLabel } from "@/types/talent-dashboard";
import { cx } from "@/utils/cx";
import { ScoreDonut } from "./ScoreDonut";

type HeroBlockProps = {
    firstName: string;
    role: string;
    specialty?: string | null;
    level?: string | null;
    globalScore?: number | null;
    scoreLabel?: HealthLabel | null;
    hasHealthData?: boolean;
    unreadNotifications?: number;
    avatarInitials?: string;
    onOpenNotifications?: () => void;
};

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function HeroBlock({
    firstName,
    role,
    specialty,
    level,
    globalScore,
    scoreLabel,
    hasHealthData = false,
    unreadNotifications = 0,
    avatarInitials,
    onOpenNotifications,
}: HeroBlockProps) {
    const healthTone = scoreLabel ? HEALTH_TONES[scoreLabel] : "slate";
    const healthCls = toneClasses(healthTone);
    const initials = avatarInitials ?? initialsFromName(firstName);
    const showScore = hasHealthData && globalScore != null;

    return (
        <section
            className="rounded-xl border border-secondary/60 bg-gradient-to-br from-primary-50/80 to-primary-50/80 p-5 shadow-sm sm:p-6 dark:from-primary-950/30 dark:to-primary-950/30"
            aria-labelledby="talent-dashboard-greeting"
        >
            <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="flex min-w-[min(100%,18rem)] flex-1 items-start gap-4">
                    <Avatar size="xl" initials={initials} alt={`Avatar de ${firstName}`} contrastBorder />
                    <div className="min-w-0 flex-1">
                        <h1 id="talent-dashboard-greeting" className="flex flex-wrap items-center gap-2 text-2xl font-bold text-primary sm:text-3xl">
                            Bonjour {firstName}
                            <span className="text-2xl" aria-hidden>
                                👋
                            </span>
                        </h1>
                        <p className="mt-1 text-sm text-tertiary">
                            {role}
                            {specialty ? <> · {specialty}</> : null}
                            {level ? <> · {level}</> : null}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <Button
                                href="/workspace/talent/profile"
                                size="sm"
                                color="secondary"
                                iconLeading={Edit3}
                                aria-label="Mettre à jour mon profil"
                            >
                                Mettre à jour mon profil
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                color="secondary"
                                iconLeading={Bell}
                                className="relative"
                                aria-label={`Notifications${unreadNotifications > 0 ? `, ${unreadNotifications} non lues` : ""}`}
                                onClick={onOpenNotifications}
                            >
                                Notifications
                                {unreadNotifications > 0 ? (
                                    <span
                                        className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                                        aria-hidden
                                    >
                                        {unreadNotifications > 99 ? "99+" : unreadNotifications}
                                    </span>
                                ) : null}
                            </Button>
                        </div>
                    </div>
                </div>

                {showScore ? (
                    <div className="flex flex-col items-center">
                        <ScoreDonut value={globalScore!} max={10} size={110} ariaLabel={`Score global ${globalScore} sur 10`} />
                        {scoreLabel ? (
                            <span
                                className={cx(
                                    "mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                                    healthCls.badge,
                                )}
                            >
                                {scoreLabel}
                            </span>
                        ) : null}
                    </div>
                ) : (
                    <div
                        className="flex flex-col items-center justify-center rounded-full border border-dashed border-secondary/60 bg-primary/50 px-4 py-6 text-center"
                        style={{ width: 110, minHeight: 110 }}
                        role="status"
                        aria-label="Score global non disponible"
                    >
                        <span className="text-2xl font-bold text-tertiary">—</span>
                        <span className="mt-1 text-xs text-tertiary">Score non évalué</span>
                    </div>
                )}
            </div>
        </section>
    );
}
