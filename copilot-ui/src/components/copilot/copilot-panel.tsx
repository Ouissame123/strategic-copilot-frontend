import { Stars01 } from "@untitledui/icons";
import { Heading } from "react-aria-components";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { useCopilot } from "@/providers/copilot-provider";
import type { CopilotAssistantStructured, CopilotScope } from "@/types/copilot";
import { getSuggestedQuestions } from "@/utils/copilot-chat-suggestions";
import { cx } from "@/utils/cx";

function scopeLabel(scope: CopilotScope | undefined, t: (k: string) => string): string {
    switch (scope) {
        case "dashboard":
            return t("scope.dashboard");
        case "projects_list":
            return t("scope.projectsList");
        case "project_detail":
            return t("scope.projectDetail");
        case "staffing":
            return t("scope.staffing");
        case "none":
            return t("scope.none");
        default:
            return scope ? String(scope) : t("noContext");
    }
}

export function CopilotPanel() {
    const { t } = useTranslation("copilot");
    const [pendingStop, setPendingStop] = useState(false);
    const [mode, setMode] = useState<"chat" | "analysis">("chat");
    const [analysisData, setAnalysisData] = useState<CopilotAssistantStructured | null>(null);
    const [chatInput, setChatInput] = useState("");
    const {
        isOpen,
        setIsOpen,
        pageContext,
        decisionSubmitLoading,
        decisionSubmitError,
        decisionSubmitSuccess,
        saveDecision,
        clearDecisionFeedback,
        decisionSubmitEnabled,
        messages,
        sendMessage,
        chatLoading,
        currentContext,
    } = useCopilot();

    const askCopilot = useCallback(
        async (message: string) => {
            const result = await sendMessage(message);
            if (result) {
                setAnalysisData(result);
                setMode("analysis");
            } else {
                setMode("chat");
            }
        },
        [sendMessage],
    );

    const handleSend = useCallback(() => {
        if (!chatInput.trim()) return;
        void askCopilot(chatInput);
        setChatInput("");
    }, [askCopilot, chatInput]);

    const chatScrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = chatScrollRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, [messages, chatLoading]);

    useEffect(() => {
        if (mode === "analysis" && !analysisData) setMode("chat");
    }, [analysisData, mode]);

    const contextBadge = pageContext
        ? [scopeLabel(pageContext.scope, t), pageContext.pageLabel].filter(Boolean).join(" · ")
        : t("noContext");

    const submitDecision = async (d: "Continue" | "Adjust" | "Stop") => {
        try {
            await saveDecision({ decision: d });
        } catch {
            /* erreur affichée ci-dessous */
        }
    };

    return (
        <>
            <SlideoutMenu isOpen={isOpen} onOpenChange={setIsOpen} isDismissable dialogClassName="bg-primary_alt">
                {({ close }) => (
                    <div id="ai-copilot-panel" role="complementary" aria-label={t("title")} className="flex h-full min-h-0 flex-col">
                        <SlideoutMenu.Header onClose={close} className="border-b border-secondary pb-5 md:pb-6">
                            <div className="flex items-center gap-2 pr-10">
                                <Stars01 className="size-5 shrink-0 text-brand-600" aria-hidden />
                                <Heading slot="title" className="font-display text-lg font-semibold text-primary">
                                    {t("title")}
                                </Heading>
                            </div>
                            <p className="mt-2 text-xs text-tertiary">{t("panelBackendSubtitle")}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                <Badge type="pill-color" size="sm" color="brand">
                                    {contextBadge}
                                </Badge>
                            </div>
                            <div className="mt-4 flex gap-1 rounded-lg bg-secondary/50 p-1 dark:bg-secondary/30">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (analysisData) setMode("analysis");
                                        else setMode("chat");
                                    }}
                                    className={cx(
                                        "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                                        mode === "analysis"
                                            ? "bg-primary text-primary shadow-xs ring-1 ring-secondary"
                                            : "text-tertiary hover:text-secondary",
                                    )}
                                >
                                    {t("panelTabAnalysis")}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode("chat")}
                                    className={cx(
                                        "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                                        mode === "chat"
                                            ? "bg-primary text-primary shadow-xs ring-1 ring-secondary"
                                            : "text-tertiary hover:text-secondary",
                                    )}
                                >
                                    {t("panelTabChat")}
                                </button>
                            </div>
                        </SlideoutMenu.Header>

                        <SlideoutMenu.Content className="gap-6 pb-10 pt-1">
                            {mode === "chat" ? (
                                <div className="flex min-h-0 flex-1 flex-col gap-3">
                                    <div
                                        ref={chatScrollRef}
                                        className="min-h-[200px] flex-1 space-y-3 overflow-y-auto pr-1"
                                    >
                                        {messages.length === 0 ? (
                                            <div className="py-8 text-center">
                                                <p className="text-sm font-medium text-primary">{t("chatEmptyTitle")}</p>
                                                <p className="mt-1 text-xs text-tertiary">{t("chatEmptySubtitle")}</p>
                                                <div className="mt-4 flex flex-col gap-2">
                                                    {getSuggestedQuestions(currentContext.page).map((q) => (
                                                        <button
                                                            key={q}
                                                            type="button"
                                                            disabled={chatLoading}
                                                            onClick={() => void askCopilot(q)}
                                                            className="rounded-lg border border-secondary px-3 py-2 text-left text-xs text-secondary transition-colors hover:bg-secondary/50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            {q}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            messages.map((msg) => (
                                                <div
                                                    key={msg.id}
                                                    className={cx("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                                                >
                                                    <div
                                                        className={cx(
                                                            "max-w-[92%] rounded-xl px-3 py-2",
                                                            msg.role === "user"
                                                                ? "rounded-tr-sm bg-brand-solid text-white"
                                                                : "rounded-tl-sm bg-secondary text-primary ring-1 ring-secondary",
                                                            msg.role === "assistant" && msg.error
                                                                ? "ring-utility-error-200 dark:ring-utility-error-800"
                                                                : null,
                                                        )}
                                                    >
                                                        {msg.role === "assistant" && msg.structured ? (
                                                            <div className="space-y-2">
                                                                {msg.structured.summary ? (
                                                                    <p className="text-sm font-medium leading-relaxed text-primary">{msg.structured.summary}</p>
                                                                ) : null}
                                                                {msg.structured.explanation ? (
                                                                    <p className="text-sm leading-relaxed text-secondary">{msg.structured.explanation}</p>
                                                                ) : null}
                                                                {msg.structured.recommendations_text && msg.structured.recommendations_text.length > 0 ? (
                                                                    <div className="space-y-1 border-t border-secondary/60 pt-2">
                                                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-quaternary">
                                                                            {t("panelRecommendations")}
                                                                        </p>
                                                                        <ul className="list-inside list-disc space-y-1 text-sm text-secondary">
                                                                            {msg.structured.recommendations_text.map((line, i) => (
                                                                                <li key={i}>{line}</li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm leading-relaxed">{msg.content}</p>
                                                        )}
                                                        <p
                                                            className={cx(
                                                                "mt-1 text-[10px] opacity-60",
                                                                msg.role === "user" ? "text-white/80" : "",
                                                            )}
                                                        >
                                                            {new Date(msg.timestamp).toLocaleTimeString("fr-FR", {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        {chatLoading ? (
                                            <div className="flex w-fit gap-1 rounded-xl rounded-tl-sm bg-secondary px-3 py-2 ring-1 ring-secondary">
                                                <span className="size-1.5 animate-bounce rounded-full bg-tertiary [animation-delay:0ms]" />
                                                <span className="size-1.5 animate-bounce rounded-full bg-tertiary [animation-delay:150ms]" />
                                                <span className="size-1.5 animate-bounce rounded-full bg-tertiary [animation-delay:300ms]" />
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className="flex gap-2 border-t border-secondary pt-3">
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSend();
                                                }
                                            }}
                                            placeholder={t("chatInputPlaceholder")}
                                            className="min-h-10 flex-1 rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary outline-none ring-0"
                                            disabled={chatLoading}
                                        />
                                        <Button
                                            color="primary"
                                            size="sm"
                                            isLoading={chatLoading}
                                            isDisabled={!chatInput.trim() || chatLoading}
                                            onClick={() => void handleSend()}
                                        >
                                            {t("chatSend")}
                                        </Button>
                                    </div>
                                </div>
                            ) : null}

                            {mode === "analysis" && analysisData ? (
                                <div className="space-y-6 animate-in fade-in">
                                    <div className="flex items-center justify-end">
                                        <Button
                                            size="sm"
                                            color="link-gray"
                                            className="h-auto p-0"
                                            onClick={() => setMode("chat")}
                                        >
                                            {t("chatSend")} une nouvelle question
                                        </Button>
                                    </div>
                                    {analysisData.summary ? (
                                        <section className="rounded-xl border border-secondary/70 bg-secondary/20 p-4 dark:bg-secondary/10">
                                            <h3 className="text-xs font-semibold uppercase tracking-wide text-quaternary">{t("panelSummary")}</h3>
                                            <p className="mt-2 text-sm font-medium leading-relaxed text-primary">{analysisData.summary}</p>
                                        </section>
                                    ) : null}

                                    {analysisData.explanation ? (
                                        <section className="rounded-xl border border-secondary/70 bg-secondary/15 p-4 shadow-sm dark:bg-secondary/10">
                                            <h3 className="text-xs font-semibold uppercase tracking-wide text-quaternary">{t("panelExplanation")}</h3>
                                            <p className="mt-2 text-sm leading-relaxed text-secondary">{analysisData.explanation}</p>
                                        </section>
                                    ) : null}

                                    {analysisData.recommendations_text && analysisData.recommendations_text.length > 0 ? (
                                        <section className="rounded-xl border border-secondary/60 bg-primary_alt/30 p-4 dark:bg-primary_alt/20">
                                            <h3 className="text-xs font-semibold uppercase tracking-wide text-quaternary">{t("panelRecommendations")}</h3>
                                            <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-secondary">
                                                {analysisData.recommendations_text.map((line, i) => (
                                                    <li key={i}>{line}</li>
                                                ))}
                                            </ul>
                                        </section>
                                    ) : null}

                                    {decisionSubmitEnabled &&
                                    pageContext != null &&
                                    pageContext.scope !== "none" &&
                                    Boolean(pageContext.projectId?.trim()) && (
                                        <section className="space-y-3 border-t border-secondary pt-4">
                                            <h3 className="text-xs font-semibold uppercase tracking-wide text-quaternary">{t("panelYourDecision")}</h3>
                                            <div className="flex flex-wrap gap-2">
                                                <Button size="sm" color="secondary" isLoading={decisionSubmitLoading} onClick={() => void submitDecision("Continue")}>
                                                    Continue
                                                </Button>
                                                <Button size="sm" color="secondary" isLoading={decisionSubmitLoading} onClick={() => void submitDecision("Adjust")}>
                                                    Adjust
                                                </Button>
                                                <Button size="sm" color="primary" isLoading={decisionSubmitLoading} onClick={() => setPendingStop(true)}>
                                                    Stop
                                                </Button>
                                            </div>
                                            {decisionSubmitError ? <p className="text-xs text-utility-error-700">{decisionSubmitError}</p> : null}
                                            {(decisionSubmitError || decisionSubmitSuccess) && (
                                                <Button size="sm" color="link-gray" className="h-auto p-0" onClick={() => clearDecisionFeedback()}>
                                                    {t("dismissFeedback")}
                                                </Button>
                                            )}
                                        </section>
                                    )}
                                </div>
                            ) : null}

                            {mode === "analysis" && !analysisData && pageContext?.scope === "none" && (
                                <p className="rounded-lg border border-dashed border-secondary bg-bg-secondary/40 px-3 py-2.5 text-sm text-secondary">
                                    {t("panelScopeUnavailable")}
                                </p>
                            )}
                        </SlideoutMenu.Content>
                    </div>
                )}
            </SlideoutMenu>

            <ModalOverlay isOpen={pendingStop} onOpenChange={setPendingStop} isDismissable>
                <Modal>
                    <Dialog className="w-full max-w-md p-4 sm:p-6">
                        <div className="w-full rounded-2xl border border-secondary bg-primary p-6 shadow-xl ring-1 ring-secondary/80">
                            <Heading slot="title" className="text-lg font-semibold text-primary">
                                {t("stopDecisionTitle")}
                            </Heading>
                            <p className="mt-3 text-sm text-secondary">{t("stopDecisionBody")}</p>
                            <div className="relative z-10 mt-8 flex flex-wrap justify-end gap-3">
                                <Button type="button" color="secondary" slot="close">
                                    {t("stopDecisionCancel")}
                                </Button>
                                <Button
                                    type="button"
                                    color="primary"
                                    isLoading={decisionSubmitLoading}
                                    onClick={() => {
                                        setPendingStop(false);
                                        void submitDecision("Stop");
                                    }}
                                >
                                    {t("stopDecisionConfirm")}
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </>
    );
}
