import { ArrowLeft } from "@untitledui/icons";
import { useNavigate } from "react-router";
import { Button } from "@/components/base/buttons/button";

export function NotFound() {
    const router = useNavigate();

    return (
        <section className="flex min-h-screen items-start bg-secondary_subtle py-16 md:items-center md:py-24">
            <div className="mx-auto max-w-container grow px-4 md:px-8">
                <div className="flex w-full max-w-3xl flex-col gap-8 rounded-2xl border border-secondary bg-primary p-8 shadow-xs ring-1 ring-secondary/80 md:gap-10 md:p-10">
                    <div className="flex flex-col gap-4 md:gap-6">
                        <div className="flex flex-col gap-3">
                            <span className="text-xs font-semibold uppercase tracking-wide text-quaternary">404</span>
                            <h1 className="text-display-md font-semibold text-primary md:text-display-lg lg:text-display-xl">
                                We can’t find that page
                            </h1>
                        </div>
                        <p className="text-lg text-tertiary md:text-xl">
                            Sorry, the page you are looking for doesn&apos;t exist or has been moved.
                        </p>
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-secondary pt-6 sm:flex-row">
                        <Button color="secondary" size="xl" iconLeading={ArrowLeft} onClick={() => router(-1)}>
                            Go back
                        </Button>
                        <Button size="xl" onClick={() => router(-1)}>
                            Take me home
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
