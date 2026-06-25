import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { useForgotPassword } from "@/hooks/useForgotPassword";
import { cx } from "@/utils/cx";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const mutation = useForgotPassword();
    const data = mutation.data;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || mutation.isPending) return;
        mutation.mutate({ email: email.trim() });
    };

    return (
        <AuthCardLayout
            title="Mot de passe oublié"
            subtitle="En mode démo, aucun e-mail n'est envoyé. Indiquez votre adresse pour afficher les instructions."
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Adresse e-mail"
                    type="email"
                    placeholder="vous@exemple.com"
                    value={email}
                    onChange={setEmail}
                    isRequired
                    autoComplete="email"
                    isDisabled={mutation.isPending}
                />

                <Button
                    type="submit"
                    color="primary"
                    size="md"
                    className="w-full"
                    isLoading={mutation.isPending}
                    isDisabled={mutation.isPending || !email.trim()}
                >
                    {mutation.isPending ? "Envoi…" : "Envoyer le lien de réinitialisation"}
                </Button>
            </form>

            {data?.success ? (
                <div
                    className="mt-4 rounded-xl border border-secondary bg-secondary_subtle/40 p-4 text-sm text-secondary"
                    role="status"
                >
                    <p>{data.message}</p>
                    {data.demo ? (
                        <div className="mt-3 space-y-2 border-t border-secondary pt-3">
                            <p className="text-xs text-tertiary">{data.demo.note}</p>
                            <a
                                href={data.demo.reset_url}
                                className="block break-all text-sm font-medium text-brand-secondary hover:underline"
                            >
                                {data.demo.reset_url}
                            </a>
                            <p className="text-xs text-tertiary">Expire dans {data.demo.expires_in_minutes} minutes</p>
                        </div>
                    ) : null}
                </div>
            ) : null}

            <p className="pt-4 text-center text-sm text-tertiary">
                <Link
                    to="/login"
                    className={cx(
                        "font-semibold text-brand-secondary hover:text-brand-secondary_hover",
                        "rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                    )}
                >
                    Retour à la connexion
                </Link>
            </p>
        </AuthCardLayout>
    );
}
