import { Bot, Sparkles } from "lucide-react";
import { memo } from "react";
import { RhChatKpiStrip } from "@/components/rh-chat/RhChatKpiStrip";
import { RH_CHAT_TOPIC_CARDS, STARTER_QUESTIONS } from "@/components/rh-chat/rh-chat-ui.constants";
import { cx } from "@/utils/cx";

type RhChatWelcomeScreenProps = {
    enterpriseId?: string;
    onSelectQuestion: (question: string) => void;
};

export const RhChatWelcomeScreen = memo(function RhChatWelcomeScreen({
    enterpriseId,
    onSelectQuestion,
}: RhChatWelcomeScreenProps) {
    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-gradient-to-b from-slate-50 via-white to-violet-50/30 px-4 py-6 sm:px-8 sm:py-8 dark:from-slate-950 dark:via-slate-900 dark:to-violet-950/20">
            <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
                <div className="relative mb-5">
                    <div
                        className="absolute inset-0 scale-110 rounded-full bg-gradient-to-br from-violet-400/30 to-indigo-500/30 blur-xl"
                        aria-hidden
                    />
                    <div className="relative flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 ring-4 ring-white/80 dark:ring-slate-900/80">
                        <Bot className="size-10" strokeWidth={1.75} aria-hidden />
                    </div>
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                    Assistant RH IA
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
                    Analysez vos talents, compétences, disponibilités, affectations, demandes RH et alertes en
                    langage naturel.
                </p>
            </div>

            <RhChatKpiStrip enterpriseId={enterpriseId} className="mx-auto mt-8 w-full max-w-4xl" />

            <div className="mx-auto mt-8 grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {RH_CHAT_TOPIC_CARDS.map((card) => {
                    const Icon = card.icon;
                    return (
                        <button
                            key={card.id}
                            type="button"
                            onClick={() => onSelectQuestion(card.question)}
                            className={cx(
                                "group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition",
                                "hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md hover:shadow-violet-100/80",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2",
                                "dark:border-slate-700 dark:bg-slate-900 dark:hover:border-violet-700 dark:hover:shadow-violet-950/30",
                            )}
                        >
                            <div
                                className={cx(
                                    "flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg text-white shadow-sm",
                                    card.gradient,
                                )}
                            >
                                <span aria-hidden>{card.emoji}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <Icon className="size-4 text-violet-600 dark:text-violet-400" aria-hidden />
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{card.label}</p>
                                </div>
                                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                    {card.question}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="mx-auto mt-8 w-full max-w-4xl">
                <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="size-4 text-violet-600" aria-hidden />
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Suggestions rapides</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                    {STARTER_QUESTIONS.map((question) => (
                        <button
                            key={question}
                            type="button"
                            onClick={() => onSelectQuestion(question)}
                            className={cx(
                                "rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition",
                                "hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800",
                                "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-violet-700 dark:hover:bg-violet-950/40",
                            )}
                        >
                            {question}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
});
