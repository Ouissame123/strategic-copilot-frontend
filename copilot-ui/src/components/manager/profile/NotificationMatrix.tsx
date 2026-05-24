import { cx } from "@/utils/cx";
import { PROFILE_CARD } from "./profile-shared";

export type NotifChannel = "email" | "inApp" | "slack";

export type NotifMatrixRow = {
    id: string;
    label: string;
    email: boolean;
    inApp: boolean;
    slack: boolean;
    slackDisabled?: boolean;
};

type NotificationMatrixProps = {
    rows: NotifMatrixRow[];
    onChange: (id: string, channel: NotifChannel, value: boolean) => void;
};

function MatrixCheckbox({
    checked,
    disabled,
    onChange,
    label,
}: {
    checked: boolean;
    disabled?: boolean;
    onChange: (v: boolean) => void;
    label: string;
}) {
    return (
        <label className={cx("inline-flex cursor-pointer items-center justify-center", disabled && "cursor-not-allowed opacity-40")}>
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                className="peer sr-only"
            />
            <span
                className={cx(
                    "flex size-6 items-center justify-center rounded-md border transition",
                    checked
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900",
                )}
                aria-hidden
            >
                {checked ? (
                    <svg viewBox="0 0 12 12" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 6l3 3 5-5" />
                    </svg>
                ) : null}
            </span>
            <span className="sr-only">{label}</span>
        </label>
    );
}

export function NotificationMatrix({ rows, onChange }: NotificationMatrixProps) {
    return (
        <section className={PROFILE_CARD + " overflow-hidden p-0"}>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/30">
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Type
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">In-App</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Slack</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/80">
                                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{row.label}</td>
                                <td className="px-4 py-3 text-center">
                                    <MatrixCheckbox
                                        checked={row.email}
                                        onChange={(v) => onChange(row.id, "email", v)}
                                        label={`${row.label} email`}
                                    />
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <MatrixCheckbox
                                        checked={row.inApp}
                                        onChange={(v) => onChange(row.id, "inApp", v)}
                                        label={`${row.label} in-app`}
                                    />
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <MatrixCheckbox
                                        checked={row.slack}
                                        disabled={row.slackDisabled}
                                        onChange={(v) => onChange(row.id, "slack", v)}
                                        label={`${row.label} slack`}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
