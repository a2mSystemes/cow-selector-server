# VMix Datasource Server

## Description
Serveur Node.js/TypeScript pour l'application VMix Datasource. Ce serveur permet de gérer l'upload et la lecture de fichiers Excel pour l'intégration avec VMix.

## Technologies utilisées
- **Node.js** avec **TypeScript**
- **Express.js** pour l'API REST
- **Multer** pour l'upload de fichiers
- **XLSX** pour la lecture des fichiers Excel

## Installation

1. **Cloner le repository**
   ```bash
   git clone <url-du-repo>
   cd vmix-server
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

## Scripts disponibles

- `npm run dev` - Démarrer le serveur en mode développement avec watch
- `npm run build` - Compiler le TypeScript
- `npm start` - Démarrer le serveur en production

## API Endpoints

### Health Check
- `GET /health` - Vérifier l'état du serveur

### Upload & Data
- `POST /api/v1/upload` - Upload d'un fichier Excel
- `GET /api/v1/elements` - Récupérer tous les éléments
- `GET /api/v1/element/selected` - Récupérer l'élément sélectionné
- `PUT /api/v1/element/select/:id` - Sélectionner un élément
- `GET /api/v1/status` - Status détaillé du serveur
- `DELETE /api/v1/reset` - Reset de la base de données

## Structure du projet

```
src/
├── middleware/          # Middlewares Express
│   └── upload.ts       # Configuration Multer
├── routes/             # Routes API
│   └── api.ts         # Routes principales
├── services/          # Services métier
│   ├── DatabaseService.ts   # Gestion base de données
│   └── ExcelService.ts     # Traitement Excel
├── types/             # Types TypeScript
│   └── index.ts       # Définitions des interfaces
└── server.ts          # Point d'entrée du serveur
```

## Configuration

Le serveur écoute par défaut sur le port **3000**.

### Variables d'environnement (optionnel)
Créer un fichier `.env` :
```env
PORT=3000
NODE_ENV=development
```

## 🔗 Intégration avec le client Angular

Ce serveur est conçu pour fonctionner avec l'application client Angular VMix Datasource.

## Développement

Pour contribuer au projet :
1. Fork le repository
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -am 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Créer une Pull Request

## License


