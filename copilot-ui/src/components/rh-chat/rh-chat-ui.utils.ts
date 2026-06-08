import type { LucideIcon } from "lucide-react";
import {
    AlertTriangle,
    BarChart3,
    BookOpen,
    Bot,
    ClipboardList,
    HelpCircle,
    MessageSquare,
    UserSquare2,
    Users,
} from "lucide-react";
import type { RhChatConversationListItem } from "@/types/rh-chat";

export type RhChatIntentVisual = {
    intent: string;
    label: string;
    icon: LucideIcon;
    tone: "violet" | "indigo" | "emerald" | "amber" | "rose" | "slate";
};

const INTENT_RULES: Array<{ match: RegExp; visual: RhChatIntentVisual }> = [
    {
        match: /compétence|competence|skill|python|java|react/i,
        visual: { intent: "talent_par_competence", label: "Compétences", icon: BookOpen, tone: "indigo" },
    },
    {
        match: /surcharg|charge|disponib|load|capacity/i,
        visual: { intent: "charge_talents", label: "Charge", icon: BarChart3, tone: "amber" },
    },
    {
        match: /manager|équipe manager|equipe manager/i,
        visual: { intent: "managers", label: "Managers", icon: UserSquare2, tone: "violet" },
    },
    {
        match: /demande|request|validation|rh/i,
        visual: { intent: "demandes_rh", label: "Demandes RH", icon: ClipboardList, tone: "emerald" },
    },
    {
        match: /alert|critique|notification|risque/i,
        visual: { intent: "alertes", label: "Alertes", icon: AlertTriangle, tone: "rose" },
    },
    {
        match: /talent|collaborateur|employé|employee|effectif/i,
        visual: { intent: "talents", label: "Talents", icon: Users, tone: "violet" },
    },
];

const TONE_CLASSES: Record<RhChatIntentVisual["tone"], string> = {
    violet: "bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-800",
    indigo: "bg-indigo-100 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-200 dark:ring-indigo-800",
    emerald: "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-800",
    amber: "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-800",
    rose: "bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:ring-rose-800",
    slate: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
};

export function intentToneClasses(tone: RhChatIntentVisual["tone"]): string {
    return TONE_CLASSES[tone];
}

export function inferIntentFromText(text: string | null | undefined): RhChatIntentVisual {
    const hay = text?.trim() ?? "";
    for (const rule of INTENT_RULES) {
        if (rule.match.test(hay)) return rule.visual;
    }
    if (hay.length > 0) {
        return { intent: "general", label: "Conversation", icon: MessageSquare, tone: "slate" };
    }
    return { intent: "unknown", label: "Assistant", icon: Bot, tone: "violet" };
}

export function generateConversationTitle(conversation: RhChatConversationListItem): string {
    const explicit = conversation.title?.trim();
    if (explicit && explicit.length > 2 && !/^(salut|bonjour|hello|test|hi)$/i.test(explicit)) {
        return explicit;
    }

    const source = (conversation.last_message_preview ?? explicit ?? "").trim();
    if (!source) return "Nouvelle conversation";

    const visual = inferIntentFromText(source);
    const snippet = source.length > 48 ? `${source.slice(0, 48).trim()}…` : source;

    switch (visual.intent) {
        case "talent_par_competence":
            return `Recherche compétence · ${snippet}`;
        case "charge_talents":
            return `Analyse surcharge · ${snippet}`;
        case "demandes_rh":
            return `Demandes RH · ${snippet}`;
        case "alertes":
            return `Alertes · ${snippet}`;
        case "managers":
            return `Managers · ${snippet}`;
        case "talents":
            return `Talents · ${snippet}`;
        default:
            return snippet;
    }
}

export function formatRhChatRelativeTime(iso: string | null | undefined): string {
    if (!iso?.trim()) return "—";
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return "—";

    const diffMs = Date.now() - t;
    const diffMin = Math.floor(diffMs / 60_000);
    const diffH = Math.floor(diffMs / 3_600_000);
    const diffD = Math.floor(diffMs / 86_400_000);

    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffH < 24) return `Il y a ${diffH} h`;
    if (diffD < 7) return `Il y a ${diffD} j`;

    return new Date(iso).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function confidenceBadgeTone(confidence: number | null | undefined): "high" | "medium" | "low" | null {
    if (confidence == null || !Number.isFinite(confidence)) return null;
    const pct = confidence <= 1 ? confidence * 100 : confidence;
    if (pct >= 75) return "high";
    if (pct >= 45) return "medium";
    return "low";
}

export function formatConfidenceShort(confidence: number | null | undefined): string | null {
    if (confidence == null || !Number.isFinite(confidence)) return null;
    const pct = confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);
    return `${pct}%`;
}

export function confidenceBadgeClasses(tone: "high" | "medium" | "low"): string {
    switch (tone) {
        case "high":
            return "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200";
        case "medium":
            return "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200";
        case "low":
            return "bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200";
    }
}

export function fallbackIntentIcon(): LucideIcon {
    return HelpCircle;
}
