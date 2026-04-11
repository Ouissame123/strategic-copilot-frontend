import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig, loadEnv } from "vite";

/** Source unique de l’app (auth API, workspaces, copilot). */
const appRoot = path.resolve(__dirname, "copilot-ui");

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, appRoot, "");
    const n8nOrigin = env.VITE_N8N_PROXY_TARGET?.trim().replace(/\/$/, "") ?? "";

    /** En dev : chemins relatifs `/login`… → backend local ; `/webhook`… → n8n (évite CORS navigateur → n8n). */
    const proxy: Record<string, { target: string; changeOrigin: boolean; secure: boolean }> = {
        "/login": { target: "http://localhost:4000", changeOrigin: true, secure: false },
        "/refresh": { target: "http://localhost:4000", changeOrigin: true, secure: false },
        "/logout": { target: "http://localhost:4000", changeOrigin: true, secure: false },
        "/me": { target: "http://localhost:4000", changeOrigin: true, secure: false },
        "/auth": { target: "http://localhost:4000", changeOrigin: true, secure: false },
        "/rh": { target: "http://localhost:4000", changeOrigin: true, secure: false },
    };

    if (n8nOrigin) {
        proxy["/webhook"] = { target: n8nOrigin, changeOrigin: true, secure: true };
    }

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
            alias: {
                "@": path.resolve(appRoot, "src"),
            },
        },
    };
});
