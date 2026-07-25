import { useTranslation } from "react-i18next";

/** Traductions Mission Control — namespace réel : `common.managerWorkspace.*`. */
export function useMissionControlT() {
    const { t } = useTranslation("common");

    return {
        /** Clé relative à `missionControl.*` */
        mc: (key: string, options?: Record<string, unknown>) =>
            t(`managerWorkspace.missionControl.${key}`, options as never),
        /** Cycle de vie kanban */
        lifecycle: (step: string) => t(`managerWorkspace.lifecycle.${step}`),
        /** Clé `common` racine (retry, back, etc.) */
        common: (key: string, options?: Record<string, unknown>) => t(key, options as never),
    };
}
