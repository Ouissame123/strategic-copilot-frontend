/** Logs temporaires WF_What_If — retirer une fois le diagnostic terminé. */
export function logWhatIf(step: string, detail?: unknown): void {
    const stamp = new Date().toISOString();
    if (detail !== undefined) {
        console.info(`[WF_What_If] ${stamp} ${step}`, detail);
    } else {
        console.info(`[WF_What_If] ${stamp} ${step}`);
    }
}
