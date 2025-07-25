import { Router, Request, Response } from 'express';
import { ExcelService } from '../services/ExcelService';
import { DatabaseService } from '../services/DatabaseService';
import { uploadExcelFile, validateUploadedFile } from '../middleware/upload';
import { ApiResponse, UploadResponse } from '../types';

const router = Router();
const db = DatabaseService.getInstance();

/**
 * GET /api/v1/elements
 * Récupère tous les éléments importés
 */
router.get('/elements', (req: Request, res: Response<ApiResponse>) => {
  try {
    const elements = db.getAllElements();
    const info = db.getDatabaseInfo();
    
    res.json({
      success: true,
      data: {
        elements,
        info
      }
    });
  } catch (error) {
    console.error('Erreur récupération éléments:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des éléments'
    });
  }
});

/**
 * POST /api/v1/upload
 * Upload et import d'un fichier Excel avec ExcelJS (sécurisé)
 */
router.post('/upload', 
  ...uploadExcelFile,  // Middleware multer 2.x avec gestion d'erreur intégrée
  validateUploadedFile, // Validation supplémentaire du fichier
  async (req: Request, res: Response<ApiResponse<UploadResponse>>) => {
    try {
      // req.file est garanti d'exister grâce à validateUploadedFile
      const file = req.file!;
      
      console.log(`📄 Processing Excel file: ${file.originalname} (${file.size} bytes)`);
      
      // Validation de sécurité ExcelJS
      const securityCheck = ExcelService.validateExcelSecurity(file.buffer);
      if (!securityCheck.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Fichier Excel non sécurisé',
          message: securityCheck.reason || 'Format invalide',
          code: 'INVALID_EXCEL_SECURITY'
        });
      }
      
      // Parse Excel avec ExcelJS (méthode asynchrone)
      const elements = await ExcelService.parseExcelFile(file.buffer, file.originalname);
      
      if (!ExcelService.validateExcelData(elements)) {
        return res.status(400).json({
          success: false,
          error: 'Données Excel invalides',
          message: 'Le fichier Excel ne contient pas de données valides ou est vide',
          code: 'INVALID_EXCEL_DATA'
        });
      }

      // Import en base
      db.importData(elements, file.originalname);
      
      // Extraction des colonnes
      const columns = elements.length > 0 
        ? Object.keys(elements[0]).filter(key => key !== 'id')
        : [];

      // Métadonnées ExcelJS (optionnel)
      const metadata = await ExcelService.getExcelMetadata(file.buffer);

      console.log(`✅ Successfully imported ${elements.length} rows from ${file.originalname}`);

      res.json({
        success: true,
        data: {
          filename: file.originalname,
          rowCount: elements.length,
          columns,
          fileSize: file.size,
          mimeType: file.mimetype,
          metadata: metadata 
        },
        message: `${elements.length} lignes importées avec succès via ExcelJS`
      });

    } catch (error) {
      console.error('❌ Erreur upload Excel avec ExcelJS:', error);
      
      // Gestion d'erreur détaillée pour ExcelJS
      if (error instanceof Error) {
        if (error.message.includes('corrupted') || error.message.includes('corrompu')) {
          return res.status(400).json({
            success: false,
            error: 'Fichier Excel corrompu',
            message: 'Le fichier Excel semble être endommagé. Veuillez essayer avec un autre fichier',
            code: 'CORRUPTED_EXCEL_FILE'
          });
        }
        
        if (error.message.includes('password') || error.message.includes('encrypted')) {
          return res.status(400).json({
            success: false,
            error: 'Fichier Excel protégé',
            message: 'Ce fichier est protégé par mot de passe. Veuillez utiliser un fichier non protégé',
            code: 'ENCRYPTED_EXCEL_FILE'
          });
        }
        
        if (error.message.includes('no data') || error.message.includes('Aucune donnée')) {
          return res.status(400).json({
            success: false,
            error: 'Fichier Excel vide',
            message: 'Le fichier Excel ne contient aucune donnée valide',
            code: 'EMPTY_EXCEL_FILE'
          });
        }
      }
      
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'import du fichier Excel',
        message: error instanceof Error ? error.message : 'Erreur inconnue avec ExcelJS',
        code: 'EXCELJS_IMPORT_ERROR'
      });
    }
  }
);

/**
 * PUT /api/v1/element/select/:id
 * Sélectionne un élément par ID
 */
router.put('/element/select/:id', (req: Request, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID manquant',
        code: 'MISSING_ID'
      });
    }

    const selectedElement = db.selectElement(id);
    
    if (!selectedElement) {
      return res.status(404).json({
        success: false,
        error: 'Élément non trouvé',
        message: `Aucun élément trouvé avec l'ID: ${id}`,
        code: 'ELEMENT_NOT_FOUND'
      });
    }

    console.log(`🎯 Element selected: ${id}`);

    res.json({
      success: true,
      data: selectedElement,
      message: 'Élément sélectionné avec succès'
    });

  } catch (error) {
    console.error('Erreur sélection élément:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la sélection',
      code: 'SELECTION_ERROR'
    });
  }
});

/**
 * GET /api/v1/element/selected
 * Récupère l'élément actuellement sélectionné (pour VMix)
 */
router.get('/element/selected', (req: Request, res: Response<ApiResponse>) => {
  try {
    const selectedElement = db.getSelectedElement();
    
    if (!selectedElement) {
      return res.status(404).json({
        success: false,
        error: 'Aucun élément sélectionné',
        message: 'Veuillez d\'abord sélectionner un élément depuis la liste',
        code: 'NO_ELEMENT_SELECTED'
      });
    }

    res.json({
      success: true,
      data: selectedElement
    });

  } catch (error) {
    console.error('Erreur récupération élément sélectionné:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'élément sélectionné',
      code: 'RETRIEVAL_ERROR'
    });
  }
});

/**
 * GET /api/v1/status
 * Status de l'application et de la base
 */
router.get('/status', (req: Request, res: Response<ApiResponse>) => {
  try {
    const info = db.getDatabaseInfo();
    
    res.json({
      success: true,
      data: {
        server: 'VMix Server',
        version: '1.0.1', // Bumped version pour multer 2.x
        timestamp: new Date().toISOString(),
        multerVersion: '2.x',
        database: info,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }
    });
  } catch (error) {
    console.error('Erreur status:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * DELETE /api/v1/reset
 * Reset la base de données
 */
router.delete('/reset', (req: Request, res: Response<ApiResponse>) => {
  try {
    console.log('🗑️ Resetting database...');
    db.reset();
    
    res.json({
      success: true,
      message: 'Base de données réinitialisée avec succès'
    });
  } catch (error) {
    console.error('Erreur reset:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la réinitialisation',
      code: 'RESET_ERROR'
    });
  }
});

export default router;