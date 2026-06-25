import { useEffect, useState } from "react";
import { Heading } from "react-aria-components";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { useCreateUser } from "@/hooks/useRhAccounts";
import { useUnlinkedTalents } from "@/hooks/useUnlinkedTalents";
import type { RhStaffRole } from "@/types/rh-accounts.types";
import { cx } from "@/utils/cx";

type CreateUserDialogProps = {
    isOpen: boolean;
    onClose: () => void;
};

type SourceMode = "from_talent" | "external";

const INPUT_CLASS =
    "w-full rounded-lg border border-secondary bg-primary px-2.5 py-2 text-sm text-primary outline-none focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/25";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INITIAL_STATE = {
    role: "manager" as RhStaffRole,
    source: "from_talent" as SourceMode,
    talentId: "",
    talentSearch: "",
    externalName: "",
    externalEmail: "",
    password: "",
};

export function CreateUserDialog({ isOpen, onClose }: CreateUserDialogProps) {
    const create = useCreateUser();
    const [role, setRole] = useState(INITIAL_STATE.role);
    const [source, setSource] = useState<SourceMode>(INITIAL_STATE.source);
    const [talentId, setTalentId] = useState(INITIAL_STATE.talentId);
    const [talentSearch, setTalentSearch] = useState(INITIAL_STATE.talentSearch);
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [externalName, setExternalName] = useState(INITIAL_STATE.externalName);
    const [externalEmail, setExternalEmail] = useState(INITIAL_STATE.externalEmail);
    const [password, setPassword] = useState(INITIAL_STATE.password);

    useEffect(() => {
        if (!isOpen) return;
        setRole(INITIAL_STATE.role);
        setSource(INITIAL_STATE.source);
        setTalentId(INITIAL_STATE.talentId);
        setTalentSearch(INITIAL_STATE.talentSearch);
        setDebouncedSearch("");
        setExternalName(INITIAL_STATE.externalName);
        setExternalEmail(INITIAL_STATE.externalEmail);
        setPassword(INITIAL_STATE.password);
    }, [isOpen]);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedSearch(talentSearch.trim()), 300);
        return () => window.clearTimeout(timer);
    }, [talentSearch]);

    const unlinked = useUnlinkedTalents(
        { search: debouncedSearch, limit: 200 },
        isOpen && source === "from_talent",
    );
    const linkableTalents = unlinked.data?.talents ?? [];
    const selectedTalent = linkableTalents.find((t) => t.talent_id === talentId);

    const finalName = source === "from_talent" ? (selectedTalent?.name ?? "") : externalName.trim();
    const finalEmail =
        source === "from_talent" ? (selectedTalent?.email ?? "") : externalEmail.trim().toLowerCase();

    const canSubmit =
        finalName.length > 0 &&
        EMAIL_RE.test(finalEmail) &&
        password.length >= 8 &&
        (source === "external" || Boolean(talentId)) &&
        !create.isPending;

    const handleClose = () => {
        if (create.isPending) return;
        onClose();
    };

    const handleSubmit = () => {
        if (!canSubmit) return;
        void create
            .mutateAsync({
                full_name: finalName,
                email: finalEmail,
                password,
                role,
            })
            .then(() => onClose());
    };

    const unlinkedHint = unlinked.isLoading
        ? "Chargement…"
        : `${unlinked.data?.count ?? 0} employé(s) sans compte`;

    return (
        <ModalOverlay isOpen={isOpen} onOpenChange={(open) => !open && handleClose()} isDismissable={!create.isPending}>
            <Modal>
                <Dialog className="w-full max-w-lg p-4 sm:p-6">
                    <div className="w-full max-h-[85vh] overflow-y-auto rounded-2xl border border-secondary bg-primary p-6 shadow-xl">
                        <Heading slot="title" className="text-lg font-semibold text-primary">
                            Nouveau compte
                        </Heading>

                        <div className="mt-4 space-y-3">
                            <div>
                                <span className="text-sm font-medium text-secondary">Type de compte *</span>
                                <div className="mt-1 flex gap-2">
                                    {(["manager", "rh"] as const).map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setRole(r)}
                                            className={cx(
                                                "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition",
                                                role === r
                                                    ? "border-brand-secondary bg-brand-primary/10 text-brand-secondary"
                                                    : "border-secondary text-secondary hover:bg-secondary_subtle",
                                            )}
                                        >
                                            {r === "manager" ? "Manager" : "RH"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <span className="text-sm font-medium text-secondary">Source du compte *</span>
                                <div className="mt-2 space-y-2">
                                    <label className="flex cursor-pointer items-start gap-2 text-sm">
                                        <input
                                            type="radio"
                                            name="source"
                                            className="mt-1"
                                            checked={source === "from_talent"}
                                            onChange={() => {
                                                setSource("from_talent");
                                                setTalentId("");
                                            }}
                                        />
                                        <span>
                                            <strong className="text-primary">Promouvoir un employé existant</strong>
                                            <span className="mt-0.5 block text-xs text-tertiary">
                                                Lui donner accès à l&apos;application (recommandé)
                                            </span>
                                        </span>
                                    </label>
                                    <label className="flex cursor-pointer items-start gap-2 text-sm">
                                        <input
                                            type="radio"
                                            name="source"
                                            className="mt-1"
                                            checked={source === "external"}
                                            onChange={() => {
                                                setSource("external");
                                                setTalentId("");
                                            }}
                                        />
                                        <span>
                                            <strong className="text-primary">Créer un utilisateur externe</strong>
                                            <span className="mt-0.5 block text-xs text-tertiary">
                                                Manager/RH qui n&apos;est pas dans la base talents
                                            </span>
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {source === "from_talent" && (
                                <>
                                    <label className="block text-sm">
                                        <span className="font-medium text-secondary">Employé à promouvoir *</span>
                                        <span className="ml-1 text-xs text-tertiary">({unlinkedHint})</span>
                                        <input
                                            className={cx(INPUT_CLASS, "mt-1")}
                                            value={talentSearch}
                                            onChange={(e) => setTalentSearch(e.target.value)}
                                            placeholder="Filtrer par nom, email, métier…"
                                        />
                                        <select
                                            className={cx(INPUT_CLASS, "mt-2")}
                                            value={talentId}
                                            onChange={(e) => setTalentId(e.target.value)}
                                            disabled={linkableTalents.length === 0 || unlinked.isLoading}
                                        >
                                            <option value="">
                                                {linkableTalents.length === 0 && !unlinked.isLoading
                                                    ? "Aucun employé sans compte disponible"
                                                    : "— Sélectionner —"}
                                            </option>
                                            {linkableTalents.map((t) => (
                                                <option key={t.talent_id} value={t.talent_id}>
                                                    {t.name} — {t.email}
                                                    {t.job_title ? ` · ${t.job_title}` : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    {selectedTalent && (
                                        <div className="rounded-lg border border-secondary bg-secondary_subtle p-3 text-sm">
                                            <p className="font-medium text-primary">{selectedTalent.name}</p>
                                            <p className="text-secondary">{selectedTalent.email}</p>
                                            <p className="text-xs text-tertiary">
                                                {selectedTalent.job_title}
                                                {selectedTalent.department ? ` · ${selectedTalent.department}` : ""}
                                                {selectedTalent.seniority_level
                                                    ? ` · ${selectedTalent.seniority_level}`
                                                    : ""}
                                            </p>
                                            {selectedTalent.has_manager && selectedTalent.manager_name && (
                                                <p className="text-xs text-tertiary">
                                                    Manager actuel : {selectedTalent.manager_name}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            {source === "external" && (
                                <>
                                    <label className="block text-sm">
                                        <span className="font-medium text-secondary">Nom complet *</span>
                                        <input
                                            className={cx(INPUT_CLASS, "mt-1")}
                                            value={externalName}
                                            onChange={(e) => setExternalName(e.target.value)}
                                            placeholder="Ex : Jean Dupont"
                                        />
                                    </label>
                                    <label className="block text-sm">
                                        <span className="font-medium text-secondary">Email *</span>
                                        <input
                                            type="email"
                                            className={cx(INPUT_CLASS, "mt-1")}
                                            value={externalEmail}
                                            onChange={(e) => setExternalEmail(e.target.value.toLowerCase())}
                                            placeholder="jean.dupont@entreprise.com"
                                        />
                                    </label>
                                </>
                            )}

                            <label className="block text-sm">
                                <span className="font-medium text-secondary">Mot de passe initial *</span>
                                <span className="ml-1 text-xs text-tertiary">
                                    (min 8 caractères — à communiquer en sécurité)
                                </span>
                                <input
                                    type="password"
                                    className={cx(INPUT_CLASS, "mt-1")}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </label>
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <Button color="secondary" isDisabled={create.isPending} onPress={handleClose}>
                                Annuler
                            </Button>
                            <Button
                                color="primary"
                                isDisabled={!canSubmit}
                                isLoading={create.isPending}
                                onPress={handleSubmit}
                            >
                                Créer le compte
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
