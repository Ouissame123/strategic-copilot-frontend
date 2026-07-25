import { Plus } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";

type ProjectsHeaderProps = {
    title: string;
    subtitle: string;
    onNewProject: () => void;
};

export function ProjectsHeader({ title, subtitle, onNewProject }: ProjectsHeaderProps) {
    return (
        <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight text-primary md:text-2xl">{title}</h1>
                <p className="mt-0.5 text-sm text-tertiary">{subtitle}</p>
            </div>
            <Button color="primary" size="sm" iconLeading={Plus} className="shrink-0" onClick={onNewProject}>
                Nouveau projet
            </Button>
        </header>
    );
}
