import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy, LogOut } from "lucide-react";
import { formatMemberSinceAbsolute, formatMemberSinceRelative } from "../utils/formatMemberSince";
import { profileInitials } from "../utils/profileInitials";
import { RH_PROFILE_AVATAR_GRADIENT, RH_PROFILE_CARD } from "../profile-ui";
import { cx } from "@/utils/cx";

export type ProfileIdentityCardProps = {
    fullName: string;
    email: string;
    roleBadge?: string;
    roleLabel?: string;
    avatarUrl?: string | null;
    createdAt?: string | null;
    onLogout: () => void;
    logoutPending?: boolean;
};

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-3 py-1.5">
            <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{label}</span>
            <div className="min-w-0 text-right text-sm text-slate-800 dark:text-slate-200">{children}</div>
        </div>
    );
}

export function ProfileIdentityCard({
    fullName,
    email,
    roleBadge = "RH",
    roleLabel = "Ressources Humaines",
    avatarUrl,
    createdAt,
    onLogout,
    logoutPending = false,
}: ProfileIdentityCardProps) {
    const [avatarBroken, setAvatarBroken] = useState(false);
    const [copied, setCopied] = useState(false);
    const copyTimer = useRef<number | null>(null);
    const initials = profileInitials(fullName, email);
    const src = avatarUrl?.trim() || undefined;
    const showImage = Boolean(src) && !avatarBroken;
    const emailTrim = email.trim();

    useEffect(() => {
        setAvatarBroken(false);
    }, [src]);

    useEffect(() => {
        return () => {
            if (copyTimer.current != null) window.clearTimeout(copyTimer.current);
        };
    }, []);

    const memberRelative =
        createdAt && !Number.isNaN(Date.parse(createdAt)) ? formatMemberSinceRelative(createdAt) : null;
    const memberAbsolute =
        createdAt && !Number.isNaN(Date.parse(createdAt)) ? formatMemberSinceAbsolute(createdAt) : null;

    const copyEmail = async () => {
        if (!emailTrim || typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
        try {
            await navigator.clipboard.writeText(emailTrim);
            setCopied(true);
            if (copyTimer.current != null) window.clearTimeout(copyTimer.current);
            copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
        } catch {
            /* ignore */
        }
    };

    return (
        <aside
            className={cx(
                RH_PROFILE_CARD,
                "flex flex-col p-6",
                "lg:sticky lg:top-20 lg:self-start",
            )}
        >
            <div className="flex flex-col items-center text-center">
                <div
                    className={cx(
                        "relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl font-bold ring-4 ring-white shadow-md dark:ring-slate-800",
                        !showImage && RH_PROFILE_AVATAR_GRADIENT,
                    )}
                    aria-hidden={!showImage}
                >
                    {showImage ? (
                        <img
                            src={src}
                            alt=""
                            className="size-full object-cover"
                            onError={() => setAvatarBroken(true)}
                        />
                    ) : (
                        <span aria-hidden>{initials}</span>
                    )}
                </div>

                <h2 className="mt-4 max-w-full truncate text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                    {fullName.trim() || "—"}
                </h2>
                <p className="mt-1 max-w-full truncate text-sm text-slate-500 dark:text-slate-400">
                    {emailTrim || "—"}
                </p>

                <span className="mt-3 inline-flex rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-800 dark:bg-primary-950/50 dark:text-primary-200">
                    {roleBadge}
                </span>

                {memberRelative ? (
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        Membre depuis{" "}
                        <time
                            dateTime={createdAt ?? undefined}
                            title={memberAbsolute ?? undefined}
                            className="font-medium text-slate-700 underline decoration-slate-300 decoration-dotted underline-offset-2 dark:text-slate-300 dark:decoration-slate-600"
                        >
                            {memberRelative}
                        </time>
                    </p>
                ) : null}

                <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
                    Connecté
                </p>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Aperçu
                </p>
                <MetaRow label="Rôle">{roleLabel}</MetaRow>
                <MetaRow label="Email">
                    <div className="group/email relative inline-flex max-w-full items-center gap-1.5">
                        <span className="truncate">{emailTrim || "—"}</span>
                        {emailTrim ? (
                            <button
                                type="button"
                                onClick={() => void copyEmail()}
                                className={cx(
                                    "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-slate-400 outline-none",
                                    "opacity-0 transition-opacity group-hover/email:opacity-100 focus-visible:opacity-100",
                                    "hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-primary-500/40",
                                    "dark:hover:bg-slate-800 dark:hover:text-slate-200",
                                )}
                                aria-label={copied ? "Copié" : "Copier l’email"}
                            >
                                {copied ? (
                                    <Check className="size-3.5 text-emerald-600" aria-hidden />
                                ) : (
                                    <Copy className="size-3.5" aria-hidden />
                                )}
                            </button>
                        ) : null}
                        {copied ? (
                            <span className="absolute -bottom-5 right-0 whitespace-nowrap text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                Copié ✓
                            </span>
                        ) : null}
                    </div>
                </MetaRow>
                <MetaRow label="Inscription">{memberAbsolute ?? "—"}</MetaRow>
            </div>

            <button
                type="button"
                disabled={logoutPending}
                onClick={onLogout}
                className={cx(
                    "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                    "border-rose-200 bg-transparent text-rose-700",
                    "hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40",
                )}
            >
                <LogOut className="size-4" aria-hidden />
                {logoutPending ? "Déconnexion…" : "Se déconnecter"}
            </button>
        </aside>
    );
}
