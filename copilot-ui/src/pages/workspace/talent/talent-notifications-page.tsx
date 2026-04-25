import { ErrorState } from "@/components/ui/ErrorState";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useTalentWorkspacePageQuery } from "@/hooks/use-talent-workspace-page-query";
import { textOf } from "@/utils/talent-page-parsers";

type NotificationRow = Record<string, unknown>;

function badgeTone(label: string): string {
    const s = label.toLowerCase();
    if (s.includes("urgent")) return "bg-[#fef2f2] text-[#991b1b]";
    if (s.includes("tache")) return "bg-[#fffbeb] text-[#92400e]";
    if (s.includes("badge")) return "bg-[#ede9ff] text-[#5a4de0]";
    if (s.includes("formation")) return "bg-[#eafaf3] text-[#15803d]";
    if (s.includes("projet")) return "bg-[#eff6ff] text-[#1d4ed8]";
    return "bg-[#f3f4f6] text-[#6b7280]";
}

function iconByLabel(label: string): string {
    const s = label.toLowerCase();
    if (s.includes("urgent")) return "🚨";
    if (s.includes("tache")) return "📋";
    if (s.includes("badge")) return "🏆";
    if (s.includes("formation")) return "✅";
    if (s.includes("projet")) return "👥";
    return "📊";
}

function iconBgByLabel(label: string): string {
    const s = label.toLowerCase();
    if (s.includes("urgent")) return "bg-[#fef2f2]";
    if (s.includes("tache")) return "bg-[#fffbeb]";
    if (s.includes("badge")) return "bg-[#ede9ff]";
    if (s.includes("formation")) return "bg-[#eafaf3]";
    if (s.includes("projet")) return "bg-[#eff6ff]";
    return "bg-[#f7f6f3]";
}

export function TalentNotificationsPage() {
    useCopilotPage("none", "Talent Notifications");
    const q = useTalentWorkspacePageQuery("notifications");

    if (q.isLoading) {
        return <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-secondary" />)}</div>;
    }
    if (q.error) {
        return <ErrorState title="Notifications indisponibles" message="Impossible de charger les notifications talent." detail={q.error instanceof Error ? q.error.message : String(q.error)} onRetry={() => void q.refetch()} />;
    }

    const rows = (q.data?.items ?? []) as NotificationRow[];
    const unreadCount = rows.filter((row) => String(row.unread ?? row.is_unread ?? "").toLowerCase() === "true").length;
    const tabs = ["Toutes", "Non lues", "Projets", "Taches", "Systeme"];

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-[33px] font-semibold leading-none tracking-[-0.03em] text-[#18171e]">Notifications</h1>
                    <p className="mt-2 text-sm text-[#6b6880]">{unreadCount} non lues</p>
                </div>
                <button type="button" className="rounded-lg border border-black/10 bg-white px-3.5 py-2 text-sm font-medium text-[#18171e]">
                    Tout marquer comme lu
                </button>
            </header>

            <div className="inline-flex gap-1 rounded-lg bg-[#f7f6f3] p-1">
                {tabs.map((tab, i) => (
                    <button
                        key={tab}
                        type="button"
                        className={`rounded-md px-3 py-1.5 text-[12.5px] ${
                            i === 0
                                ? "bg-white font-medium text-[#18171e] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                                : "text-[#a09db5]"
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {rows.length === 0 ? (
                <div className="rounded-xl border border-black/5 bg-white p-6 text-sm text-tertiary">Aucune notification.</div>
            ) : (
                <section className="rounded-xl border border-black/5 bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                    {rows.map((row, i) => {
                        const title = textOf(row, ["title", "type", "label"]);
                        const body = textOf(row, ["message", "body", "description"], "");
                        const time = textOf(row, ["created_at", "date", "ts"], "");
                        const status = textOf(row, ["status", "category"], "Info");
                        const unread = String(row.unread ?? row.is_unread ?? "").toLowerCase() === "true";
                        const icon = iconByLabel(status);
                        const iconBg = iconBgByLabel(status);
                        return (
                            <article
                                key={`notif-${i}`}
                                className={`relative flex items-start gap-3 rounded-lg px-3 py-3 ${unread ? "bg-[#f8f7ff]" : "bg-white"} ${i < rows.length - 1 ? "border-b border-black/5" : ""}`}
                            >
                                {unread ? <span className="absolute left-1.5 top-5 size-1.5 rounded-full bg-[#7c6ef5]" /> : null}
                                <div className={`flex size-9 items-center justify-center rounded-md text-[17px] ${iconBg}`}>{icon}</div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13.5px] font-medium text-[#18171e]">{title}</p>
                                    {body ? <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#6b6880]">{body}</p> : null}
                                    {time ? <p className="mt-1 text-[11px] text-[#a09db5]">{time}</p> : null}
                                </div>
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeTone(status)}`}>{status}</span>
                            </article>
                        );
                    })}
                </section>
            )}
        </div>
    );
}
