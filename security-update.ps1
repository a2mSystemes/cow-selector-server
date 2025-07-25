# Script de mise à jour sécuritaire automatique pour VMix Server (Windows)
# Usage: .\security-update.ps1

Write-Host "🛡️ Début de la mise à jour sécuritaire VMix Server..." -ForegroundColor Green
Write-Host "==================================================="

# Variables
$PROJECT_ROOT = Get-Location
$BACKUP_DIR = "$PROJECT_ROOT\backup-$(Get-Date -Format 'yyyyMMdd_HHmmss')"

try {
    # Étape 1 : Sauvegarde
    Write-Host "📁 Création de sauvegarde..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
    Copy-Item "package.json" "$BACKUP_DIR\" -ErrorAction SilentlyContinue
    Copy-Item "package-lock.json" "$BACKUP_DIR\" -ErrorAction SilentlyContinue
    if (Test-Path "node_modules") {
        Copy-Item "node_modules" "$BACKUP_DIR\" -Recurse -ErrorAction SilentlyContinue
    }
    Write-Host "✅ Sauvegarde créée : $BACKUP_DIR" -ForegroundColor Green

    # Étape 2 : Audit initial
    Write-Host "🔍 Audit de sécurité initial..." -ForegroundColor Yellow
    try {
        npm audit --audit-level=moderate
    } catch {
        Write-Host "⚠️ Vulnérabilités détectées" -ForegroundColor Yellow
    }

    # Étape 3 : Nettoyage
    Write-Host "🧹 Nettoyage des anciens modules..." -ForegroundColor Yellow
    if (Test-Path "node_modules") { Remove-Item "node_modules" -Recurse -Force }
    if (Test-Path "package-lock.json") { Remove-Item "package-lock.json" -Force }

    # Étape 4 : Installation des nouvelles versions
    Write-Host "📦 Installation des nouvelles versions sécurisées..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) { throw "Erreur lors de l'installation npm" }

    # Étape 5 : Correction automatique
    Write-Host "🔧 Correction automatique des vulnérabilités..." -ForegroundColor Yellow
    try {
        npm audit fix
    } catch {
        Write-Host "⚠️ Certaines vulnérabilités nécessitent une intervention manuelle" -ForegroundColor Yellow
    }

    # Étape 6 : Test de compilation
    Write-Host "📝 Test de compilation TypeScript..." -ForegroundColor Yellow
    npm run build:server
    if ($LASTEXITCODE -ne 0) { throw "Erreur de compilation TypeScript" }

    # Étape 7 : Test rapide du serveur
    Write-Host "🚀 Test rapide du serveur..." -ForegroundColor Yellow
    $serverJob = Start-Job -ScriptBlock { npm run dev }
    Start-Sleep 8

    # Test health check
    Write-Host "💓 Test health check..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Serveur OK" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️ Serveur non accessible" -ForegroundColor Yellow
    }

    # Arrêter le serveur de test
    Stop-Job $serverJob -Force 2>$null
    Remove-Job $serverJob -Force 2>$null

    # Étape 8 : Audit final
    Write-Host "🔍 Audit de sécurité final..." -ForegroundColor Yellow
    $auditResult = npm audit --audit-level=high 2>&1
    if ($auditResult -like "*found 0 vulnerabilities*") {
        Write-Host "✅ Aucune vulnérabilité critique trouvée" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Vulnérabilités restantes :" -ForegroundColor Yellow
        Write-Host $auditResult -ForegroundColor Red
    }

    # Étape 9 : Mise à jour du client Angular
    Write-Host "🅰️ Mise à jour du client Angular..." -ForegroundColor Yellow
    if (Test-Path "client") {
        Set-Location "client"
        try {
            npm audit fix
        } catch {
            Write-Host "⚠️ Correction client Angular partielle" -ForegroundColor Yellow
        }
        Set-Location ".."
        Write-Host "✅ Client Angular mis à jour" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Dossier client non trouvé" -ForegroundColor Yellow
    }

    # Étape 10 : Résumé
    Write-Host ""
    Write-Host "🎉 Mise à jour sécuritaire terminée !" -ForegroundColor Green
    Write-Host "====================================="
    Write-Host "📁 Sauvegarde : $BACKUP_DIR"
    Write-Host "🔍 Pour vérifier : npm run security:check"
    Write-Host "🚀 Pour tester : npm run dev"
    Write-Host ""
    Write-Host "📋 Versions mises à jour :"
    
    try {
        $xlsxVersion = npm list xlsx --depth=0 2>$null | Select-String "xlsx"
        Write-Host "   - xlsx: $xlsxVersion"
    } catch {
        Write-Host "   - xlsx: Non installé"
    }
    
    try {
        $multerVersion = npm list multer --depth=0 2>$null | Select-String "multer"
        Write-Host "   - multer: $multerVersion"
    } catch {
        Write-Host "   - multer: Non installé"
    }
    
    try {
        $helmetVersion = npm list helmet --depth=0 2>$null | Select-String "helmet"
        Write-Host "   - helmet: $helmetVersion"
    } catch {
        Write-Host "   - helmet: Non installé"
    }
    
    try {
        $expressVersion = npm list express --depth=0 2>$null | Select-String "express"
        Write-Host "   - express: $expressVersion"
    } catch {
        Write-Host "   - express: Non installé"
    }
    
    Write-Host ""

    # Étape 11 : Recommandations
    Write-Host "💡 Recommandations :"
    Write-Host "   1. Testez l'application complètement"
    Write-Host "   2. Vérifiez les fonctionnalités d'upload Excel"
    Write-Host "   3. Confirmez que l'API fonctionne"
    Write-Host "   4. Exécutez npm run security:audit périodiquement"
    Write-Host ""
    Write-Host "🛡️ Votre application est maintenant plus sécurisée !" -ForegroundColor Green

} catch {
    Write-Host "❌ Erreur pendant la mise à jour : $_" -ForegroundColor Red
    Write-Host "💡 Pour restaurer la sauvegarde :" -ForegroundColor Yellow
    Write-Host "   Copy-Item '$BACKUP_DIR\package.json' '.\'"
    Write-Host "   Copy-Item '$BACKUP_DIR\package-lock.json' '.\'  -ErrorAction SilentlyContinue"
    Write-Host "   Copy-Item '$BACKUP_DIR\node_modules' '.\'  -Recurse -ErrorAction SilentlyContinue"
    Write-Host "   npm install"
    exit 1
}
