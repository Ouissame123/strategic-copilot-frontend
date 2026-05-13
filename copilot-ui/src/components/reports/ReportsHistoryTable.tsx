import { useMemo, useState, type ReactNode } from "react";
import {
    Search,
    Download,
    Mail,
    RefreshCw,
    Trash2,
    MoreHorizontal,
    FileText,
    FileSpreadsheet,
    Printer,
    Loader2,
    CheckCircle2,
    XCircle,
    Archive,
    Filter,
} from "lucide-react";
import type { ReportHistoryItem, ReportFormat, ReportType, ReportStatus } from "./types";
import { cn, formatBytes, formatDateTime, labelFormat, labelReportType } from "./utils";

interface Props {
    reports: ReportHistoryItem[];
    loading?: boolean;
    onDownload: (item: ReportHistoryItem) => void;
    onResend?: (item: ReportHistoryItem) => void;
    onRegenerate?: (item: ReportHistoryItem) => void;
    onDelete?: (item: ReportHistoryItem) => void;
    pageSize?: number;
}

const FORMAT_ICON: Record<ReportFormat, typeof FileText> = {
    pdf: FileText,
    csv: FileSpreadsheet,
    excel: FileSpreadsheet,
    print: Printer,
};

const STATUS_BADGE: Record<ReportStatus, { label: string; class: string; Icon: typeof CheckCircle2 }> = {
    ready: { label: "Prêt", class: "bg-emerald-50 text-emerald-700 ring-emerald-200", Icon: CheckCircle2 },
    generating: { label: "En cours", class: "bg-amber-50 text-amber-700 ring-amber-200", Icon: Loader2 },
    failed: { label: "Échec", class: "bg-rose-50 text-rose-700 ring-rose-200", Icon: XCircle },
    archived: { label: "Archivé", class: "bg-slate-100 text-slate-600 ring-slate-200", Icon: Archive },
};

type SortKey = "generatedAt" | "type" | "format" | "status" | "fileSize";
type SortDir = "asc" | "desc";

export function ReportsHistoryTable({
    reports,
    loading = false,
    onDownload,
    onResend,
    onRegenerate,
    onDelete,
    pageSize = 20,
}: Props) {
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<ReportType | "all">("all");
    const [formatFilter, setFormatFilter] = useState<ReportFormat | "all">("all");
    const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
    const [sortKey, setSortKey] = useState<SortKey>("generatedAt");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [page, setPage] = useState(0);
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        let list = reports.filter((r) => {
            if (typeFilter !== "all" && r.type !== typeFilter) return false;
            if (formatFilter !== "all" && r.format !== formatFilter) return false;
            if (statusFilter !== "all" && r.status !== statusFilter) return false;
            if (q) {
                const hay = `${labelReportType(r.type)} ${r.projectName || ""} ${r.generatedBy || ""} ${r.period || ""}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });

        list = [...list].sort((a, b) => {
            let av: number | string = "";
            let bv: number | string = "";
            switch (sortKey) {
                case "generatedAt":
                    av = new Date(a.generatedAt).getTime();
                    bv = new Date(b.generatedAt).getTime();
                    break;
                case "type":
                    av = a.type;
                    bv = b.type;
                    break;
                case "format":
                    av = a.format;
                    bv = b.format;
                    break;
                case "status":
                    av = a.status;
                    bv = b.status;
                    break;
                case "fileSize":
                    av = a.fileSize ?? 0;
                    bv = b.fileSize ?? 0;
                    break;
            }
            const cmp = av < bv ? -1 : av > bv ? 1 : 0;
            return sortDir === "asc" ? cmp : -cmp;
        });

        return list;
    }, [reports, search, typeFilter, formatFilter, statusFilter, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages - 1);
    const visible = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

    const toggleSort = (k: SortKey) => {
        if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else {
            setSortKey(k);
            setSortDir("desc");
        }
    };

    const hasFilters = Boolean(search) || typeFilter !== "all" || formatFilter !== "all" || statusFilter !== "all";

    return (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="font-semibold text-slate-900">Historique des rapports</h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                            {filtered.length} {filtered.length > 1 ? "rapports" : "rapport"}
                            {hasFilters && reports.length !== filtered.length ? <span className="ml-1">sur {reports.length}</span> : null}
                        </p>
                    </div>

                    <div className="relative max-w-xs flex-1">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(0);
                            }}
                            placeholder="Rechercher..."
                            className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            aria-label="Rechercher dans l'historique"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-slate-400" />
                    <SelectFilter
                        label="Type"
                        value={typeFilter}
                        onChange={(v) => {
                            setTypeFilter(v as ReportType | "all");
                            setPage(0);
                        }}
                        options={[
                            ["all", "Tous types"],
                            ["board_pack", "Pack comité"],
                            ["project_dossier", "Dossier projet"],
                            ["global_enterprise", "Rapport global"],
                            ["hr_talents", "RH & talents"],
                            ["risks_alerts", "Risques & alertes"],
                            ["decisions_ai", "Décisions IA"],
                        ]}
                    />
                    <SelectFilter
                        label="Format"
                        value={formatFilter}
                        onChange={(v) => {
                            setFormatFilter(v as ReportFormat | "all");
                            setPage(0);
                        }}
                        options={[
                            ["all", "Tous formats"],
                            ["pdf", "PDF"],
                            ["csv", "CSV"],
                            ["excel", "Excel"],
                            ["print", "Impression"],
                        ]}
                    />
                    <SelectFilter
                        label="Statut"
                        value={statusFilter}
                        onChange={(v) => {
                            setStatusFilter(v as ReportStatus | "all");
                            setPage(0);
                        }}
                        options={[
                            ["all", "Tous statuts"],
                            ["ready", "Prêt"],
                            ["generating", "En cours"],
                            ["failed", "Échec"],
                            ["archived", "Archivé"],
                        ]}
                    />

                    {hasFilters ? (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch("");
                                setTypeFilter("all");
                                setFormatFilter("all");
                                setStatusFilter("all");
                                setPage(0);
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline"
                        >
                            Réinitialiser
                        </button>
                    ) : null}
                </div>
            </header>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50">
                        <tr className="text-left">
                            <Th onClick={() => toggleSort("generatedAt")} active={sortKey === "generatedAt"} dir={sortDir}>
                                Date
                            </Th>
                            <Th onClick={() => toggleSort("type")} active={sortKey === "type"} dir={sortDir}>
                                Type
                            </Th>
                            <Th>Projet / Période</Th>
                            <Th onClick={() => toggleSort("format")} active={sortKey === "format"} dir={sortDir} className="w-24">
                                Format
                            </Th>
                            <Th onClick={() => toggleSort("status")} active={sortKey === "status"} dir={sortDir} className="w-28">
                                Statut
                            </Th>
                            <Th onClick={() => toggleSort("fileSize")} active={sortKey === "fileSize"} dir={sortDir} className="w-20 text-right">
                                Taille
                            </Th>
                            <Th className="w-24 text-right">Actions</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="border-b border-slate-100">
                                    {Array.from({ length: 7 }).map((__, j) => (
                                        <td key={j} className="px-3 py-3">
                                            <div className="h-3 animate-pulse rounded bg-slate-100" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : visible.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-3 py-12 text-center">
                                    <p className="text-sm text-slate-500">
                                        {hasFilters ? "Aucun rapport ne correspond aux filtres." : "Aucun rapport généré pour le moment."}
                                    </p>
                                    {hasFilters ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearch("");
                                                setTypeFilter("all");
                                                setFormatFilter("all");
                                                setStatusFilter("all");
                                            }}
                                            className="mt-2 text-xs text-indigo-600 hover:underline"
                                        >
                                            Effacer les filtres
                                        </button>
                                    ) : null}
                                </td>
                            </tr>
                        ) : (
                            visible.map((r) => {
                                const FmtIcon = FORMAT_ICON[r.format];
                                const statusInfo = STATUS_BADGE[r.status];
                                const StatusIcon = statusInfo.Icon;
                                const menuOpen = openMenu === r.reportId;
                                const canDownload = r.status === "ready" && !!r.fileUrl;

                                return (
                                    <tr key={r.reportId} className="border-b border-slate-100 transition-colors hover:bg-slate-50">
                                        <td className="align-middle px-3 py-2.5">
                                            <div className="text-sm text-slate-900 tabular-nums">{formatDateTime(r.generatedAt)}</div>
                                            {r.generatedBy ? <div className="mt-0.5 text-[11px] text-slate-500">par {r.generatedBy}</div> : null}
                                        </td>
                                        <td className="align-middle px-3 py-2.5">
                                            <span className="text-sm font-medium text-slate-900">{labelReportType(r.type)}</span>
                                        </td>
                                        <td className="align-middle px-3 py-2.5">
                                            <div className="max-w-xs truncate text-sm text-slate-700" title={r.projectName || undefined}>
                                                {r.projectName || <span className="text-slate-400">—</span>}
                                            </div>
                                            {r.period ? <div className="text-[11px] text-slate-500">{r.period}</div> : null}
                                        </td>
                                        <td className="align-middle px-3 py-2.5">
                                            <span className="inline-flex items-center gap-1 text-xs text-slate-700">
                                                <FmtIcon className="h-3.5 w-3.5 text-slate-500" />
                                                {labelFormat(r.format)}
                                            </span>
                                        </td>
                                        <td className="align-middle px-3 py-2.5">
                                            <span
                                                className={cn(
                                                    "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1",
                                                    statusInfo.class,
                                                )}
                                            >
                                                <StatusIcon className={cn("h-3 w-3", r.status === "generating" && "animate-spin")} />
                                                {statusInfo.label}
                                            </span>
                                        </td>
                                        <td className="align-middle px-3 py-2.5 text-right text-xs text-slate-600 tabular-nums">
                                            {formatBytes(r.fileSize)}
                                        </td>
                                        <td className="align-middle px-3 py-2.5">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => onDownload(r)}
                                                    disabled={!canDownload}
                                                    className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
                                                    title="Télécharger"
                                                    aria-label="Télécharger"
                                                >
                                                    <Download className="h-3.5 w-3.5" />
                                                </button>

                                                {onResend || onRegenerate || onDelete ? (
                                                    <div className="relative">
                                                        <button
                                                            type="button"
                                                            onClick={() => setOpenMenu(menuOpen ? null : r.reportId)}
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                                            aria-haspopup="menu"
                                                            aria-expanded={menuOpen}
                                                            aria-label="Plus d'actions"
                                                        >
                                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                                        </button>
                                                        {menuOpen ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    aria-label="Fermer"
                                                                    className="fixed inset-0 z-10"
                                                                    onClick={() => setOpenMenu(null)}
                                                                />
                                                                <div
                                                                    role="menu"
                                                                    className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                                                                >
                                                                    {onResend && canDownload ? (
                                                                        <MenuItem
                                                                            onClick={() => {
                                                                                setOpenMenu(null);
                                                                                onResend(r);
                                                                            }}
                                                                            Icon={Mail}
                                                                        >
                                                                            Renvoyer par email
                                                                        </MenuItem>
                                                                    ) : null}
                                                                    {onRegenerate ? (
                                                                        <MenuItem
                                                                            onClick={() => {
                                                                                setOpenMenu(null);
                                                                                onRegenerate(r);
                                                                            }}
                                                                            Icon={RefreshCw}
                                                                        >
                                                                            Régénérer
                                                                        </MenuItem>
                                                                    ) : null}
                                                                    {onDelete ? (
                                                                        <MenuItem
                                                                            onClick={() => {
                                                                                setOpenMenu(null);
                                                                                onDelete(r);
                                                                            }}
                                                                            Icon={Trash2}
                                                                            destructive
                                                                        >
                                                                            Supprimer
                                                                        </MenuItem>
                                                                    ) : null}
                                                                </div>
                                                            </>
                                                        ) : null}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {!loading && filtered.length > pageSize ? (
                <footer className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3">
                    <span className="text-xs text-slate-600 tabular-nums">
                        Page {safePage + 1} / {totalPages} · {filtered.length} entrées
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={safePage === 0}
                            className="rounded border border-slate-200 px-2.5 py-1 text-xs hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Précédent
                        </button>
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={safePage >= totalPages - 1}
                            className="rounded border border-slate-200 px-2.5 py-1 text-xs hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Suivant
                        </button>
                    </div>
                </footer>
            ) : null}
        </section>
    );
}

function Th({
    children,
    onClick,
    active,
    dir,
    className,
}: {
    children: ReactNode;
    onClick?: () => void;
    active?: boolean;
    dir?: SortDir;
    className?: string;
}) {
    return (
        <th className={cn("px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-600", className)}>
            {onClick ? (
                <button type="button" onClick={onClick} className="inline-flex items-center gap-1 hover:text-slate-900">
                    {children}
                    {active ? <span className="text-[10px]">{dir === "asc" ? "↑" : "↓"}</span> : null}
                </button>
            ) : (
                children
            )}
        </th>
    );
}

function SelectFilter({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: Array<[string, string]>;
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
            {options.map(([v, l]) => (
                <option key={v} value={v}>
                    {l}
                </option>
            ))}
        </select>
    );
}

function MenuItem({
    onClick,
    Icon,
    children,
    destructive,
}: {
    onClick: () => void;
    Icon: typeof Download;
    children: ReactNode;
    destructive?: boolean;
}) {
    return (
        <button
            type="button"
            role="menuitem"
            onClick={onClick}
            className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm",
                destructive ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-slate-50",
            )}
        >
            <Icon className="h-3.5 w-3.5" />
            {children}
        </button>
    );
}
