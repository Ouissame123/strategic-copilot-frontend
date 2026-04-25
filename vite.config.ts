import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import type { ProxyOptions } from "vite";

/** Source unique de l’app (auth API, workspaces, copilot). */
const appRoot = path.resolve(__dirname, "copilot-ui");

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, appRoot, "");
    /** Cible n8n pour `/webhook` et pour `/api` (même hôte que le guide prod par défaut). */
    const defaultN8nTarget = "https://n8nprod.aphelionxinnovations.com";
    const n8nOrigin = env.VITE_N8N_PROXY_TARGET?.trim().replace(/\/$/, "") || defaultN8nTarget;

    /**
     * En dev : auth → backend local ; `/api/*` → n8n prod (rewrite `/api/...` → `/webhook/api/...`).
     * Ex. GET `/api/workspace/manager/projects` → `https://n8nprod.aphelionxinnovations.com/webhook/api/workspace/manager/projects`
     *
     * `/webhook/*` : chemins utilisés tels quels par le client (`apiClient` sans `VITE_API_BASE_URL`).
     * Sans ce proxy, le navigateur appelle `:5173/webhook/...` → 404.
     */
    const proxy: Record<string, ProxyOptions> = {
        "/login": { target: "http://localhost:4000", changeOrigin: true, secure: false },
        "/refresh": { target: "http://localhost:4000", changeOrigin: true, secure: false },
        "/logout": { target: "http://localhost:4000", changeOrigin: true, secure: false },
        "/me": { target: "http://localhost:4000", changeOrigin: true, secure: false },
        "/auth": { target: "http://localhost:4000", changeOrigin: true, secure: false },
        "/rh": { target: "http://localhost:4000", changeOrigin: true, secure: false },
        "/api": {
            target: n8nOrigin,
            changeOrigin: true,
            secure: true,
            rewrite: (p) => `/webhook${p}`,
        },
    };

    proxy["/webhook"] = { target: n8nOrigin, changeOrigin: true, secure: true };

    return {
        root: appRoot,
        /** À la racine du repo pour Vercel (défaut : `dist` dans `copilot-ui/`). */
        build: {
            outDir: path.resolve(__dirname, "dist"),
            emptyOutDir: true,
        },
        plugins: [react(), tailwindcss()],
        server: { proxy },
        resolve: {
            /** Une seule copie de React dans le bundle (évite « Invalid hook call » / useEffect sur null). */
            dedupe: ["react", "react-dom"],
            alias: {
                "@": path.resolve(appRoot, "src"),
            },
        },
    };
});
