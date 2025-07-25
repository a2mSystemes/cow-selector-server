#!/bin/bash
# Script de mise à jour sécuritaire automatique pour VMix Server
# Usage: ./security-update.sh

set -e  # Arrêter en cas d'erreur

echo "🛡️ Début de la mise à jour sécuritaire VMix Server..."
echo "=================================================="

# Variables
PROJECT_ROOT=$(pwd)
BACKUP_DIR="${PROJECT_ROOT}/backup-$(date +%Y%m%d_%H%M%S)"

# Étape 1 : Sauvegarde
echo "📁 Création de sauvegarde..."
mkdir -p "$BACKUP_DIR"
cp package.json "$BACKUP_DIR/"
cp package-lock.json "$BACKUP_DIR/" 2>/dev/null || true
cp -r node_modules "$BACKUP_DIR/" 2>/dev/null || true
echo "✅ Sauvegarde créée : $BACKUP_DIR"

# Étape 2 : Audit initial
echo "🔍 Audit de sécurité initial..."
npm audit --audit-level=moderate || echo "⚠️ Vulnérabilités détectées"

# Étape 3 : Nettoyage
echo "🧹 Nettoyage des anciens modules..."
rm -rf node_modules package-lock.json

# Étape 4 : Installation des nouvelles versions
echo "📦 Installation des nouvelles versions sécurisées..."
npm install

# Étape 5 : Correction automatique
echo "🔧 Correction automatique des vulnérabilités..."
npm audit fix || echo "⚠️ Certaines vulnérabilités nécessitent une intervention manuelle"

# Étape 6 : Test de compilation
echo "📝 Test de compilation TypeScript..."
npm run build:server

# Étape 7 : Test rapide du serveur
echo "🚀 Test rapide du serveur..."
timeout 15s npm run dev &
SERVER_PID=$!
sleep 8

# Test health check
echo "💓 Test health check..."
curl -f http://localhost:3000/health >/dev/null 2>&1 && echo "✅ Serveur OK" || echo "⚠️ Serveur non accessible"

# Arrêter le serveur de test
kill $SERVER_PID 2>/dev/null || true
sleep 2

# Étape 8 : Audit final
echo "🔍 Audit de sécurité final..."
AUDIT_RESULT=$(npm audit --audit-level=high 2>&1 || true)
if echo "$AUDIT_RESULT" | grep -q "found 0 vulnerabilities"; then
    echo "✅ Aucune vulnérabilité critique trouvée"
else
    echo "⚠️ Vulnérabilités restantes :"
    echo "$AUDIT_RESULT"
fi

# Étape 9 : Mise à jour du client Angular
echo "🅰️ Mise à jour du client Angular..."
if [ -d "client" ]; then
    cd client
    npm audit fix || echo "⚠️ Correction client Angular partielle"
    cd ..
    echo "✅ Client Angular mis à jour"
else
    echo "⚠️ Dossier client non trouvé"
fi

# Étape 10 : Résumé
echo ""
echo "🎉 Mise à jour sécuritaire terminée !"
echo "====================================="
echo "📁 Sauvegarde : $BACKUP_DIR"
echo "🔍 Pour vérifier : npm run security:check"
echo "🚀 Pour tester : npm run dev"
echo ""
echo "📋 Versions mises à jour :"
echo "   - xlsx: $(npm list xlsx --depth=0 2>/dev/null | grep xlsx || echo 'Non installé')"
echo "   - multer: $(npm list multer --depth=0 2>/dev/null | grep multer || echo 'Non installé')"
echo "   - helmet: $(npm list helmet --depth=0 2>/dev/null | grep helmet || echo 'Non installé')"
echo "   - express: $(npm list express --depth=0 2>/dev/null | grep express || echo 'Non installé')"
echo ""

# Étape 11 : Recommandations
echo "💡 Recommandations :"
echo "   1. Testez l'application complètement"
echo "   2. Vérifiez les fonctionnalités d'upload Excel"
echo "   3. Confirmez que l'API fonctionne"
echo "   4. Exécutez npm run security:audit périodiquement"
echo ""
echo "🛡️ Votre application est maintenant plus sécurisée !"
