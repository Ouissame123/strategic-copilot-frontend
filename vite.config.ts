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

    if (mode === "development") {
        console.log(`[vite] Proxy n8n → ${n8nOrigin} (/webhook, /api, /rh, …)`);
    }

    /**
     * En dev : auth → backend local ; `/api/*` → n8n prod (rewrite par défaut `/api/...` → `/webhook/api/...`).
     * Exception : `/api/rh/actions/*` → webhook dédié `…/webhook/c8bae94d-…/api/rh/actions/…` (PATCH annulation RH).
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
        // PATCH/PUT lourds + WF_What_If (~50s+) : délais plus permissifs pour éviter les faux timeouts proxy.
        timeout: 120_000,
        proxyTimeout: 120_000,
        configure: attachProxyDebug,
    };

    /** Webhook n8n dédié PATCH (et éventuellement GET) actions RH — le client appelle toujours `PATCH /api/rh/actions/:id`. */
    const N8N_RH_ACTIONS_WEBHOOK_PREFIX = "/webhook/c8bae94d-8de1-4f06-bb0a-a1e90eb6a80d";

    const proxy: Record<string, ProxyOptions> = {
        /** `PATCH /api/rh/actions/:id` → `…/webhook/c8bae94d-…/api/rh/actions/:id` (workflow n8n prod). */
        "/api/rh/actions": {
            ...webhookProxy,
            rewrite: (p) => `${N8N_RH_ACTIONS_WEBHOOK_PREFIX}${p}`,
        },
        "/api": {
            ...webhookProxy,
            rewrite: (p) => `/webhook${p}`,
        },
        /** Workflows manager RH (`GET/PATCH /manager/rh-actions`) → n8n `/webhook/manager/...`. */
        "/manager": {
            ...webhookProxy,
            rewrite: (p) => `/webhook${p}`,
        },
        /** WMN Alert v3 (`PATCH /wmn-alert-v3/manager/risk-alerts/:id`) → `/webhook/wmn-alert-v3/...`. */
        "/wmn-alert-v3": {
            ...webhookProxy,
            rewrite: (p) => `/webhook/wmn-alert-v3${p}`,
        },
        /** WF_RH_* : `/rh/analytics` → `/webhook/rh/analytics` (aligné comptes `/rh/users`). */
        "/rh": {
            ...webhookProxy,
            rewrite: (p) => `/webhook${p}`,
        },
        "/webhook": webhookProxy,
        /** WF_RH_Talents détail (`wf-rh-talents-detail-v1`) — mode test n8n (`webhook-test/...`). */
        "/webhook-test": webhookProxy,
        /**
         * WF_Manager_Project_Tasks — évite CORS en dev (`tasksHttp` → `/n8n-webhook/wmt-*-v1/...`).
         * Réécrit vers `/webhook/...` sur n8nprod.
         */
        "/n8n-webhook": {
            ...webhookProxy,
            rewrite: (p) => p.replace(/^\/n8n-webhook/, "/webhook"),
        },
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
            /** Relatif à `root` (`copilot-ui/`) → artefact final : `copilot-ui/dist` (voir `vercel.json`). */
            outDir: "dist",
            emptyOutDir: true,
            rollupOptions: {
                input: path.resolve(appRoot, "index.html"),
            },
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
