/** Indique si la route courante correspond à un lien de navigation (égalité ou sous-chemin). */
export function isNavPathActive(pathname: string, href: string | undefined): boolean {
    if (!href) return false;
    const path = pathname.split("?")[0].split("#")[0];
    const target = href.split("?")[0].split("#")[0];
    if (path === target) return true;
    return path.startsWith(`${target}/`);
}
