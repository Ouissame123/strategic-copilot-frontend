import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import type { ProxyOptions } from "vite";

/** Source unique de l’app (auth API, workspaces, copilot). */
const appRoot = path.resolve(__dirname, "copilot-ui");

/** Racine `node_modules` du workspace (évite 2× React après ajout de deps type recharts). */
const nm = path.resolve(__dirname, "node_modules");

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, appRoot, "");
    /** Cible n8n pour `/webhook` et `/api` : `VITE_N8N_PROXY_TARGET` ou hôte prod historique (DNS valide). */
    const defaultN8nTarget = "https://n8nprod.aphelionxinnovations.com";
    const n8nOrigin =
        env.VITE_N8N_PROXY_TARGET?.trim().replace(/\/$/, "") ||
        env.VITE_N8N_BASE_URL?.trim().replace(/\/$/, "") ||
        defaultN8nTarget;

    /**
     * En dev : auth → backend local ; `/api/*` → n8n prod (rewrite `/api/...` → `/webhook/api/...`).
     * Ex. GET `/api/workspace/manager/projects` → `https://n8nprod.aphelionxinnovations.com/webhook/api/workspace/manager/projects`
     *
     * `/webhook/*` : chemins utilisés tels quels par le client (`apiClient` sans `VITE_API_BASE_URL`).
     * Sans ce proxy, le navigateur appelle `:5173/webhook/...` → 404.
     */
    const withProxyDebug = env.VITE_PROXY_DEBUG === "1";
    const attachProxyDebug: NonNullable<ProxyOptions["configure"]> = (proxy) => {
        if (!withProxyDebug) return;
        proxy.on("error", (err, req) => {
            console.log("[proxy:error]", req.method, req.url, String(err));
        });
        proxy.on("proxyReq", (_proxyReq, req) => {
            console.log("[proxy:req]", req.method, req.url);
        });
        proxy.on("proxyRes", (proxyRes, req) => {
            console.log("[proxy:res]", proxyRes.statusCode, req.method, req.url);
        });
    };

    const webhookProxy: ProxyOptions = {
        target: n8nOrigin,
        changeOrigin: true,
        /** Vérification TLS stricte vers n8n (requis pour relayer correctement depuis HTTP local). */
        secure: true,
        // PATCH/PUT lourds: délais plus permissifs pour éviter les faux 5xx proxy.
        timeout: 60_000,
        proxyTimeout: 60_000,
        configure: attachProxyDebug,
    };

    const proxy: Record<string, ProxyOptions> = {
        "/api": {
            ...webhookProxy,
            rewrite: (p) => `/webhook${p}`,
        },
        "/webhook": webhookProxy,
        /** Workflows rapports n8n (GET/POST `/reports/...`) — même origine que les webhooks. */
        "/reports": webhookProxy,
    };

    return {
        root: appRoot,
        /**
         * Sortie sous `copilot-ui/dist` (relatif à `root`) pour éviter sur Windows/OneDrive des chemins
         * `../..` vers la racine du repo qui font échouer Rollup sur les noms d’assets HTML.
         */
        build: {
            outDir: "dist",
            emptyOutDir: true,
        },
        plugins: [react(), tailwindcss()],
        server: { proxy },
        resolve: {
            /** Une seule copie de React dans le bundle (évite « Invalid hook call » / useEffect sur null). */
            dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
            alias: {
                "@": path.resolve(appRoot, "src"),
                react: path.join(nm, "react"),
                "react-dom": path.join(nm, "react-dom"),
                "react/jsx-runtime": path.join(nm, "react", "jsx-runtime.js"),
                "react/jsx-dev-runtime": path.join(nm, "react", "jsx-dev-runtime.js"),
                /** Même racine `node_modules` que React (Vite `root` = `copilot-ui`). */
                "lucide-react": path.join(nm, "lucide-react"),
                recharts: path.join(nm, "recharts"),
            },
        },
        optimizeDeps: {
            include: ["react", "react-dom", "recharts", "lucide-react"],
        },
    };
});
