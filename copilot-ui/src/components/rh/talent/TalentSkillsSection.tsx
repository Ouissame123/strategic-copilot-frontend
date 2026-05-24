/**
 * Onglet Skills du Talent Drawer — CRUD compétences via webhooks RH.
 */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
    AlertTriangle,
    Award,
    Loader2,
    Pencil,
    Plus,
    Sparkles,
    Trash2,
    X,
} from "lucide-react";
import { RH_SKILLS_CATALOG_EMPTY_LABEL, type RhSkillsCatalogOption } from "@/api/rh-skills.api";
import { groupSkillsByCategory, proficiencyBadge, stars } from "@/lib/rh-talent-skills-display";
import {
    mapRhTalentSkillApiError,
    useAddRhTalentSkillMutation,
    useDeleteRhTalentSkillMutation,
    useRhSkillsCatalogQuery,
    useRhTalentSkillsQuery,
    useUpdateRhTalentSkillMutation,
} from "@/hooks/use-rh-talent-skills";
import { useToast } from "@/providers/toast-provider";
import type { AddRhTalentSkillPayload, RhTalentSkill } from "@/types/rh-talent-skills.types";
import {
    RH_ALERT_ERROR,
    RH_BTN_PRIMARY,
    RH_BTN_SECONDARY,
    RH_CARD,
    RH_INPUT,
    RH_TEXT_MUTED,
    RH_TEXT_PRIMARY,
    RH_TEXT_SECONDARY,
    WS_MUTED_SURFACE,
    WS_SUBTLE,
    WS_TEXT_FAINT,
} from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

export type TalentSkillsSectionProps = {
    talentId: string;
    apiBase?: string;
    token?: string;
    /** CTA post-création talent — compléter le profil compétences. */
    showPostCreateCta?: boolean;
};

function SkillsSkeleton() {
    return (
        <div className="animate-pulse space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className={cx("h-16 rounded-lg", WS_MUTED_SURFACE)} />
                ))}
            </div>
            <div className={cx("h-24 rounded-lg", WS_MUTED_SURFACE)} />
            <div className={cx("h-32 rounded-lg", WS_MUTED_SURFACE)} />
        </div>
    );
}

type SkillFormState = {
    catalogSkillId: string;
    customName: string;
    category: string;
    proficiency_level: number;
    years_experience: string;
};

const EMPTY_FORM: SkillFormState = {
    catalogSkillId: "",
    customName: "",
    category: "",
    proficiency_level: 3,
    years_experience: "",
};

function SkillFormModal({
    title,
    initial,
    catalogOptions,
    catalogLoading,
    catalogFetched,
    submitting,
    onClose,
    onSubmit,
}: {
    title: string;
    initial?: SkillFormState;
    catalogOptions: RhSkillsCatalogOption[];
    catalogLoading?: boolean;
    catalogFetched?: boolean;
    submitting: boolean;
    onClose: () => void;
    onSubmit: (payload: AddRhTalentSkillPayload) => void;
}) {
    const [form, setForm] = useState<SkillFormState>(initial ?? { ...EMPTY_FORM });

    const selectedCatalog = catalogOptions.find((c) => c.value === form.catalogSkillId);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const fromCatalog = selectedCatalog;
        const name = fromCatalog?.label?.trim() || form.customName.trim();
        if (!name) return;
        onSubmit({
            skill_id: null,
            skill_name: name,
            skill_category: form.category.trim() || fromCatalog?.category || null,
            proficiency_level: form.proficiency_level,
            years_experience: form.years_experience.trim() ? Number(form.years_experience) : null,
        });
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <button type="button" className="absolute inset-0 bg-[color:var(--ws-overlay)]" onClick={onClose} aria-label="Fermer" />
            <form
                onSubmit={handleSubmit}
                className={cx(RH_CARD, "relative z-10 w-full max-w-md p-5")}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-center justify-between">
                    <h3 className={cx("text-sm font-semibold", RH_TEXT_PRIMARY)}>{title}</h3>
                    <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <X size={16} />
                    </button>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className={cx("mb-1 block text-xs font-medium", RH_TEXT_MUTED)}>Compétence (catalogue)</label>
                        <select
                            className={cx("w-full text-sm", RH_INPUT)}
                            value={form.catalogSkillId}
                            disabled={catalogLoading}
                            onChange={(e) => {
                                const id = e.target.value;
                                const item = catalogOptions.find((c) => c.value === id);
                                if (!id) {
                                    setForm((f) => ({
                                        ...f,
                                        catalogSkillId: "",
                                    }));
                                    return;
                                }
                                setForm((f) => ({
                                    ...f,
                                    catalogSkillId: id,
                                    customName: item?.label ?? "",
                                    category: item?.category ?? "",
                                }));
                            }}
                        >
                            <option value="">— Saisie libre —</option>
                            {catalogOptions.map((c) => (
                                <option key={c.value} value={c.value}>
                                    {c.label}
                                    {c.category ? ` (${c.category})` : ""}
                                </option>
                            ))}
                        </select>
                        {catalogLoading ? (
                            <p className={cx("mt-1 text-[11px]", RH_TEXT_MUTED)}>Chargement du catalogue…</p>
                        ) : catalogFetched && catalogOptions.length === 0 ? (
                            <p className={cx("mt-1 text-[11px]", RH_TEXT_MUTED)}>{RH_SKILLS_CATALOG_EMPTY_LABEL}</p>
                        ) : null}
                    </div>
                    <div>
                        <label className={cx("mb-1 block text-xs font-medium", RH_TEXT_MUTED)}>Nom</label>
                        <input
                            className={cx("w-full text-sm", RH_INPUT)}
                            value={form.customName}
                            onChange={(e) => setForm((f) => ({ ...f, customName: e.target.value }))}
                            required
                        />
                    </div>
                    <div>
                        <label className={cx("mb-1 block text-xs font-medium", RH_TEXT_MUTED)}>Catégorie</label>
                        <input
                            className={cx("w-full text-sm", RH_INPUT)}
                            value={form.category}
                            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={cx("mb-1 block text-xs font-medium", RH_TEXT_MUTED)}>Niveau /5</label>
                            <input
                                type="number"
                                min={1}
                                max={5}
                                className={cx("w-full text-sm", RH_INPUT)}
                                value={form.proficiency_level}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        proficiency_level: Math.min(5, Math.max(1, Number(e.target.value) || 1)),
                                    }))
                                }
                            />
                        </div>
                        <div>
                            <label className={cx("mb-1 block text-xs font-medium", RH_TEXT_MUTED)}>Années exp.</label>
                            <input
                                type="number"
                                min={0}
                                step={0.5}
                                className={cx("w-full text-sm", RH_INPUT)}
                                value={form.years_experience}
                                onChange={(e) => setForm((f) => ({ ...f, years_experience: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className={cx("rounded-lg px-3 py-2 text-sm", RH_BTN_SECONDARY)}>
                        Annuler
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className={cx("inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold", RH_BTN_PRIMARY)}
                    >
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
                        Enregistrer
                    </button>
                </div>
            </form>
        </div>
    );
}

function skillToForm(s: RhTalentSkill): SkillFormState {
    return {
        catalogSkillId: s.skill_id ?? "",
        customName: s.skill_name,
        category: s.skill_category ?? "",
        proficiency_level: s.proficiency_level,
        years_experience: s.years_experience != null ? String(s.years_experience) : "",
    };
}

export function TalentSkillsSection({ talentId, apiBase, token, showPostCreateCta }: TalentSkillsSectionProps) {
    const ctx = useMemo(() => ({ apiBase, token }), [apiBase, token]);
    const { push: pushToast } = useToast();
    const { data, isLoading, isError, error, refetch } = useRhTalentSkillsQuery(talentId, ctx);

    const [addOpen, setAddOpen] = useState(showPostCreateCta ?? false);
    const [editSkill, setEditSkill] = useState<RhTalentSkill | null>(null);

    useEffect(() => {
        if (isError && error) {
            pushToast(mapRhTalentSkillApiError(error), "error");
        }
    }, [isError, error, pushToast]);

    const catalogQuery = useRhSkillsCatalogQuery(ctx, {
        enabled: addOpen || editSkill != null,
    });
    const addMutation = useAddRhTalentSkillMutation(talentId, ctx, {
        onSuccess: () => {
            pushToast("Compétence ajoutée", "success");
            setAddOpen(false);
        },
    });
    const updateMutation = useUpdateRhTalentSkillMutation(talentId, ctx);
    const deleteMutation = useDeleteRhTalentSkillMutation(talentId, ctx);

    const skills = data?.skills ?? [];
    const summary = data?.summary;
    const groups = useMemo(() => groupSkillsByCategory(skills), [skills]);
    const topSkills = useMemo(
        () => [...skills].sort((a, b) => b.proficiency_level - a.proficiency_level).slice(0, 6),
        [skills],
    );

    const catalogOptions = catalogQuery.data ?? [];
    const catalogFetched = catalogQuery.isFetched && !catalogQuery.isLoading;

    const handleAdd = async (payload: AddRhTalentSkillPayload) => {
        try {
            await addMutation.mutateAsync(payload);
        } catch (err) {
            pushToast(mapRhTalentSkillApiError(err), "error");
        }
    };

    const handleUpdate = async (payload: AddRhTalentSkillPayload) => {
        if (!editSkill) return;
        try {
            await updateMutation.mutateAsync({ skillId: editSkill.id, payload });
            pushToast("Compétence mise à jour", "success");
            setEditSkill(null);
        } catch (err) {
            pushToast(mapRhTalentSkillApiError(err), "error");
        }
    };

    const handleDelete = async (skill: RhTalentSkill) => {
        if (!window.confirm(`Supprimer la compétence « ${skill.skill_name} » ?`)) return;
        try {
            await deleteMutation.mutateAsync(skill.id);
            pushToast("Compétence supprimée", "success");
        } catch (err) {
            pushToast(mapRhTalentSkillApiError(err), "error");
        }
    };

    if (isLoading) return <SkillsSkeleton />;

    if (isError) {
        return (
            <div className={cx(RH_CARD, "border-dashed p-6 text-center")}>
                <AlertTriangle size={28} className="mx-auto text-rose-500" aria-hidden />
                <p className={cx("mt-3 text-sm font-medium", RH_TEXT_PRIMARY)}>Impossible de charger les compétences</p>
                <p className={cx("mt-1 text-xs", RH_TEXT_MUTED)}>{mapRhTalentSkillApiError(error)}</p>
                <button
                    type="button"
                    onClick={() => void refetch()}
                    className={cx("mt-4 inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold", RH_BTN_SECONDARY)}
                >
                    Réessayer
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {showPostCreateCta ? (
                <div
                    className={cx(
                        RH_CARD,
                        "flex items-start gap-3 border-ws-accent/30 bg-[color:var(--ws-accent-muted)] p-4",
                    )}
                >
                    <Sparkles size={18} className="shrink-0 text-ws-accent" aria-hidden />
                    <div>
                        <p className={cx("text-sm font-semibold", RH_TEXT_PRIMARY)}>
                            Ajoutez les compétences pour compléter le profil
                        </p>
                        <p className={cx("mt-1 text-xs", RH_TEXT_MUTED)}>
                            Le talent est créé. Définissez ses compétences pour activer le matching et les analyses RH.
                        </p>
                    </div>
                </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className={cx("flex items-center gap-2 text-sm font-semibold", RH_TEXT_PRIMARY)}>
                    <Award size={16} className="text-ws-accent" aria-hidden />
                    Compétences
                </div>
                <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    className={cx("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold", RH_BTN_PRIMARY)}
                >
                    <Plus size={14} aria-hidden />
                    Ajouter une compétence
                </button>
            </div>

            {summary ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                        { label: "Total", value: String(summary.total) },
                        { label: "Niveau moyen", value: `${summary.avg_level.toFixed(1)}/5` },
                        { label: "Top catégorie", value: summary.top_category || "—" },
                        { label: "Écarts", value: String(summary.gaps_count) },
                    ].map((kpi) => (
                        <div key={kpi.label} className={cx(RH_CARD, "p-3")}>
                            <div className={cx("text-[10px] uppercase tracking-wide", WS_TEXT_FAINT)}>{kpi.label}</div>
                            <div className={cx("mt-1 text-sm font-semibold tabular-nums", RH_TEXT_PRIMARY)}>{kpi.value}</div>
                        </div>
                    ))}
                </div>
            ) : null}

            {topSkills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                    {topSkills.map((s) => {
                        const badge = proficiencyBadge(s.proficiency_level);
                        return (
                            <span
                                key={s.id}
                                className={cx(
                                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                                    badge.cls,
                                )}
                            >
                                {s.skill_name}
                                <span className="opacity-70">{stars(s.proficiency_level)}</span>
                            </span>
                        );
                    })}
                </div>
            ) : null}

            {skills.length === 0 ? (
                <div className={cx(RH_CARD, "border-dashed py-10 text-center")}>
                    <Award size={28} className="mx-auto text-ws-faint" aria-hidden />
                    <p className={cx("mt-3 text-sm font-medium", RH_TEXT_PRIMARY)}>Aucune compétence enregistrée</p>
                    <p className={cx("mt-1 text-xs", RH_TEXT_MUTED)}>
                        Ajoutez les compétences clés pour enrichir le profil et les recommandations projet.
                    </p>
                    <button
                        type="button"
                        onClick={() => setAddOpen(true)}
                        className={cx("mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold", RH_BTN_PRIMARY)}
                    >
                        <Plus size={16} aria-hidden />
                        Première compétence
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {groups.map((g) => (
                        <div key={g.category}>
                            <h4 className={cx("mb-2 text-xs font-semibold uppercase tracking-wide", RH_TEXT_MUTED)}>
                                {g.category}
                            </h4>
                            <div className="space-y-2">
                                {g.items.map((s) => {
                                    const badge = proficiencyBadge(s.proficiency_level);
                                    const pct = (s.proficiency_level / 5) * 100;
                                    return (
                                        <div
                                            key={s.id}
                                            className={cx(
                                                RH_CARD,
                                                "flex flex-wrap items-center gap-2 p-3 sm:flex-nowrap",
                                            )}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={cx("text-sm font-medium", RH_TEXT_PRIMARY)}>
                                                        {s.skill_name}
                                                    </span>
                                                    <span
                                                        className={cx(
                                                            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                                                            badge.cls,
                                                        )}
                                                    >
                                                        {badge.label}
                                                    </span>
                                                    {s.is_gap ? (
                                                        <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                                                            Écart
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <div className={cx("h-1.5 flex-1 overflow-hidden rounded-full", WS_MUTED_SURFACE)}>
                                                        <div
                                                            className="h-full rounded-full bg-ws-accent"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[11px] text-amber-500" title="Niveau /5">
                                                        {stars(s.proficiency_level)}
                                                    </span>
                                                    {s.years_experience != null ? (
                                                        <span className={cx("text-[10px]", WS_TEXT_FAINT)}>
                                                            {s.years_experience} an{s.years_experience > 1 ? "s" : ""}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 gap-1">
                                                <button
                                                    type="button"
                                                    title="Modifier"
                                                    onClick={() => setEditSkill(s)}
                                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ws-accent dark:text-slate-500 dark:hover:bg-slate-800"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    title="Supprimer"
                                                    onClick={() => void handleDelete(s)}
                                                    className="rounded-lg p-1.5 text-ws-faint hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {addOpen ? (
                <SkillFormModal
                    title="Ajouter une compétence"
                    catalogOptions={catalogOptions}
                    catalogLoading={catalogQuery.isLoading || catalogQuery.isFetching}
                    catalogFetched={catalogFetched}
                    submitting={addMutation.isPending}
                    onClose={() => setAddOpen(false)}
                    onSubmit={(p) => void handleAdd(p)}
                />
            ) : null}

            {editSkill ? (
                <SkillFormModal
                    title="Modifier la compétence"
                    initial={skillToForm(editSkill)}
                    catalogOptions={catalogOptions}
                    catalogLoading={catalogQuery.isLoading || catalogQuery.isFetching}
                    catalogFetched={catalogFetched}
                    submitting={updateMutation.isPending}
                    onClose={() => setEditSkill(null)}
                    onSubmit={(p) => void handleUpdate(p)}
                />
            ) : null}
        </div>
    );
}
