import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRoutes from './routes/api';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de sécurité
app.use(helmet());

// CORS pour permettre les requêtes depuis le client web
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:4200', // URL Angular par défaut
  credentials: true
}));

// Parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes API
app.use('/api/v1', apiRoutes);

// Route de santé
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'VMix Server'
  });
});

// Route racine
app.get('/', (req, res) => {
  res.json({
    message: 'VMix Server API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      upload: 'POST /api/v1/upload',
      elements: 'GET /api/v1/elements',
      select: 'PUT /api/v1/element/select/:id',
      selected: 'GET /api/v1/element/selected',
      status: 'GET /api/v1/status',
      reset: 'DELETE /api/v1/reset'
    }
  });
});

// Middleware de gestion d'erreur global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Erreur serveur:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Erreur serveur interne',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Gestion des routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée'
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur VMix démarré sur le port ${PORT}`);
  console.log(`📊 API disponible à: http://localhost:${PORT}/api/v1`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📝 Documentation: http://localhost:${PORT}/`);
});

export default app;