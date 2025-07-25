import { createProxyMiddleware } from "http-proxy-middleware";
import { spawn, ChildProcess } from "child_process";
import { Request, Response, NextFunction } from "express";

let ngServeProcess: ChildProcess | null = null;
let isAngularReady = false;

export function setupDevelopmentProxy(app: any) {
  if (process.env.NODE_ENV !== "development") {
    console.log("🚀 Mode production - servir les fichiers statiques");
    return false;
  }

  console.log("🔧 Mode développement - Démarrage du proxy Angular...");

  // Démarrer ng serve en arrière-plan
  startAngularDevServer();

  // Créer le proxy middleware
  const angularProxy = createProxyMiddleware({
    target: "http://localhost:4200",
    changeOrigin: true,
    ws: true,
    // logLevel: 'silent',
    on: {
      error: (err, req, res) => {
        console.log("❌ Erreur proxy Angular:", err.message);

        // Fallback si Angular dev server pas prêt
        const fallbackHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>VMix - Démarrage...</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial; text-align: center; padding: 50px; }
            .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; 
                      border-radius: 50%; width: 40px; height: 40px; 
                      animation: spin 2s linear infinite; margin: 20px auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <h1>🔧 Démarrage du serveur de développement Angular...</h1>
          <div class="spinner"></div>
          <p>Veuillez patienter quelques secondes...</p>
          <script>
            setTimeout(() => window.location.reload(), 3000);
          </script>
        </body>
        </html>
      `;

        (res as Response).status(503).send(fallbackHtml);
      },
      proxyReq: (proxyReq, req) => {
      if (process.env.DEBUG_PROXY) {
        console.log(`📡 Proxy: ${req.method} ${req.url}`);
      }
    },
    },

  });

  // Middleware de vérification
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Ne pas proxifier les routes API et health
    if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
      return next();
    }

    // Proxifier vers Angular dev server
    if (isAngularReady) {
      return angularProxy(req, res, next);
    } else {
      // Attendre qu'Angular soit prêt
      const checkInterval = setInterval(() => {
        if (isAngularReady) {
          clearInterval(checkInterval);
          angularProxy(req, res, next);
        }
      }, 500);

      // Timeout après 30 secondes
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!isAngularReady) {
          res.status(503).json({
            error: "Angular dev server timeout",
            message: "Le serveur Angular met trop de temps à démarrer",
          });
        }
      }, 30000);
    }
  });

  return true;
}

function startAngularDevServer(): void {
  console.log("🅰️  Démarrage du serveur Angular...");

  ngServeProcess = spawn(
    "ng",
    [
      "serve",
      "--port",
      "4200",
      "--host",
      "0.0.0.0",
      "--disable-host-check",
      "--live-reload",
      "true",
      "--hmr",
      "false", // Désactiver HMR si problèmes
      "--poll",
      "2000", // Polling pour les systèmes de fichiers lents
    ],
    {
      cwd: "./client",
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
    }
  );

  // Gérer la sortie standard
  ngServeProcess.stdout?.on("data", (data: Buffer) => {
    const output = data.toString();

    // Détecter quand Angular est prêt
    if (output.includes("Local:") || output.includes("webpack compiled")) {
      if (!isAngularReady) {
        isAngularReady = true;
        console.log("✅ Serveur Angular prêt sur http://localhost:4200");
        console.log("🔗 Accessible via Express sur http://localhost:3000");
      }
    }

    // Log des erreurs importantes
    if (output.includes("ERROR") || output.includes("Failed")) {
      console.log("❌ Angular:", output.trim());
    }

    // Log en mode verbose
    if (process.env.DEBUG_ANGULAR) {
      console.log("🅰️ :", output.trim());
    }
  });

  // Gérer les erreurs
  ngServeProcess.stderr?.on("data", (data: Buffer) => {
    const error = data.toString();
    console.log("❌ Erreur Angular:", error.trim());
    isAngularReady = true;
  });

  // Gérer la fermeture
  ngServeProcess.on("close", (code: number) => {
    isAngularReady = false;
    if (code !== 0) {
      console.log(`❌ Serveur Angular fermé avec le code ${code}`);
    } else {
      console.log("🛑 Serveur Angular fermé proprement");
    }
  });

  // Gérer l'erreur de démarrage
  ngServeProcess.on("error", (error: Error) => {
    console.error("❌ Impossible de démarrer Angular:", error.message);
    console.error(
      "💡 Vérifiez que Angular CLI est installé: npm install -g @angular/cli"
    );
  });
}

// Fonction de nettoyage pour fermer ng serve
export function stopAngularDevServer(): void {
  if (ngServeProcess) {
    console.log("🛑 Arrêt du serveur Angular...");
    ngServeProcess.kill("SIGTERM");
    ngServeProcess = null;
    isAngularReady = false;
  }
}

// Gérer l'arrêt propre du processus
process.on("SIGINT", () => {
  stopAngularDevServer();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopAngularDevServer();
  process.exit(0);
});
