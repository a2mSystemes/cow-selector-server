# 🛡️ Guide de sécurité VMix Server

## 🚨 Mise à jour sécuritaire immédiate

Des vulnérabilités ont été détectées dans les dépendances. Ce guide vous aide à les corriger rapidement.

## 📋 Versions mises à jour

| Dépendance | Ancienne | Nouvelle | Raison |
|------------|----------|----------|---------|
| **xlsx** | 0.18.5 | **0.20.2** | 🔴 Vulnérabilités critiques |
| **multer** | 1.4.5-lts.1 | **2.0.2** | 🔴 Vulnérabilités + performances |
| **helmet** | 7.1.0 | **8.0.0** | 🛡️ Sécurité renforcée |
| **express** | 4.18.2 | **4.19.2** | 🔒 Correctifs sécurité |
| **http-proxy-middleware** | 2.0.6 | **3.0.0** | ⚡ Mise à jour majeure |
| **typescript** | 5.3.0 | **5.7.2** | 🚀 Version stable récente |

## 🚀 Application automatique (recommandée)

### Windows (PowerShell)
```powershell
# Exécuter en tant qu'administrateur
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\security-update.ps1
```

### Linux/Mac (Bash)
```bash
# Rendre le script exécutable
chmod +x security-update.sh

# Exécuter
./security-update.sh
```

## 🔧 Application manuelle

### Étape 1 : Sauvegarde
```bash
# Créer une sauvegarde
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup
```

### Étape 2 : Installation propre
```bash
# Supprimer les anciens modules
rm -rf node_modules package-lock.json

# Installer les nouvelles versions
npm install

# Corriger automatiquement les vulnérabilités
npm audit fix
```

### Étape 3 : Vérification
```bash
# Compiler pour vérifier les types
npm run build:server

# Tester le serveur
npm run dev

# Audit final
npm run security:check
```

## 📊 Nouveaux scripts de sécurité

### Scripts disponibles
```bash
# Audit complet (serveur + client Angular)
npm run security:audit

# Correction automatique des vulnérabilités
npm run security:fix

# Vérification vulnérabilités critiques uniquement
npm run security:check

# Mise à jour complète des dépendances
npm run security:update
```

### Utilisation recommandée
```bash
# Avant chaque développement
npm run security:check

# Chaque semaine
npm run security:audit

# Chaque mois
npm run security:update
```

## ⚠️ Changements potentiels

### 1. multer 2.x
Nouvelle architecture avec améliorations importantes :
- ✅ **Validation renforcée** : Vérification MIME + extension + magic numbers
- ✅ **Gestion d'erreur améliorée** : Messages d'erreur détaillés avec codes
- ✅ **Sécurité améliorée** : Protection contre les attaques de traversée
- ✅ **Performance** : Traitement plus rapide et efficace des fichiers
- ✅ **Nouveaux middleware** : `uploadExcelFile` et `validateUploadedFile`

### 2. http-proxy-middleware 3.x
L'API reste compatible, mais surveiller les logs au démarrage.

### 3. xlsx 0.20.x
Nouvelles fonctionnalités disponibles, API existante compatible.

### 4. helmet 8.x
Configuration CSP automatiquement mise à jour.

## 🧪 Tests post-mise à jour

### Fonctionnalités à vérifier
- ✅ **Upload Excel** : Tester avec un fichier .xlsx
- ✅ **API REST** : Vérifier /api/v1/elements
- ✅ **Hot reload** : Modifier un fichier Angular
- ✅ **Build production** : npm run build
- ✅ **Health check** : http://localhost:3000/health

### Commandes de test
```bash
# Test complet
npm run build
npm run start

# Test développement
npm run dev

# Test sécurité
npm run security:check
```

## 🔄 Maintenance continue

### Workflow recommandé
1. **Quotidien** : Développer normalement
2. **Hebdomadaire** : `npm run security:check`
3. **Mensuel** : `npm run security:update`
4. **Avant déploiement** : `npm run security:audit`

### Surveillance automatique
Le script `postinstall` vérifie automatiquement les vulnérabilités :

```json
"postinstall": "npm audit --audit-level=high || true"
```

## 🚨 En cas de problème

### Restauration rapide
```bash
# Restaurer depuis la sauvegarde
cp package.json.backup package.json
cp package-lock.json.backup package-lock.json
npm install
```

### Debugging
```bash
# Logs détaillés
npm run dev:verbose

# Vérifier les versions installées
npm list --depth=0

# Vérifier les vulnérabilités
npm audit --audit-level=info
```

## 📞 Support

### Logs importants à surveiller
- Erreurs de compilation TypeScript
- Erreurs au démarrage du proxy Angular
- Échecs de health check
- Vulnérabilités détectées par npm audit

### Commandes de diagnostic
```bash
# État général
npm run security:audit

# Test de l'API
curl http://localhost:3000/health

# Test Angular
curl http://localhost:3000/

# Logs serveur
npm run dev:verbose
```

## ✅ Confirmation de sécurité

Après application des mises à jour :

```bash
npm run security:check
```

Résultat attendu :
```
✅ found 0 vulnerabilities
```

**Votre application VMix est maintenant sécurisée ! 🛡️**

---

## 📝 Notes de version

### v1.0.1 - Mise à jour sécuritaire
- 🔒 Correction vulnérabilités xlsx
- 🔄 **Mise à jour multer vers 2.x** (Breaking changes gérés)
- 🛡️ Mise à jour helmet vers v8
- ⚡ Amélioration performance http-proxy-middleware
- 🚀 TypeScript 5.7.2 pour un meilleur support
- 📊 Scripts de sécurité automatisés
- 🔍 Validation renforcée des fichiers Excel
