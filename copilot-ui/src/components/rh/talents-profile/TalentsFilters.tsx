import type { TalentStatus } from "@/types/rh-talents-profile.types";
import { cx } from "@/utils/cx";

const INPUT_CLASS =
    "h-9 w-full max-w-md rounded-lg border border-secondary bg-primary px-2.5 text-sm text-primary outline-none placeholder:text-tertiary focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/25";

const SELECT_CLASS =
    "h-9 rounded-lg border border-secondary bg-primary px-2.5 text-sm text-primary outline-none focus:border-brand-secondary/50";

type TalentsFiltersProps = {
    search: string;
    onSearchChange: (v: string) => void;
    status: TalentStatus;
    onStatusChange: (v: TalentStatus) => void;
};

export function TalentsFiltersBar({ search, onSearchChange, status, onStatusChange }: TalentsFiltersProps) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <input
                type="search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Rechercher nom, email, poste…"
                aria-label="Rechercher dans les profils talents"
                className={cx(INPUT_CLASS, "max-w-sm flex-1")}
            />
            <select
                value={status}
                onChange={(e) => onStatusChange(e.target.value as TalentStatus)}
                aria-label="Statut"
                className={SELECT_CLASS}
            >
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
            </select>
        </div>
    );
}
