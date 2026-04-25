import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { X } from "@untitledui/icons";
import { postCopilotProjectWhatIf } from "@/api/copilot.api";
import { getProjectTalents } from "@/api/project-by-id.api";
import {
    getManagerWorkspaceProjects,
    parseManagerWorkspaceProjectsResponse,
} from "@/api/workspace-manager.api";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { ProjectWhatIfSimulator, type WhatIfResult } from "@/components/project/project-what-if-simulator";
import { useAuth } from "@/providers/auth-provider";
import { unwrapDataPayload } from "@/utils/unwrap-api-payload";

type OpenArgs = {
    projectId?: string;
    projectName?: string;
};

type WhatIfContextValue = {
    open: (args?: OpenArgs) => void;
    close: () => void;
};

const WhatIfContext = createContext<WhatIfContextValue | null>(null);

export function useWhatIf(): WhatIfContextValue {
    const ctx = useContext(WhatIfContext);
    if (!ctx) {
        throw new Error("useWhatIf must be used within <WhatIfProvider>");
    }
    return ctx;
}

function extractTalentOptions(talents: unknown): { id: string; label: string }[] {
    const t = talents && typeof talents === "object" && !Array.isArray(talents) ? (talents as Record<string, unknown>) : {};
    const keys = ["members", "talents", "items", "rows"];
    for (const k of keys) {
        const arr = t[k];
        if (!Array.isArray(arr) || arr.length === 0) continue;
        const out: { id: string; label: string }[] = [];
        const seen = new Set<string>();
        for (let i = 0; i < arr.length; i++) {
            const r = arr[i] as Record<string, unknown>;
            const id = String(r.talent_id ?? r.id ?? r.talentId ?? "").trim() || `row-${i}`;
            if (seen.has(id)) continue;
            seen.add(id);
            const label = String(r.name ?? r.full_name ?? r.email ?? id).trim() || id;
            out.push({ id, label });
        }
        return out;
    }
    return [];
}

export function WhatIfProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [projectId, setProjectId] = useState("");
    const [projectName, setProjectName] = useState("");
    const [options, setOptions] = useState<Array<{ id: string; name: string }>>([]);
    const [loadingList, setLoadingList] = useState(false);
    const [talentOptions, setTalentOptions] = useState<{ id: string; label: string }[]>([]);

    const enterpriseId = useMemo(() => {
        const fromUser = user?.enterpriseId?.trim();
        const fromEnv = (import.meta.env.VITE_MANAGER_ENTERPRISE_ID as string | undefined)?.trim();
        return fromUser || fromEnv || "";
    }, [user?.enterpriseId]);

    const open = useCallback((args?: OpenArgs) => {
        setProjectId(args?.projectId?.trim() ?? "");
        setProjectName(args?.projectName?.trim() ?? "");
        setIsOpen(true);
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
    }, []);

    // Charge la liste des projets quand la modale s'ouvre sans projet sélectionné (pour laisser l'utilisateur choisir).
    useEffect(() => {
        if (!isOpen) return;
        if (projectId) return;
        let cancelled = false;
        (async () => {
            setLoadingList(true);
            try {
                const raw = await getManagerWorkspaceProjects({
                    page: 1,
                    limit: 200,
                    enterprise_id: enterpriseId,
                });
                const parsed = parseManagerWorkspaceProjectsResponse(raw);
                const opts = parsed.items.map((row, i) => ({
                    id: String(row.id ?? row.project_id ?? `p-${i}`),
                    name: String(row.name ?? row.title ?? row.project_name ?? row.id ?? "—"),
                }));
                if (!cancelled) setOptions(opts);
            } catch {
                if (!cancelled) setOptions([]);
            } finally {
                if (!cancelled) setLoadingList(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isOpen, projectId, enterpriseId]);

    // Charge les talents du projet sélectionné pour alimenter le simulator.
    useEffect(() => {
        if (!isOpen || !projectId.trim()) {
            setTalentOptions([]);
            return;
        }
        let cancelled = false;
        void (async () => {
            try {
                const tal = await getProjectTalents(projectId.trim());
                if (!cancelled) setTalentOptions(extractTalentOptions(tal));
            } catch {
                if (!cancelled) setTalentOptions([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isOpen, projectId]);

    const runWhatIf = useCallback(
        async (modifications: Record<string, unknown>): Promise<WhatIfResult | unknown> => {
            const id = projectId.trim();
            if (!id) throw new Error("Sélectionnez un projet.");
            const scenario = {
                name: String(modifications.scenario_type ?? "what-if"),
                allocation_pct: modifications.allocation_pct,
                added_talent_id: modifications.added_talent_id ?? null,
                training_skill_id: modifications.training_skill_id ?? null,
            };
            const raw = await postCopilotProjectWhatIf(id, {
                scenarios: [scenario],
                modifications,
            });
            return unwrapDataPayload(raw);
        },
        [projectId],
    );

    const value = useMemo<WhatIfContextValue>(() => ({ open, close }), [open, close]);

    const headerLabel = projectName || options.find((o) => o.id === projectId)?.name || "";

    return (
        <WhatIfContext.Provider value={value}>
            {children}
            <ModalOverlay isOpen={isOpen} onOpenChange={setIsOpen} isDismissable>
                <Modal>
                    <Dialog className="max-w-3xl w-full rounded-2xl border border-secondary bg-primary p-0 shadow-xl">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4 border-b border-secondary px-6 py-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">Décision</p>
                                <h2 className="mt-1 text-lg font-semibold text-primary">What-if Simulator</h2>
                                <p className="mt-1 text-sm text-tertiary">
                                    Comparez score avant / après et la décision simulée sans quitter la page.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={close}
                                className="rounded-lg p-1.5 text-tertiary hover:bg-secondary/40 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary"
                                aria-label="Fermer"
                            >
                                <X className="size-5" aria-hidden />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
                            {/* Project picker : visible uniquement si aucun projet n'a été passé explicitement */}
                            {!projectName && (
                                <div className="mb-4 max-w-md">
                                    <NativeSelect
                                        label="Projet"
                                        value={projectId}
                                        onChange={(e) => setProjectId(e.target.value)}
                                        options={[
                                            { label: loadingList ? "Chargement…" : "— Choisir —", value: "" },
                                            ...options.map((o) => ({ label: o.name, value: o.id })),
                                        ]}
                                    />
                                </div>
                            )}

                            {projectName && (
                                <div className="mb-4 rounded-lg border border-secondary bg-secondary/20 px-3 py-2 text-sm text-secondary">
                                    Projet :{" "}
                                    <span className="font-semibold text-primary">{headerLabel || projectId}</span>
                                </div>
                            )}

                            {projectId.trim() ? (
                                <ProjectWhatIfSimulator
                                    key={projectId}
                                    onSimulate={runWhatIf}
                                    talentOptions={talentOptions}
                                />
                            ) : (
                                <p className="text-sm text-tertiary">Sélectionnez un projet pour activer la simulation.</p>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end border-t border-secondary px-6 py-3">
                            <Button color="secondary" size="sm" onClick={close}>
                                Fermer
                            </Button>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </WhatIfContext.Provider>
    );
}
