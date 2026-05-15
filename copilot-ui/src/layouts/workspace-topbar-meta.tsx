import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type WorkspaceTopbarMeta = {
    title: string;
    subtitle: string | null;
    /** Action à droite du titre (ex. CTA) — rendu dans la topbar workspace. */
    trailing?: ReactNode;
};

const TopbarMetaStateContext = createContext<WorkspaceTopbarMeta>({ title: "", subtitle: null, trailing: undefined });
const SetTopbarMetaContext = createContext<((next: WorkspaceTopbarMeta) => void) | null>(null);

export function WorkspaceTopbarMetaProvider({ children }: { children: ReactNode }) {
    const [meta, setMetaState] = useState<WorkspaceTopbarMeta>({ title: "", subtitle: null, trailing: undefined });
    const setMeta = useCallback((next: WorkspaceTopbarMeta) => {
        setMetaState(next);
    }, []);

    return (
        <SetTopbarMetaContext.Provider value={setMeta}>
            <TopbarMetaStateContext.Provider value={meta}>{children}</TopbarMetaStateContext.Provider>
        </SetTopbarMetaContext.Provider>
    );
}

/** Titre, sous-titre et action optionnelle dans la topbar du workspace (gauche). Nettoyé au démontage. */
export function useWorkspaceTopbarMeta(title: string, subtitle?: string | null, trailing?: ReactNode | null) {
    const setMeta = useContext(SetTopbarMetaContext);
    useEffect(() => {
        if (!setMeta) return;
        const sub = subtitle === undefined || subtitle === null || subtitle === "" ? null : subtitle;
        setMeta({ title, subtitle: sub, trailing: trailing === null || trailing === undefined ? undefined : trailing });
        return () => setMeta({ title: "", subtitle: null, trailing: undefined });
    }, [title, subtitle, trailing, setMeta]);
}

export function useWorkspaceTopbarMetaState(): WorkspaceTopbarMeta {
    return useContext(TopbarMetaStateContext);
}
