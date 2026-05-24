import { Loader2 } from "lucide-react";
import { NotificationMatrix, type NotifChannel, type NotifMatrixRow } from "./NotificationMatrix";
import { PROFILE_CARD } from "./profile-shared";

type ProfileTabNotificationsProps = {
    rows: NotifMatrixRow[];
    onChange: (id: string, channel: NotifChannel, value: boolean) => void;
    onSave: () => void;
    saving?: boolean;
    canSave: boolean;
};

export function ProfileTabNotifications({ rows, onChange, onSave, saving, canSave }: ProfileTabNotificationsProps) {
    return (
        <section className="space-y-5">
            <div className={PROFILE_CARD + " p-5 sm:p-6"}>
                <header className="mb-4">
                    <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">Notifications</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Choisissez comment recevoir les alertes et rapports de Strategic Copilot.
                    </p>
                </header>
                <NotificationMatrix rows={rows} onChange={onChange} />
            </div>

            <div className="flex justify-end">
                <button
                    type="button"
                    disabled={!canSave || saving}
                    onClick={onSave}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
                >
                    {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                    {saving ? "Enregistrement…" : "Enregistrer les préférences"}
                </button>
            </div>
        </section>
    );
}
