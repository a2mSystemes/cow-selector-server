import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import compression from 'compression';
import apiRoutes from './routes/api';
import { setupDevelopmentProxy } from './middleware/dev-proxy';

const app = express();
const PORT = process.env.PORT || 3000;
const isDevelopment = process.env.NODE_ENV === 'development';

// Compression (sauf en développement avec proxy)
if (!isDevelopment) {
  app.use(compression());
}

// Middleware de sécurité avec CSP adapté pour Angular (ressources locales)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        // Plus de CDN externe - tout est local
        ...(isDevelopment ? ["http://localhost:4200", "ws://localhost:4200"] : [])
      ],
      scriptSrcAttr: ["'unsafe-inline'"], // ✅ Pour les gestionnaires d'événements inline
      styleSrc: ["'self'", "'unsafe-inline'"],
      styleSrcAttr: ["'unsafe-inline'"], // ✅ Pour les styles inline
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        ...(isDevelopment ? ["http://localhost:4200", "ws://localhost:4200", "ws://localhost:3000"] : [])
      ],
      fontSrc: ["'self'", "data:"], // Pour les polices locales
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}));

if (isDevelopment) {
  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:4200'],
    credentials: true
  }));
}

// Parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


app.use('/api/v1', apiRoutes);


app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'VMix Server',
    environment: process.env.NODE_ENV || 'development',
    angular: isDevelopment ? 'dev-server' : 'static-files'
  });
});


if (isDevelopment) {
  console.log('🔧 Mode développement activé');
  
  // Configurer le proxy vers ng serve (hot reload)
  const proxyEnabled = setupDevelopmentProxy(app);
  
  if (!proxyEnabled) {
    console.log('⚠️  Proxy Angular non disponible, mode fallback');
    app.get('*', (req, res) => {
      res.status(503).json({
        error: 'Development server not ready',
        message: 'Please run: cd client && ng serve'
      });
    });
  }
  
} else {
  console.log('🚀 Mode production activé');
  
  // ✅ Configuration express.static avec types MIME explicites
  app.use(express.static(path.join(__dirname, '../client/dist/prod/vmix-client/browser'), {
    maxAge: '1y',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // ✅ Configuration des types MIME corrects
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (filePath.endsWith('.mjs')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      } else if (filePath.endsWith('.woff2')) {
        res.setHeader('Content-Type', 'font/woff2');
      } else if (filePath.endsWith('.woff')) {
        res.setHeader('Content-Type', 'font/woff');
      } else if (filePath.endsWith('.ttf')) {
        res.setHeader('Content-Type', 'font/ttf');
      }
      
      // Pas de cache pour index.html (SPA routing)
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));

  // SPA Fallback - Toutes les routes non-API → Angular
  app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '../client/dist/prod/vmix-client/browser/index.html');
    console.log(`Checking Angular build at ${indexPath}`);
    // Vérifier que le build Angular existe
    if (require('fs').existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(503).json({
        error: `Angular app not built at ${indexPath}`,
        message: 'Run: npm run build:client',
        timestamp: new Date().toISOString()
      });
    }
  });
}

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Erreur serveur:', err);
  res.status(err.status || 500).json({
    success: false,
    error: isDevelopment ? err.message : 'Erreur serveur interne',
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { 
      stack: err.stack,
      details: err 
    })
  });
});

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log(`VMix Server démarré sur le port ${PORT}`);
  console.log('='.repeat(60));
  
  if (isDevelopment) {
    console.log('Application (dev): http://localhost:3000');
    console.log('Hot reload: Activé via proxy Angular');
    console.log('Angular direct: http://localhost:4200 (auto-démarré)');
  } else {
    console.log('Application: http://localhost:3000');
  }
  
  console.log('API: http://localhost:3000/api/v1');
  console.log('Health: http://localhost:3000/health');
  
  console.log('GET  /                 →      Application Angular');
  console.log('GET  /status           →      Page de statut');
  console.log('GET  /elements         →      Liste des éléments');
  console.log('GET  /upload           →      Upload de fichiers');
  console.log('REST /api/v1/*         →      API REST');
  console.log('GET  /health           →      Health check');
  console.log('');
});

export default app;
