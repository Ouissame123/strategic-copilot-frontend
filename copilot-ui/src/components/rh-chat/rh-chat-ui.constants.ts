import type { LucideIcon } from "lucide-react";
import {
    AlertTriangle,
    BarChart3,
    BookOpen,
    ClipboardList,
    Users,
    UserSquare2,
} from "lucide-react";

export type RhChatTopicCard = {
    id: string;
    emoji: string;
    label: string;
    question: string;
    icon: LucideIcon;
    gradient: string;
};

export const RH_CHAT_TOPIC_CARDS: RhChatTopicCard[] = [
    {
        id: "talents",
        emoji: "👥",
        label: "Talents",
        question: "Combien de talents sont disponibles ?",
        icon: Users,
        gradient: "from-violet-500 to-indigo-600",
    },
    {
        id: "skills",
        emoji: "📚",
        label: "Compétences",
        question: "Quelles sont les compétences les plus présentes ?",
        icon: BookOpen,
        gradient: "from-indigo-500 to-violet-600",
    },
    {
        id: "load",
        emoji: "📊",
        label: "Charge & disponibilité",
        question: "Quels talents sont surchargés ?",
        icon: BarChart3,
        gradient: "from-violet-600 to-purple-600",
    },
    {
        id: "managers",
        emoji: "👔",
        label: "Managers",
        question: "Quels managers ont le plus de talents ?",
        icon: UserSquare2,
        gradient: "from-indigo-600 to-violet-700",
    },
    {
        id: "requests",
        emoji: "📋",
        label: "Demandes RH",
        question: "Quelles demandes RH sont en attente de décision ?",
        icon: ClipboardList,
        gradient: "from-violet-500 to-indigo-500",
    },
    {
        id: "alerts",
        emoji: "🚨",
        label: "Alertes",
        question: "Quelles sont les alertes RH critiques en cours ?",
        icon: AlertTriangle,
        gradient: "from-rose-500 to-violet-600",
    },
];

export const STARTER_QUESTIONS: string[] = [
    "Combien de talents actifs avons-nous ?",
    "Quels talents sont disponibles à plus de 50 % ?",
    "Quelles compétences manquent sur nos projets ?",
    "Liste les demandes RH en attente",
    "Quels talents sont en surcharge cette semaine ?",
    "Résume les alertes RH non lues",
];
